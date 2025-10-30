/**
 * React Query Hooks for Jobs & Tasks Management System
 * Handles CRUD operations for jobs, tasks, comments, and attachments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type Job = Tables<'jobs'>;
export type JobInsert = TablesInsert<'jobs'>;
export type JobUpdate = TablesUpdate<'jobs'>;

export type JobTask = Tables<'job_tasks'>;
export type JobTaskInsert = TablesInsert<'job_tasks'>;
export type JobTaskUpdate = TablesUpdate<'job_tasks'>;

export type JobComment = Tables<'job_comments'>;
export type JobCommentInsert = TablesInsert<'job_comments'>;

export type JobAttachment = Tables<'job_attachments'>;
export type JobAttachmentInsert = TablesInsert<'job_attachments'>;

export interface JobWithRelations extends Job {
  property?: Tables<'properties'>;
  assigned_user?: Tables<'users'>;
  created_user?: Tables<'users'>;
  tasks?: JobTask[];
  comments?: (JobComment & { user?: Tables<'users'> })[];
  attachments?: JobAttachment[];
}

export interface JobFilters {
  status?: string;
  priority?: string;
  job_type?: string;
  assigned_to?: string;
  property_id?: string;
  search?: string;
  due_date_from?: string;
  due_date_to?: string;
}

// ============================================
// QUERY KEYS
// ============================================

export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (filters: JobFilters) => [...jobKeys.lists(), filters] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
  tasks: (jobId: string) => [...jobKeys.all, 'tasks', jobId] as const,
  comments: (jobId: string) => [...jobKeys.all, 'comments', jobId] as const,
  attachments: (jobId: string) => [...jobKeys.all, 'attachments', jobId] as const,
};

// ============================================
// FETCH JOBS (List with Filters)
// ============================================

export function useJobs(filters: JobFilters = {}) {
  return useQuery({
    queryKey: jobKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          property:properties(property_id, property_name),
          assigned_user:users!jobs_assigned_to_fkey(user_id, first_name, last_name, email),
          created_user:users!jobs_created_by_fkey(user_id, first_name, last_name),
          tasks:job_tasks(count)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.job_type) {
        query = query.eq('job_type', filters.job_type);
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters.property_id) {
        query = query.eq('property_id', filters.property_id);
      }
      if (filters.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
      }
      if (filters.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching jobs:', error);
        throw error;
      }

      return data as JobWithRelations[];
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// FETCH SINGLE JOB (with all relations)
// ============================================

export function useJob(jobId: string | undefined) {
  return useQuery({
    queryKey: jobKeys.detail(jobId || ''),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          property:properties(property_id, property_name, property_type),
          assigned_user:users!jobs_assigned_to_fkey(user_id, first_name, last_name, email, photo_url),
          created_user:users!jobs_created_by_fkey(user_id, first_name, last_name),
          tasks:job_tasks(*),
          comments:job_comments(
            *,
            user:users(user_id, first_name, last_name, photo_url)
          ),
          attachments:job_attachments(*)
        `)
        .eq('job_id', jobId)
        .single();

      if (error) {
        console.error('Error fetching job:', error);
        throw error;
      }

      return data as JobWithRelations;
    },
    enabled: !!jobId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================
// CREATE JOB
// ============================================

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (newJob: JobInsert) => {
      // Create the job
      const { data, error } = await supabase
        .from('jobs')
        .insert(newJob)
        .select()
        .single();

      if (error) throw error;

      // Automatically create a corresponding task for the job
      console.log('🔍 [Jobs] Job created, checking if should create task:', {
        hasData: !!data,
        hasAssignedTo: !!data?.assigned_to,
        hasUser: !!user,
        assignedTo: data?.assigned_to,
        userId: user?.id,
      });

      if (data && data.assigned_to && user) {
        console.log('📋 [Jobs] Creating task for job:', {
          jobId: data.job_id,
          title: data.title,
          assignedTo: data.assigned_to,
          createdBy: user.id,
        });

        // Map job type to task category
        const taskCategory = (() => {
          switch (newJob.job_type) {
            case 'cleaning':
              return 'cleaning';
            case 'maintenance':
            case 'repair':
              return 'maintenance';
            case 'inspection':
              return 'inspection';
            default:
              return 'other';
          }
        })();

        // Map job priority to task priority (jobs use 'normal', tasks use 'medium')
        const taskPriority = (() => {
          switch (data.priority) {
            case 'urgent': return 'urgent';
            case 'high': return 'high';
            case 'normal': return 'medium'; // Map 'normal' to 'medium'
            case 'low': return 'low';
            default: return 'medium';
          }
        })();

        const taskInsert: any = {
          title: data.title,
          description: data.description || `Task for job: ${data.title}`,
          assigned_to: data.assigned_to,
          created_by: user.id, // Add the creator (admin who created the job)
          property_id: data.property_id,
          due_date: data.due_date,
          priority: taskPriority,
          category: taskCategory,
          status: 'pending',
        };

        // Only add job_id if the column exists (will be added via migration)
        // For now, we'll skip it to avoid schema errors
        // taskInsert.job_id = data.job_id;

        console.log('📋 [Jobs] Task insert data:', taskInsert);

        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .insert(taskInsert)
          .select()
          .single();

        if (taskError) {
          console.error('❌ [Jobs] Failed to create task for job:', taskError);
          // Don't throw error - job was created successfully, task is optional
        } else {
          console.log('✅ [Jobs] Task created successfully:', taskData);

          // Create notification for the assigned user
          const notificationData: any = {
            user_id: data.assigned_to,
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `You have been assigned a new task: "${data.title}"`,
            link: '/todos',
            task_id: taskData.task_id,
            action_by: user.id,
            metadata: {
              property_id: data.property_id,
              priority: data.priority,
              due_date: data.due_date,
            },
            is_read: false,
          };

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notificationData);

          if (notificationError) {
            console.error('❌ [Jobs] Failed to create notification:', notificationError);
          } else {
            console.log('✅ [Jobs] Notification created for assigned user');
          }
        }
      } else {
        if (!data.assigned_to) {
          console.log('⚠️ [Jobs] No assigned_to user, skipping task creation');
        } else if (!user) {
          console.log('⚠️ [Jobs] No authenticated user, skipping task creation');
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      // Also invalidate tasks since we created a task
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Success',
        description: 'Job and task created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create job: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// UPDATE JOB
// ============================================

export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ jobId, updates }: { jobId: string; updates: JobUpdate }) => {
      // Fetch the current job to compare status changes
      const { data: currentJob, error: fetchError } = await supabase
        .from('jobs')
        .select('job_id, title, status, created_by, property_id')
        .eq('job_id', jobId)
        .single();

      if (fetchError) throw fetchError;

      // Update the job
      const { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('job_id', jobId)
        .select()
        .single();

      if (error) throw error;

      // Check if status changed and notify the admin who created the job
      if (updates.status && currentJob.status !== updates.status && currentJob.created_by) {
        console.log('🔔 [Jobs] Status changed, creating notification for admin:', currentJob.created_by);

        // Format status for display
        const formatStatus = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        // Create notification for the admin who assigned/created the job
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: currentJob.created_by,
            type: 'job_status_changed',
            title: 'Job Status Updated',
            message: `Job "${currentJob.title}" status changed from ${formatStatus(currentJob.status)} to ${formatStatus(updates.status)}`,
            link: '/jobs',
            job_id: jobId,
            metadata: {
              old_status: currentJob.status,
              new_status: updates.status,
              property_id: currentJob.property_id,
            },
            is_read: false,
          });

        if (notificationError) {
          console.error('❌ [Jobs] Failed to create notification:', notificationError);
        } else {
          console.log('✅ [Jobs] Notification created successfully');
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(data.job_id) });
      toast({
        title: 'Success',
        description: 'Job updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update job: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// DELETE JOB
// ============================================

export function useDeleteJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('job_id', jobId);

      if (error) throw error;
      return jobId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      toast({
        title: 'Success',
        description: 'Job deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete job: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// JOB TASKS
// ============================================

export function useJobTasks(jobId: string | undefined) {
  return useQuery({
    queryKey: jobKeys.tasks(jobId || ''),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');

      const { data, error } = await supabase
        .from('job_tasks')
        .select('*')
        .eq('job_id', jobId)
        .order('task_order', { ascending: true });

      if (error) throw error;
      return data as JobTask[];
    },
    enabled: !!jobId,
    staleTime: 30 * 1000,
  });
}

export function useCreateJobTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (newTask: JobTaskInsert) => {
      const { data, error } = await supabase
        .from('job_tasks')
        .insert(newTask)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.tasks(data.job_id) });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(data.job_id) });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create task: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateJobTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ taskId, jobId, updates }: { taskId: string; jobId: string; updates: JobTaskUpdate }) => {
      const { data, error } = await supabase
        .from('job_tasks')
        .update(updates)
        .eq('task_id', taskId)
        .select()
        .single();

      if (error) throw error;
      return { data, jobId };
    },
    onSuccess: ({ data, jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.tasks(jobId) });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update task: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteJobTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ taskId, jobId }: { taskId: string; jobId: string }) => {
      const { error } = await supabase
        .from('job_tasks')
        .delete()
        .eq('task_id', taskId);

      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.tasks(jobId) });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete task: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// JOB COMMENTS
// ============================================

export function useJobComments(jobId: string | undefined) {
  return useQuery({
    queryKey: jobKeys.comments(jobId || ''),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');

      const { data, error } = await supabase
        .from('job_comments')
        .select(`
          *,
          user:users(user_id, first_name, last_name, photo_url)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
    staleTime: 30 * 1000,
  });
}

export function useCreateJobComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (newComment: JobCommentInsert) => {
      const { data, error } = await supabase
        .from('job_comments')
        .insert(newComment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.comments(data.job_id) });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(data.job_id) });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create comment: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// JOB ATTACHMENTS
// ============================================

export function useJobAttachments(jobId: string | undefined) {
  return useQuery({
    queryKey: jobKeys.attachments(jobId || ''),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');

      const { data, error } = await supabase
        .from('job_attachments')
        .select('*')
        .eq('job_id', jobId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as JobAttachment[];
    },
    enabled: !!jobId,
    staleTime: 30 * 1000,
  });
}

export function useUploadJobAttachment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (newAttachment: JobAttachmentInsert) => {
      const { data, error } = await supabase
        .from('job_attachments')
        .insert(newAttachment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.attachments(data.job_id) });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(data.job_id) });
      toast({
        title: 'Success',
        description: 'Attachment uploaded successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to upload attachment: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteJobAttachment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ attachmentId, jobId }: { attachmentId: string; jobId: string }) => {
      const { error } = await supabase
        .from('job_attachments')
        .delete()
        .eq('attachment_id', attachmentId);

      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.attachments(jobId) });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
      toast({
        title: 'Success',
        description: 'Attachment deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete attachment: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Get job statistics
 */
export function useJobStats(filters: JobFilters = {}) {
  const { data: jobs = [] } = useJobs(filters);

  return {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    in_progress: jobs.filter((j) => j.status === 'in_progress').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    urgent: jobs.filter((j) => j.priority === 'urgent').length,
    high: jobs.filter((j) => j.priority === 'high').length,
    overdue: jobs.filter((j) => j.due_date && new Date(j.due_date) < new Date() && j.status !== 'completed').length,
  };
}
