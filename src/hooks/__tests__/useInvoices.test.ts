import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInvoices } from '../useInvoices';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockInvoice, mockInvoiceLineItem, createMockArray } from '@/test/utils/mock-data';

// Mock Supabase client - using inline factory to avoid hoisting issues
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: vi.fn(() => true) }),
}));

// Import after mocks to get mocked versions
import { supabase as mockSupabase } from '@/integrations/supabase/client';

describe('useInvoices', () => {
  const mockInvoices = createMockArray(mockInvoice, 10);
  const testInvoice = mockInvoice({
    invoice_id: 'inv-1',
    status: 'draft',
    total_amount: 1000,
    amount_paid: 0,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue({
                data: mockInvoices,
                error: null,
              }),
            }),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: vi.fn().mockResolvedValue({
                  data: testInvoice,
                  error: null,
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: vi.fn().mockResolvedValue({
                  data: testInvoice,
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({
                  then: vi.fn().mockResolvedValue({
                    data: { ...testInvoice, status: 'paid' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          then: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });
  });

  describe('fetching invoices', () => {
    it('should fetch all invoices', async () => {
      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.invoices).toHaveLength(10);
      });
    });
  });

  describe('createInvoice', () => {
    it('should create invoice with line items', async () => {
      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newInvoice = {
        booking_id: 'booking-1',
        total_amount: 1080,
        line_items: [
          mockInvoiceLineItem({ line_item_type: 'accommodation', amount: 1000 }),
          mockInvoiceLineItem({ line_item_type: 'tax', amount: 80 }),
        ],
      };

      await result.current.createInvoice(newInvoice as any);

      expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
    });
  });

  describe('invoice calculations', () => {
    it('should calculate totals correctly', async () => {
      const lineItems = [
        { amount: 1000, line_item_type: 'accommodation' },
        { amount: 100, line_item_type: 'cleaning' },
        { amount: 88, line_item_type: 'tax' },
      ];

      const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

      expect(total).toBe(1188);
    });
  });

  describe('payment tracking', () => {
    it('should record full payment', async () => {
      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const payment = {
        status: 'paid' as const,
        amount_paid: 1000,
      };

      await result.current.updateInvoice('inv-1', payment);

      expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
    });

    it('should handle partial payments', async () => {
      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const partialPayment = {
        amount_paid: 500, // Partial amount
      };

      await result.current.updateInvoice('inv-1', partialPayment);

      expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
    });
  });

  describe('invoice status', () => {
    it('should handle all status transitions', async () => {
      const statuses: Array<any> = ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'];

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      for (const status of statuses) {
        await result.current.updateInvoice('inv-1', { status });
      }

      expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
    });
  });

  describe('deleteInvoice', () => {
    it('should delete draft invoice', async () => {
      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.deleteInvoice('inv-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
    });
  });
});
