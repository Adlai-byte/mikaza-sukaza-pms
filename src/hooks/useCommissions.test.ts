import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useCommissions,
  useCommission,
  useCreateCommission,
  useApproveCommission,
  useMarkCommissionAsPaid,
  useDeleteCommission,
  useCommissionSummary,
} from './useCommissions';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockSupabaseSuccess, mockSupabaseError } from '@/test/utils/supabase-mock';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', user_id: 'user-123', email: 'test@example.com', user_type: 'admin', is_active: true },
    profile: { user_id: 'user-123', email: 'test@example.com', user_type: 'admin' },
    session: { user: { id: 'user-123' }, access_token: 'mock-token' },
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      }),
    },
  },
}));

// Import after mocking
import { supabase } from '@/integrations/supabase/client';
const mockSupabase = supabase as any;

// Mock commission data
const mockCommission = {
  commission_id: 'comm-123',
  user_id: 'user-456',
  source_type: 'booking',
  booking_id: 'booking-123',
  invoice_id: null,
  job_id: null,
  property_id: 'property-123',
  commission_type: 'percentage',
  base_amount: 1000.00,
  commission_rate: 10.00,
  commission_amount: 100.00,
  status: 'pending',
  payment_date: null,
  payment_method: null,
  payment_reference: null,
  earned_date: '2025-01-20',
  period_start: null,
  period_end: null,
  description: 'Test booking commission',
  notes: null,
  tip_from_guest: null,
  tip_reason: null,
  created_by: 'user-123',
  created_at: '2025-01-20T10:00:00Z',
  updated_at: '2025-01-20T10:00:00Z',
  user: {
    user_id: 'user-456',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    user_type: 'property_manager',
  },
  property: {
    property_id: 'property-123',
    property_name: 'Test Property',
  },
  booking: {
    booking_id: 'booking-123',
    guest_name: 'Guest Name',
  },
  invoice: null,
};

describe('useCommissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCommissions - Fetch list', () => {
    it('should fetch commissions successfully', async () => {
      const mockCommissions = [mockCommission];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockCommissions)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCommissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.commissions).toEqual(mockCommissions);
      expect(mockSupabase.from).toHaveBeenCalledWith('commissions');
    });

    it('should filter commissions by user_id', async () => {
      const mockCommissions = [mockCommission];

      const queryChain: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      queryChain.then = vi.fn((resolve) => {
        return Promise.resolve(mockSupabaseSuccess(mockCommissions)).then(resolve);
      });

      mockSupabase.from.mockReturnValue(queryChain);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCommissions({ user_id: 'user-456' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(queryChain.eq).toHaveBeenCalledWith('user_id', 'user-456');
    });

    it('should filter by status', async () => {
      const mockCommissions = [mockCommission];

      const queryChain: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      queryChain.then = vi.fn((resolve) => {
        return Promise.resolve(mockSupabaseSuccess(mockCommissions)).then(resolve);
      });

      mockSupabase.from.mockReturnValue(queryChain);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCommissions({ status: 'approved' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(queryChain.eq).toHaveBeenCalledWith('status', 'approved');
    });

    it('should handle fetch error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseError('Fetch failed')),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCommissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useCommission - Fetch single', () => {
    it('should fetch single commission successfully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockCommission)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCommission('comm-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.commission).toEqual(mockCommission);
    });
  });

  describe('useCreateCommission', () => {
    it('should create commission successfully', async () => {
      const newCommissionData = {
        commission_id: 'comm-new',
        ...mockCommission,
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ commission_id: 'comm-new' })),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newCommissionData)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateCommission(), { wrapper });

      const newCommission = {
        user_id: 'user-456',
        source_type: 'booking' as const,
        commission_type: 'percentage' as const,
        base_amount: 1000.00,
        commission_rate: 10.00,
        commission_amount: 100.00,
        status: 'pending' as const,
      };

      result.current.mutate(newCommission);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useApproveCommission', () => {
    it('should approve commission successfully', async () => {
      const approvedCommission = { ...mockCommission, status: 'approved' };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ commission_id: 'comm-123' })),
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(approvedCommission)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useApproveCommission(), { wrapper });

      result.current.mutate('comm-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useMarkCommissionAsPaid', () => {
    it('should mark commission as paid successfully', async () => {
      const paidCommission = {
        ...mockCommission,
        status: 'paid',
        payment_date: '2025-01-25',
        payment_method: 'bank_transfer',
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ commission_id: 'comm-123' })),
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(paidCommission)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMarkCommissionAsPaid(), { wrapper });

      result.current.mutate({
        commissionId: 'comm-123',
        paymentMethod: 'bank_transfer',
        paymentReference: 'TXN-123',
        paymentDate: '2025-01-25',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useDeleteCommission', () => {
    it('should delete commission successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteCommission(), { wrapper });

      result.current.mutate('comm-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useCommissionSummary', () => {
    it('should fetch commission summary successfully', async () => {
      const mockSummary = [
        {
          user_id: 'user-456',
          user_name: 'John Doe',
          email: 'john@example.com',
          role: 'property_manager',
          status: 'pending',
          commission_count: 5,
          total_commissions: 500.00,
          total_paid: 0,
          total_pending: 500.00,
          total_approved: 0,
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockSummary)),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCommissionSummary(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.summary).toEqual(mockSummary);
      expect(mockSupabase.from).toHaveBeenCalledWith('commission_summary_by_user');
    });
  });
});
