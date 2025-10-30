/**
 * Comprehensive tests for useJobs hook
 * Tests job CRUD operations and related features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockJob, mockJobTask, mockJobComment, mockJobAttachment } from '@/test/utils/mock-data';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Import after mocking
import { useJobs, useJob, useCreateJob, useUpdateJob, useDeleteJob, useJobTasks, useCreateJobTask } from './useJobs';
import { supabase } from '@/integrations/supabase/client';
const mockSupabase = supabase as any;

// Helper functions
const mockSupabaseSuccess = (data: any) => ({ data, error: null });
const mockSupabaseError = (message: string) => ({
  data: null,
  error: { message, code: 'PGRST116', details: '', hint: '' },
});

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

describe('useJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetching Jobs', () => {
    it('should fetch all jobs successfully', async () => {
      const mockJobs = [
        mockJob({ job_id: 'job-1', title: 'Fix plumbing' }),
        mockJob({ job_id: 'job-2', title: 'Paint walls' }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockJobs)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useJobs(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].title).toBe('Fix plumbing');
    });

    it('should filter jobs by status', async () => {
      const mockJobs = [mockJob({ status: 'in_progress' })];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockJobs)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useJobs({ status: 'in_progress' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.[0].status).toBe('in_progress');
    });

    it('should filter jobs by priority', async () => {
      const mockJobs = [mockJob({ priority: 'urgent' })];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockJobs)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useJobs({ priority: 'urgent' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.[0].priority).toBe('urgent');
    });

    it('should filter jobs by property', async () => {
      const mockJobs = [mockJob({ property_id: 'prop-1' })];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockJobs)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useJobs({ property_id: 'prop-1' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.[0].property_id).toBe('prop-1');
    });

    it('should handle fetch error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch jobs')),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useJobs(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Single Job', () => {
    it('should fetch single job with relations', async () => {
      const job = mockJob({ job_id: 'job-123' });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(job)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useJob('job-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.job_id).toBe('job-123');
    });

    it('should not fetch if job ID is undefined', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useJob(undefined), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Create Job', () => {
    it('should create job successfully', async () => {
      const newJob = mockJob({ job_id: 'new-job' });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newJob)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateJob(), { wrapper });

      result.current.mutate({
        property_id: 'prop-123',
        title: 'Test job',
        description: 'Test description',
        job_type: 'maintenance',
        status: 'pending',
        priority: 'high',
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
      const { result } = renderHook(() => useCreateJob(), { wrapper });

      result.current.mutate({
        property_id: 'prop-123',
        title: 'Test',
      } as any);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Update Job', () => {
    it('should update job successfully', async () => {
      const currentJob = mockJob({ job_id: 'job-123', status: 'pending' });
      const updatedJob = mockJob({ job_id: 'job-123', status: 'in_progress' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'jobs'
) {
          let callCount = 0;
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(currentJob)),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedJob)),
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
        return {};
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateJob(), { wrapper });

      result.current.mutate({ jobId: 'job-123', updates: { status: 'in_progress' } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('Delete Job', () => {
    it('should delete job successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteJob(), { wrapper });

      result.current.mutate('job-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('Job Tasks', () => {
    it('should fetch job tasks', async () => {
      const tasks = [
        mockJobTask({ task_id: 'task-1' }),
        mockJobTask({ task_id: 'task-2' }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess(tasks)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useJobTasks('job-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(2);
    });

    it('should create job task', async () => {
      const newTask = mockJobTask({ task_id: 'new-task' });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newTask)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateJobTask(), { wrapper });

      result.current.mutate({
        job_id: 'job-123',
        title: 'New task',
        task_order: 1,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});
