import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Issue, IssueInsert, IssuePhoto, IssuePhotoInsert } from '@/lib/schemas';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateFile } from '@/lib/file-validation';
import { dashboardKeys } from '@/hooks/useDashboardData';

// Query keys
export const issueKeys = {
  all: ['issues'] as const,
  lists: () => [...issueKeys.all, 'list'] as const,
  list: (filters?: IssueFilters) => [...issueKeys.lists(), { filters }] as const,
  details: () => [...issueKeys.all, 'detail'] as const,
  detail: (id: string) => [...issueKeys.details(), id] as const,
  photos: (issueId: string) => [...issueKeys.all, 'photos', issueId] as const,
};

export interface IssueFilters {
  status?: string[];
  priority?: string[];
  category?: string[];
  property_id?: string;
  assigned_to?: string;
  reported_by?: string;
  current_user_id?: string; // Filter for issues assigned to OR reported by this user
  search?: string;
}

// Fetch issues with filters
const fetchIssues = async (filters?: IssueFilters): Promise<Issue[]> => {
  let query = supabase
    .from('issues')
    .select(`
      *,
      property:properties(property_id, property_name, property_type),
      reported_user:users!issues_reported_by_fkey(user_id, first_name, last_name, email, photo_url),
      assigned_user:users!issues_assigned_to_fkey(user_id, first_name, last_name, email, photo_url),
      photos:issue_photos(*)
    `)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.priority && filters.priority.length > 0) {
    query = query.in('priority', filters.priority);
  }

  if (filters?.category && filters.category.length > 0) {
    query = query.in('category', filters.category);
  }

  if (filters?.property_id) {
    query = query.eq('property_id', filters.property_id);
  }

  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }

  if (filters?.reported_by) {
    query = query.eq('reported_by', filters.reported_by);
  }

  // Filter for issues assigned to OR reported by current user
  if (filters?.current_user_id && !filters?.assigned_to && !filters?.reported_by) {
    query = query.or(`assigned_to.eq.${filters.current_user_id},reported_by.eq.${filters.current_user_id}`);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

// Fetch single issue with full details
const fetchIssue = async (issueId: string): Promise<Issue> => {
  const { data, error } = await supabase
    .from('issues')
    .select(`
      *,
      property:properties(property_id, property_name, property_type, address, city, state),
      reported_user:users!issues_reported_by_fkey(user_id, first_name, last_name, email, photo_url),
      assigned_user:users!issues_assigned_to_fkey(user_id, first_name, last_name, email, photo_url),
      photos:issue_photos(*, uploaded_user:users(user_id, first_name, last_name))
    `)
    .eq('issue_id', issueId)
    .single();

  if (error) throw error;
  return data;
};

// Create issue
const createIssue = async (issueData: IssueInsert, userId: string): Promise<Issue> => {
  const { data, error } = await supabase
    .from('issues')
    .insert([{
      ...issueData,
      reported_by: userId
    }])
    .select(`
      *,
      photos:issue_photos(photo_id, photo_url, caption, created_at),
      property:properties(property_id, property_name),
      assigned_user:users!issues_assigned_to_fkey(user_id, first_name, last_name, email),
      reported_user:users!issues_reported_by_fkey(user_id, first_name, last_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
};

// Update issue
const updateIssue = async ({ issueId, updates }: { issueId: string; updates: Partial<IssueInsert> }): Promise<Issue> => {
  // If status is being changed to 'resolved' or 'closed', set resolved_at
  const issueUpdates = { ...updates };
  if ((updates.status === 'resolved' || updates.status === 'closed') && !issueUpdates.resolved_at) {
    issueUpdates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('issues')
    .update(issueUpdates)
    .eq('issue_id', issueId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete issue
const deleteIssue = async (issueId: string): Promise<void> => {
  // First, delete all associated photos from storage
  const { data: photos } = await supabase
    .from('issue_photos')
    .select('photo_url')
    .eq('issue_id', issueId);

  if (photos && photos.length > 0) {
    for (const photo of photos) {
      const fileName = photo.photo_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('issue-photos')
          .remove([fileName]);
      }
    }
  }

  // Then delete the issue (cascade will delete photo records)
  const { error } = await supabase
    .from('issues')
    .delete()
    .eq('issue_id', issueId);

  if (error) throw error;
};

// Upload photo
const uploadPhoto = async ({
  issueId,
  file,
  photoType = 'before',
  caption,
  userId
}: {
  issueId: string;
  file: File;
  photoType?: 'before' | 'after' | 'progress' | 'other';
  caption?: string;
  userId: string;
}): Promise<IssuePhoto> => {
  // Validate file before upload
  console.log('🔍 Validating issue photo upload...');
  const validationResult = await validateFile(file, 'ISSUE_PHOTO');

  if (!validationResult.isValid) {
    console.error('❌ File validation failed:', validationResult.errors);
    throw new Error(validationResult.errors.join('. '));
  }

  // Log warnings if any
  if (validationResult.warnings.length > 0) {
    console.warn('⚠️ File validation warnings:', validationResult.warnings);
  }

  console.log('✅ File validation passed');

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${issueId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  console.log('📤 Uploading photo to storage:', fileName);

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('issue-photos')
    .upload(fileName, file);

  if (uploadError) {
    console.error('❌ Storage upload error:', uploadError);
    throw uploadError;
  }

  console.log('✅ Photo uploaded to storage');

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('issue-photos')
    .getPublicUrl(fileName);

  console.log('💾 Creating photo record in database...');

  // Create photo record
  const { data, error } = await supabase
    .from('issue_photos')
    .insert([{
      issue_id: issueId,
      photo_url: publicUrl,
      photo_type: photoType,
      caption: caption || null,
      uploaded_by: userId
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Database insert error:', error);
    throw error;
  }

  console.log('✅ Photo record created successfully');
  return data;
};

// Delete photo
const deletePhoto = async (photoId: string, photoUrl: string): Promise<void> => {
  // Delete from storage
  const fileName = photoUrl.split('/').pop();
  if (fileName) {
    await supabase.storage
      .from('issue-photos')
      .remove([fileName]);
  }

  // Delete record
  const { error } = await supabase
    .from('issue_photos')
    .delete()
    .eq('photo_id', photoId);

  if (error) throw error;
};

// Hook options interface
interface UseIssuesOptions {
  enabled?: boolean;
}

// Hooks
export function useIssues(filters?: IssueFilters, options?: UseIssuesOptions) {
  const { data: issues = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: issueKeys.list(filters),
    queryFn: () => fetchIssues(filters),
    staleTime: 30 * 1000, // 30 seconds
    // Only run query when enabled (default: true for backward compatibility)
    enabled: options?.enabled ?? true,
  });

  // Real-time subscription
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('issues-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
          // Also invalidate dashboard stats when issues change (for Open Issues KPI)
          queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issue_photos',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
          // Also invalidate detail queries so photos show immediately after upload
          queryClient.invalidateQueries({ queryKey: issueKeys.details() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    issues,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}

export function useIssue(issueId: string) {
  const { data: issue, isLoading, error } = useQuery({
    queryKey: issueKeys.detail(issueId),
    queryFn: () => fetchIssue(issueId),
    enabled: !!issueId,
    staleTime: 30 * 1000,
  });

  return {
    issue,
    loading: isLoading,
    error,
  };
}

export function useCreateIssue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (issueData: IssueInsert) => createIssue(issueData, user?.id || ''),
    onSuccess: async (newIssue) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
      // Invalidate dashboard stats when new issue is created
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });

      // Create notification for assigned user
      if (newIssue.assigned_to && newIssue.reported_by && newIssue.assigned_to !== newIssue.reported_by) {
        try {
          // Get reporter info
          const { data: reporter } = await supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('user_id', newIssue.reported_by)
            .single();

          // Create notification
          const { error: notifError } = await supabase.from('notifications').insert([{
            user_id: newIssue.assigned_to,
            type: 'issue_assigned',
            title: 'New Issue Assigned',
            message: `${reporter?.first_name || 'Someone'} ${reporter?.last_name || ''} assigned you an issue: ${newIssue.title}`,
            link: '/issues',
            issue_id: newIssue.issue_id,
            action_by: newIssue.reported_by,
            metadata: { priority: newIssue.priority, category: newIssue.category },
          }]);

          if (notifError) {
            console.error('❌ Failed to create notification:', notifError);
          } else {
            console.log('✅ Notification created for issue assignment');
          }
        } catch (error) {
          console.error('❌ Failed to create notification:', error);
        }
      }

      toast({
        title: 'Success',
        description: 'Issue created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create issue',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateIssue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ issueId, updates }: { issueId: string; updates: Partial<IssueInsert> }) => {
      // Get old issue data for comparison
      const { data: oldIssue } = await supabase
        .from('issues')
        .select('*')
        .eq('issue_id', issueId)
        .single();

      // Update the issue
      const updatedIssue = await updateIssue({ issueId, updates });

      // Create notifications and auto-debit based on changes
      if (oldIssue && updatedIssue) {
        try {
          // Notification for assignment change
          if (updates.assigned_to && oldIssue.assigned_to !== updates.assigned_to && updates.assigned_to !== oldIssue.reported_by) {
            const { data: reporter } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('user_id', oldIssue.reported_by)
              .single();

            const { error: notifError } = await supabase.from('notifications').insert([{
              user_id: updates.assigned_to,
              type: 'issue_assigned',
              title: 'Issue Assigned to You',
              message: `${reporter?.first_name || 'Someone'} ${reporter?.last_name || ''} assigned you an issue: ${updatedIssue.title}`,
              link: '/issues',
              issue_id: issueId,
              action_by: oldIssue.reported_by,
              metadata: { priority: updatedIssue.priority },
            }]);
            if (notifError) {
              console.error('❌ Failed to create notification:', notifError);
            } else {
              console.log('✅ Notification created for issue re-assignment');
            }
          }

          // Notification for status change (notify reporter)
          if (updates.status && oldIssue.status !== updates.status && oldIssue.reported_by) {
            const { error: notifError } = await supabase.from('notifications').insert([{
              user_id: oldIssue.reported_by,
              type: 'issue_status_changed',
              title: 'Issue Status Updated',
              message: `Issue "${updatedIssue.title}" status changed from ${oldIssue.status} to ${updates.status}`,
              link: '/issues',
              issue_id: issueId,
              metadata: { old_status: oldIssue.status, new_status: updates.status },
            }]);
            if (notifError) {
              console.error('❌ Failed to create notification:', notifError);
            } else {
              console.log('✅ Notification created for status change');
            }

            // If resolved, notify assignee too
            if (updates.status === 'resolved' && oldIssue.assigned_to && oldIssue.assigned_to !== oldIssue.reported_by) {
              const { error: notifError2 } = await supabase.from('notifications').insert([{
                user_id: oldIssue.assigned_to,
                type: 'issue_resolved',
                title: 'Issue Resolved',
                message: `Issue "${updatedIssue.title}" has been marked as resolved`,
                link: '/issues',
                issue_id: issueId,
                action_by: oldIssue.reported_by,
              }]);
              if (notifError2) {
                console.error('❌ Failed to create notification:', notifError2);
              } else {
                console.log('✅ Notification created for issue resolution');
              }
            }

            // AUTO-DEBIT CREATION: Create expense entry when issue is resolved or closed
            if ((updates.status === 'resolved' || updates.status === 'closed') &&
                oldIssue.status !== 'resolved' && oldIssue.status !== 'closed') {
              // Use actual_cost if available, otherwise use estimated_cost
              const cost = updates.actual_cost ?? updatedIssue.actual_cost ?? updatedIssue.estimated_cost;

              // Only create debit entry if there's a cost > 0
              if (cost && cost > 0 && updatedIssue.property_id) {
                // Map issue category to expense category
                const categoryMap: Record<string, string> = {
                  'maintenance': 'maintenance',
                  'repair_needed': 'repairs',
                  'damage': 'repairs',
                  'cleaning': 'cleaning',
                  'plumbing': 'repairs',
                  'electrical': 'repairs',
                  'appliance': 'repairs',
                  'hvac': 'repairs',
                  'other': 'other',
                };
                const expenseCategory = categoryMap[updatedIssue.category || 'other'] || 'other';

                const { error: expenseError } = await supabase
                  .from('expenses')
                  .insert([{
                    property_id: updatedIssue.property_id,
                    description: `Issue Resolution: ${updatedIssue.title}${updatedIssue.resolution_notes ? ` - ${updatedIssue.resolution_notes}` : ''}`,
                    amount: cost,
                    expense_date: new Date().toISOString().split('T')[0],
                    entry_type: 'debit',
                    category: expenseCategory,
                    notes: `Auto-generated from issue #${issueId.slice(0, 8)}`,
                    is_scheduled: false,
                    is_paid: false,
                    tax_amount: 0,
                  }]);

                if (expenseError) {
                  console.error('❌ Failed to create auto-debit entry for issue:', expenseError);
                } else {
                  console.log('✅ Auto-debit entry created for resolved issue:', {
                    issue: updatedIssue.title,
                    amount: cost,
                    category: expenseCategory,
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Failed to create notification:', error);
        }
      }

      return updatedIssue;
    },
    onSuccess: (updatedIssue, variables) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
      queryClient.invalidateQueries({ queryKey: issueKeys.detail(variables.issueId) });
      // Invalidate dashboard stats when issue status changes
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      // Invalidate expenses when issue is resolved/closed (for auto-debit entries)
      if (variables.updates.status === 'resolved' || variables.updates.status === 'closed') {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      }
      toast({
        title: 'Success',
        description: 'Issue updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update issue',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteIssue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteIssue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
      // Invalidate dashboard stats when issue is deleted
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      toast({
        title: 'Success',
        description: 'Issue deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete issue',
        variant: 'destructive',
      });
    },
  });
}

export function useUploadPhoto() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params: { issueId: string; file: File; photoType?: 'before' | 'after' | 'progress' | 'other'; caption?: string }) =>
      uploadPhoto({ ...params, userId: user?.id || '' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.detail(data.issue_id) });
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
      toast({
        title: 'Success',
        description: 'Photo uploaded successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload photo',
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePhoto() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ photoId, photoUrl, issueId }: { photoId: string; photoUrl: string; issueId: string }) =>
      deletePhoto(photoId, photoUrl),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.detail(variables.issueId) });
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
      toast({
        title: 'Success',
        description: 'Photo deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete photo',
        variant: 'destructive',
      });
    },
  });
}
