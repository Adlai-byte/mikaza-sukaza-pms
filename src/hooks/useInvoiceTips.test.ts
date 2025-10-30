import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useInvoiceTips,
  useInvoiceTip,
  useCreateInvoiceTip,
  useDeleteInvoiceTip,
  useProcessInvoiceTip,
  useMarkTipAsPaid,
  useTipsSummary,
} from './useInvoiceTips';
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

// Mock invoice tip data
const mockTip = {
  tip_id: 'tip-123',
  invoice_id: 'invoice-123',
  recipient_user_id: 'user-456',
  tip_amount: 50.00,
  tip_percentage: 5.00,
  tip_reason: 'Excellent cleaning service',
  guest_notes: 'Very professional and thorough',
  status: 'pending',
  commission_id: null,
  created_at: '2025-01-20T10:00:00Z',
  updated_at: '2025-01-20T10:00:00Z',
  recipient: {
    user_id: 'user-456',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    user_type: 'ops_staff',
  },
  invoice: {
    invoice_id: 'invoice-123',
    invoice_number: 'INV-001',
    guest_name: 'Guest Name',
  },
  commission: null,
};

describe('useInvoiceTips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useInvoiceTips - Fetch list', () => {
    it('should fetch invoice tips successfully', async () => {
      const mockTips = [mockTip];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockTips)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoiceTips(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tips).toEqual(mockTips);
      expect(mockSupabase.from).toHaveBeenCalledWith('invoice_tips');
    });

    it('should filter tips by invoice_id', async () => {
      const mockTips = [mockTip];

      const queryChain: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      queryChain.then = vi.fn((resolve) => {
        return Promise.resolve(mockSupabaseSuccess(mockTips)).then(resolve);
      });

      mockSupabase.from.mockReturnValue(queryChain);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useInvoiceTips({ invoice_id: 'invoice-123' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(queryChain.eq).toHaveBeenCalledWith('invoice_id', 'invoice-123');
    });

    it('should filter tips by recipient_user_id', async () => {
      const mockTips = [mockTip];

      const queryChain: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      queryChain.then = vi.fn((resolve) => {
        return Promise.resolve(mockSupabaseSuccess(mockTips)).then(resolve);
      });

      mockSupabase.from.mockReturnValue(queryChain);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useInvoiceTips({ recipient_user_id: 'user-456' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(queryChain.eq).toHaveBeenCalledWith('recipient_user_id', 'user-456');
    });

    it('should handle fetch error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseError('Fetch failed')),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoiceTips(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useInvoiceTip - Fetch single', () => {
    it('should fetch single tip successfully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockTip)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoiceTip('tip-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tip).toEqual(mockTip);
    });
  });

  describe('useCreateInvoiceTip', () => {
    it('should create tip successfully', async () => {
      const newTipData = {
        tip_id: 'tip-new',
        ...mockTip,
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ tip_id: 'tip-new' })),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newTipData)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateInvoiceTip(), { wrapper });

      const newTip = {
        invoice_id: 'invoice-123',
        recipient_user_id: 'user-456',
        tip_amount: 50.00,
        tip_reason: 'Great service',
        status: 'pending' as const,
      };

      result.current.mutate(newTip);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useProcessInvoiceTip', () => {
    it('should process tip successfully', async () => {
      const processedTip = {
        ...mockTip,
        status: 'processed',
        commission_id: 'comm-new',
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ tip_id: 'tip-123' })),
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(processedTip)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProcessInvoiceTip(), { wrapper });

      result.current.mutate('tip-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useMarkTipAsPaid', () => {
    it('should mark tip as paid successfully', async () => {
      const paidTip = { ...mockTip, status: 'paid' };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ tip_id: 'tip-123' })),
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(paidTip)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMarkTipAsPaid(), { wrapper });

      result.current.mutate('tip-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useDeleteInvoiceTip', () => {
    it('should delete tip successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteInvoiceTip(), { wrapper });

      result.current.mutate('tip-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useTipsSummary', () => {
    it('should fetch tips summary successfully', async () => {
      const mockSummary = [
        {
          recipient_user_id: 'user-456',
          staff_name: 'John Doe',
          tip_count: 3,
          total_tips: 155.00,
          avg_tip_amount: 51.67,
          tips_paid: 75.00,
          tips_pending: 80.00,
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockSummary)),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTipsSummary(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.summary).toEqual(mockSummary);
      expect(mockSupabase.from).toHaveBeenCalledWith('tips_summary');
    });
  });
});
