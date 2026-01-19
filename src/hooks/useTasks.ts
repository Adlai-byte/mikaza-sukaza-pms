import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Task, TaskInsert, TaskChecklist, TaskChecklistInsert } from '@/lib/schemas';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { dashboardKeys } from '@/hooks/useDashboardData';

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: TaskFilters) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  checklists: (taskId: string) => [...taskKeys.all, 'checklists', taskId] as const,
};

export interface TaskFilters {
  status?: string[];
  priority?: string[];
  category?: string[];
  assigned_to?: string;
  property_id?: string;
  created_by?: string;
  search?: string;
  due_date_from?: string;
  due_date_to?: string;
  overdue?: boolean;
}

// Fetch tasks with filters
const fetchTasks = async (filters?: TaskFilters): Promise<Task[]> => {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      property:properties(property_id, property_name, property_type),
      assigned_user:users!tasks_assigned_to_fkey(user_id, first_name, last_name, email, photo_url),
      created_user:users!tasks_created_by_fkey(user_id, first_name, last_name, email, photo_url)
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

  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }

  if (filters?.property_id) {
    query = query.eq('property_id', filters.property_id);
  }

  if (filters?.created_by) {
    query = query.eq('created_by', filters.created_by);
  }

  if (filters?.due_date_from) {
    query = query.gte('due_date', filters.due_date_from);
  }

  if (filters?.due_date_to) {
    query = query.lte('due_date', filters.due_date_to);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  let tasks = data || [];

  // Filter overdue tasks client-side
  if (filters?.overdue) {
    const today = new Date().toISOString().split('T')[0];
    tasks = tasks.filter(task =>
      task.due_date &&
      task.due_date < today &&
      task.status !== 'completed' &&
      task.status !== 'cancelled'
    );
  }

  return tasks;
};

// Fetch single task with full details
const fetchTask = async (taskId: string): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      property:properties(property_id, property_name, property_type),
      assigned_user:users!tasks_assigned_to_fkey(user_id, first_name, last_name, email, photo_url),
      created_user:users!tasks_created_by_fkey(user_id, first_name, last_name, email, photo_url),
      checklists:task_checklists(*)
    `)
    .eq('task_id', taskId)
    .single();

  if (error) throw error;
  return data;
};

// Fetch checklists for a task
const fetchTaskChecklists = async (taskId: string): Promise<TaskChecklist[]> => {
  const { data, error } = await supabase
    .from('task_checklists')
    .select('*')
    .eq('task_id', taskId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Create task
const createTask = async (taskData: TaskInsert, userId: string): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      ...taskData,
      created_by: userId
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update task
const updateTask = async ({ taskId, updates }: { taskId: string; updates: Partial<TaskInsert> }): Promise<Task> => {
  // If status is being changed to 'completed', set completed_at
  const taskUpdates = { ...updates };
  if (updates.status === 'completed' && !taskUpdates.completed_at) {
    taskUpdates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(taskUpdates)
    .eq('task_id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete task
const deleteTask = async (taskId: string): Promise<{ taskId: string; task: any }> => {
  // Fetch task details before deleting for logging
  const { data: task } = await supabase
    .from('tasks')
    .select('task_id, title, status, priority, category, assigned_to, property_id')
    .eq('task_id', taskId)
    .single();

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('task_id', taskId);

  if (error) throw error;
  return { taskId, task };
};

// Bulk update tasks
const bulkUpdateTasks = async (taskIds: string[], updates: Partial<TaskInsert>): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .in('task_id', taskIds);

  if (error) throw error;
};

// Checklist operations
const createChecklistItem = async (item: TaskChecklistInsert): Promise<TaskChecklist> => {
  const { data, error } = await supabase
    .from('task_checklists')
    .insert([item])
    .select()
    .single();

  if (error) throw error;
  return data;
};

const updateChecklistItem = async ({ itemId, updates }: { itemId: string; updates: Partial<TaskChecklistInsert> }): Promise<TaskChecklist> => {
  const { data, error } = await supabase
    .from('task_checklists')
    .update(updates)
    .eq('checklist_item_id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const toggleChecklistItem = async (itemId: string, isCompleted: boolean): Promise<TaskChecklist> => {
  const { data, error } = await supabase
    .from('task_checklists')
    .update({ is_completed: isCompleted })
    .eq('checklist_item_id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const deleteChecklistItem = async (itemId: string): Promise<{ itemId: string; item: any }> => {
  // Fetch checklist item details before deleting for logging
  const { data: item } = await supabase
    .from('task_checklists')
    .select('checklist_item_id, task_id, item_text, is_completed')
    .eq('checklist_item_id', itemId)
    .single();

  const { error } = await supabase
    .from('task_checklists')
    .delete()
    .eq('checklist_item_id', itemId);

  if (error) throw error;
  return { itemId, item };
};

// Hook options interface
interface UseTasksOptions {
  enabled?: boolean;
}

// Hooks
export function useTasks(filters?: TaskFilters, options?: UseTasksOptions) {
  const { data: tasks = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => fetchTasks(filters),
    // Enable caching - realtime subscriptions will invalidate when data changes
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    // Only run query when enabled (default: true for backward compatibility)
    enabled: options?.enabled ?? true,
  });

  // Real-time subscription
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: 'all' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    tasks,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}

export function useTask(taskId: string, options?: Omit<UseQueryOptions<Task>, 'queryKey' | 'queryFn'>) {
  const { data: task, isLoading, error, isFetching } = useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => fetchTask(taskId),
    enabled: !!taskId,
    // Enable caching - realtime subscriptions will invalidate when data changes
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    ...options,
  });

  return {
    task,
    loading: isLoading,
    isFetching,
    error,
  };
}

export function useTaskChecklists(taskId: string) {
  const { data: checklists = [], isLoading, error, isFetching } = useQuery({
    queryKey: taskKeys.checklists(taskId),
    queryFn: () => fetchTaskChecklists(taskId),
    enabled: !!taskId,
    // Enable caching - realtime subscriptions will invalidate when data changes
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  return {
    checklists,
    loading: isLoading,
    isFetching,
    error,
  };
}

export function useCreateTask() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (taskData: TaskInsert) => createTask(taskData, user?.id || ''),
    onSuccess: async (newTask) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: 'all' });
      // Invalidate dashboard stats when task is created
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      // Cross-entity: invalidate property detail since tasks relate to properties
      if (newTask.property_id) {
        queryClient.invalidateQueries({ queryKey: ['properties', 'detail', newTask.property_id], refetchType: 'all' });
      }
      // Cross-entity: invalidate jobs if this task is linked to a job
      if ((newTask as any).job_id) {
        queryClient.invalidateQueries({ queryKey: ['jobs', 'detail', (newTask as any).job_id], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['jobs', 'list'], refetchType: 'all' });
      }
      queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });

      // Create notification for assigned user
      if (newTask.assigned_to && newTask.created_by && newTask.assigned_to !== newTask.created_by) {
        try {
          // Get creator info
          const { data: creator } = await supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('user_id', newTask.created_by)
            .single();

          // Create notification
          const { error: notifError } = await supabase.from('notifications').insert([{
            user_id: newTask.assigned_to,
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `${creator?.first_name || 'Someone'} ${creator?.last_name || ''} assigned you a task: ${newTask.title}`,
            link: '/todos',
            task_id: newTask.task_id,
            action_by: newTask.created_by,
            metadata: { priority: newTask.priority, due_date: newTask.due_date },
          }]);

          if (notifError) {
            console.error('❌ Failed to create notification:', notifError);
          } else {
            console.log('✅ Notification created for task assignment');
          }
        } catch (error) {
          console.error('❌ Failed to create notification:', error);
        }
      }

      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTask() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<TaskInsert> }) => {
      // Get old task data for comparison
      const { data: oldTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('task_id', taskId)
        .single();

      // Update the task
      const updatedTask = await updateTask({ taskId, updates });

      // If task is completed and linked to a job, update job status
      if (oldTask && updatedTask && updates.status === 'completed' && oldTask.status !== 'completed' && updatedTask.job_id) {
        try {
          console.log('🔗 [Tasks] Task completed, updating linked job:', updatedTask.job_id);

          // Update job status to 'review' when task is completed
          const { error: jobUpdateError } = await supabase
            .from('jobs')
            .update({ status: 'review' })
            .eq('job_id', updatedTask.job_id);

          if (jobUpdateError) {
            console.error('❌ [Tasks] Failed to update job status:', jobUpdateError);
          } else {
            console.log('✅ [Tasks] Job status updated to review');
            // Invalidate jobs cache
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
          }
        } catch (error) {
          console.error('❌ [Tasks] Error updating job status:', error);
        }
      }

      // Create notifications based on changes
      if (oldTask && updatedTask) {
        try {
          // Notification for assignment change
          if (updates.assigned_to && oldTask.assigned_to !== updates.assigned_to && updates.assigned_to !== oldTask.created_by) {
            const { data: creator } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('user_id', oldTask.created_by)
              .single();

            const { error: notifError } = await supabase.from('notifications').insert([{
              user_id: updates.assigned_to,
              type: 'task_assigned',
              title: 'Task Assigned to You',
              message: `${creator?.first_name || 'Someone'} ${creator?.last_name || ''} assigned you a task: ${updatedTask.title}`,
              link: '/todos',
              task_id: taskId,
              action_by: oldTask.created_by,
              metadata: { priority: updatedTask.priority },
            }]);
            if (notifError) {
              console.error('❌ Failed to create notification:', notifError);
            } else {
              console.log('✅ Notification created for task re-assignment');
            }
          }

          // Notification for status change (notify creator)
          if (updates.status && oldTask.status !== updates.status && oldTask.created_by) {
            const { error: notifError } = await supabase.from('notifications').insert([{
              user_id: oldTask.created_by,
              type: 'task_status_changed',
              title: 'Task Status Updated',
              message: `Task "${updatedTask.title}" status changed from ${oldTask.status} to ${updates.status}`,
              link: '/todos',
              task_id: taskId,
              metadata: { old_status: oldTask.status, new_status: updates.status },
            }]);
            if (notifError) {
              console.error('❌ Failed to create notification:', notifError);
            } else {
              console.log('✅ Notification created for status change');
            }

            // If completed, notify assignee too
            if (updates.status === 'completed' && oldTask.assigned_to && oldTask.assigned_to !== oldTask.created_by) {
              const { error: notifError2 } = await supabase.from('notifications').insert([{
                user_id: oldTask.assigned_to,
                type: 'task_completed',
                title: 'Task Completed',
                message: `Task "${updatedTask.title}" has been marked as complete`,
                link: '/todos',
                task_id: taskId,
                action_by: oldTask.created_by,
              }]);
              if (notifError2) {
                console.error('❌ Failed to create notification:', notifError2);
              } else {
                console.log('✅ Notification created for task completion');
              }
            }
          }
        } catch (error) {
          console.error('❌ Failed to create notification:', error);
        }
      }

      return updatedTask;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId), refetchType: 'all' });
      // Invalidate dashboard stats when task status changes
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      // Cross-entity: jobs list already invalidated in mutationFn when job_id exists
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'], refetchType: 'all' });
      // Cross-entity: invalidate property detail since tasks relate to properties
      if (data.property_id) {
        queryClient.invalidateQueries({ queryKey: ['properties', 'detail', data.property_id], refetchType: 'all' });
      }
      queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTask() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: ({ taskId, task }) => {
      // Log the delete action
      logActivity('task_deleted', {
        task_id: taskId,
        title: task?.title || 'Unknown Task',
        status: task?.status,
        priority: task?.priority,
        category: task?.category,
        assigned_to: task?.assigned_to,
        property_id: task?.property_id,
      });

      queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: 'all' });
      // Invalidate dashboard stats when task is deleted
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      // Cross-entity: invalidate property detail since tasks relate to properties
      if (task?.property_id) {
        queryClient.invalidateQueries({ queryKey: ['properties', 'detail', task.property_id], refetchType: 'all' });
      }
      // Cross-entity: invalidate jobs
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'], refetchType: 'all' });
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task',
        variant: 'destructive',
      });
    },
  });
}

export function useBulkUpdateTasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskIds, updates }: { taskIds: string[]; updates: Partial<TaskInsert> }) =>
      bulkUpdateTasks(taskIds, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: 'all' });
      // Cross-entity: invalidate jobs when tasks are bulk updated
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'], refetchType: 'all' });
      toast({
        title: 'Success',
        description: 'Tasks updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tasks',
        variant: 'destructive',
      });
    },
  });
}

// Checklist hooks
export function useCreateChecklistItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createChecklistItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.checklists(data.task_id), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.task_id), refetchType: 'all' });
      toast({
        title: 'Success',
        description: 'Checklist item added',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add checklist item',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateChecklistItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.checklists(data.task_id), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.task_id), refetchType: 'all' });
    },
  });
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) =>
      toggleChecklistItem(itemId, isCompleted),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.checklists(data.task_id), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.task_id), refetchType: 'all' });
    },
  });
}

export function useDeleteChecklistItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: deleteChecklistItem,
    onSuccess: ({ itemId, item }) => {
      // Log the delete action
      logActivity('task_checklist_item_deleted', {
        checklist_item_id: itemId,
        item_text: item?.item_text || 'Unknown Item',
        is_completed: item?.is_completed,
        task_id: item?.task_id,
      });

      // Invalidate all checklist queries
      queryClient.invalidateQueries({ queryKey: taskKeys.all, refetchType: 'all' });
      toast({
        title: 'Success',
        description: 'Checklist item removed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove checklist item',
        variant: 'destructive',
      });
    },
  });
}
