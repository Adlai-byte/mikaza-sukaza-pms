/**
 * Comprehensive tests for useTasks hook
 * Tests task CRUD operations, checklists, and real-time features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockTask, mockTaskChecklist } from '@/test/utils/mock-data';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

// Import after mocking
import {
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useBulkUpdateTasks,
  useTaskChecklists,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useToggleChecklistItem,
  useDeleteChecklistItem,
} from './useTasks';
import { supabase } from '@/integrations/supabase/client';
const mockSupabase = supabase as any;

// Helper functions
const mockSupabaseSuccess = (data: any) => ({ data, error: null });
const mockSupabaseError = (message: string) => ({
  data: null,
  error: { message, code: 'PGRST116', details: '', hint: '' },
});

// Mock Supabase channel for real-time
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: any) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default channel mock
    mockSupabase.channel = vi.fn().mockReturnValue(mockChannel);
    mockSupabase.removeChannel = vi.fn();
  });

  describe('Fetching Tasks', () => {
    it('should fetch all tasks successfully', async () => {
      const mockTasks = [
        mockTask({ task_id: 'task-1', title: 'Clean pool' }),
        mockTask({ task_id: 'task-2', title: 'Fix AC' }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockTasks)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tasks).toHaveLength(2);
      expect(result.current.tasks[0].title).toBe('Clean pool');
    });

    it('should filter tasks by status', async () => {
      const mockTasks = [mockTask({ status: 'in_progress' })];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockTasks)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTasks({ status: ['in_progress'] }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tasks[0].status).toBe('in_progress');
    });

    it('should filter tasks by priority', async () => {
      const mockTasks = [mockTask({ priority: 'urgent' })];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockTasks)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTasks({ priority: ['urgent'] }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tasks[0].priority).toBe('urgent');
    });

    it('should filter tasks by property', async () => {
      const mockTasks = [mockTask({ property_id: 'prop-1' })];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockTasks)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTasks({ property_id: 'prop-1' }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tasks[0].property_id).toBe('prop-1');
    });

    it('should handle fetch error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch tasks')),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Single Task', () => {
    it('should fetch single task successfully', async () => {
      const task = mockTask({ task_id: 'task-123' });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(task)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTask('task-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.task?.task_id).toBe('task-123');
    });

    it('should not fetch if task ID is undefined', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useTask(undefined as any), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Create Task', () => {
    it('should create task successfully', async () => {
      const newTask = mockTask({ task_id: 'new-task' });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newTask)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateTask(), { wrapper });

      result.current.mutate({
        title: 'Test task',
        description: 'Test description',
        status: 'pending',
        priority: 'high',
        category: 'maintenance',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle create error', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to create')),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateTask(), { wrapper });

      result.current.mutate({
        title: 'Test',
      } as any);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Update Task', () => {
    it('should update task successfully', async () => {
      const currentTask = mockTask({ task_id: 'task-123', status: 'pending' });
      const updatedTask = mockTask({ task_id: 'task-123', status: 'in_progress' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(currentTask)),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedTask)),
                }),
              }),
            }),
          };
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
          };
        }
        if (table === 'jobs') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
            }),
          };
        }
        return {};
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateTask(), { wrapper });

      result.current.mutate({ taskId: 'task-123', updates: { status: 'in_progress' } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle task completion with job status update', async () => {
      const currentTask = mockTask({
        task_id: 'task-123',
        status: 'in_progress',
        job_id: 'job-123',
      });
      const completedTask = mockTask({
        task_id: 'task-123',
        status: 'completed',
        job_id: 'job-123',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(currentTask)),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockSupabaseSuccess(completedTask)),
                }),
              }),
            }),
          };
        }
        if (table === 'jobs') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
            }),
          };
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
          };
        }
        return {};
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateTask(), { wrapper });

      result.current.mutate({ taskId: 'task-123', updates: { status: 'completed' } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify job status was updated
      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
    });
  });

  describe('Delete Task', () => {
    it('should delete task successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteTask(), { wrapper });

      result.current.mutate('task-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle delete error', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseError('Failed to delete')),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteTask(), { wrapper });

      result.current.mutate('task-123');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Bulk Update Tasks', () => {
    it('should bulk update tasks successfully', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkUpdateTasks(), { wrapper });

      result.current.mutate({
        taskIds: ['task-1', 'task-2'],
        updates: { status: 'completed' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle bulk update error', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue(mockSupabaseError('Failed to update')),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkUpdateTasks(), { wrapper });

      result.current.mutate({
        taskIds: ['task-1', 'task-2'],
        updates: { status: 'completed' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Task Checklists', () => {
    it('should fetch task checklists', async () => {
      const checklists = [
        mockTaskChecklist({ checklist_item_id: 'check-1' }),
        mockTaskChecklist({ checklist_item_id: 'check-2' }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess(checklists)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTaskChecklists('task-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.checklists).toHaveLength(2);
    });

    it('should create checklist item', async () => {
      const newItem = mockTaskChecklist({ checklist_item_id: 'new-check' });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newItem)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateChecklistItem(), { wrapper });

      result.current.mutate({
        task_id: 'task-123',
        item_text: 'New checklist item',
        order_index: 1,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should update checklist item', async () => {
      const updatedItem = mockTaskChecklist({
        checklist_item_id: 'check-123',
        item_text: 'Updated text',
      });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedItem)),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateChecklistItem(), { wrapper });

      result.current.mutate({
        itemId: 'check-123',
        updates: { item_text: 'Updated text' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should toggle checklist item', async () => {
      const toggledItem = mockTaskChecklist({
        checklist_item_id: 'check-123',
        is_completed: true,
      });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(toggledItem)),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useToggleChecklistItem(), { wrapper });

      result.current.mutate({
        itemId: 'check-123',
        isCompleted: true,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should delete checklist item', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteChecklistItem(), { wrapper });

      result.current.mutate('check-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should setup real-time subscription on mount', () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      });

      const wrapper = createWrapper();
      renderHook(() => useTasks(), { wrapper });

      expect(mockSupabase.channel).toHaveBeenCalledWith('tasks-changes');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should cleanup subscription on unmount', () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      });

      const wrapper = createWrapper();
      const { unmount } = renderHook(() => useTasks(), { wrapper });

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});
