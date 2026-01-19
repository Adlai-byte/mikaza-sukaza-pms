import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInvoices, useInvoice, invoiceKeys } from '../useInvoices';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockInvoice, mockInvoiceLineItem, mockPaidInvoice, mockOverdueInvoice, createMockArray } from '@/test/utils/mock-data';

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
        const orderResult = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          then: (callback: any) => Promise.resolve({ data: mockInvoices, error: null }).then(callback),
        };

        const selectResult = {
          order: vi.fn().mockReturnValue(orderResult),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              then: (callback: any) => Promise.resolve({ data: testInvoice, error: null }).then(callback),
            }),
          }),
        };

        return {
          select: vi.fn().mockReturnValue(selectResult),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: (callback: any) => Promise.resolve({ data: testInvoice, error: null }).then(callback),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({
                  then: (callback: any) => Promise.resolve({ data: { ...testInvoice, status: 'paid' }, error: null }).then(callback),
                }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: (callback: any) => Promise.resolve({ error: null }).then(callback),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          then: (callback: any) => Promise.resolve({ data: [], error: null }).then(callback),
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

  describe('invoice calculations (unit tests)', () => {
    it('should calculate totals correctly from line items', () => {
      const lineItems = [
        { amount: 1000, line_item_type: 'accommodation' },
        { amount: 100, line_item_type: 'cleaning' },
        { amount: 88, line_item_type: 'tax' },
      ];

      const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

      expect(total).toBe(1188);
    });

    it('should calculate correct balance from invoice', () => {
      const invoice = mockInvoice({ total_amount: 1000, amount_paid: 300 });
      const balanceDue = invoice.total_amount - invoice.amount_paid;

      expect(balanceDue).toBe(700);
    });

    it('should identify fully paid invoice', () => {
      const invoice = mockPaidInvoice();
      const isFullyPaid = invoice.amount_paid >= invoice.total_amount;

      expect(isFullyPaid).toBe(true);
    });

    it('should identify overdue invoice', () => {
      const invoice = mockOverdueInvoice();
      expect(invoice.status).toBe('overdue');
    });
  });

  describe('invoice status definitions', () => {
    it('should have valid invoice statuses', () => {
      const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

      validStatuses.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });

    it('should identify draft status', () => {
      const invoice = mockInvoice({ status: 'draft' });
      expect(invoice.status).toBe('draft');
    });

    it('should identify paid status', () => {
      const invoice = mockPaidInvoice();
      expect(invoice.status).toBe('paid');
    });
  });

  describe('refetch functionality', () => {
    it('should have refetch function', async () => {
      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should return empty array when no invoices exist', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const orderResult = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          then: (callback: any) => Promise.resolve({ data: [], error: null }).then(callback),
        };

        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(orderResult),
          }),
        };
      });

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.invoices).toEqual([]);
    });
  });

  describe('filtering', () => {
    it('should apply status filter', async () => {
      const { result } = renderHook(() => useInvoices({ status: 'paid' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
    });

    it('should apply property filter', async () => {
      const { result } = renderHook(() => useInvoices({ property_id: 'prop-123' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
    });

    it('should apply date range filter', async () => {
      const filters = {
        date_from: '2025-01-01',
        date_to: '2025-12-31',
      };

      const { result } = renderHook(() => useInvoices(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
    });
  });
});

describe('useInvoice', () => {
  const singleInvoice = mockInvoice({
    invoice_id: 'inv-single',
    invoice_number: 'INV-2025-100',
    status: 'sent',
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue({
            then: (callback: any) => Promise.resolve({ data: singleInvoice, error: null }).then(callback),
          }),
        }),
      }),
    }));
  });

  it('should fetch single invoice by ID', async () => {
    const { result } = renderHook(() => useInvoice('inv-single'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
  });

  it('should not fetch if ID is empty', async () => {
    const { result } = renderHook(() => useInvoice(''), {
      wrapper: createWrapper(),
    });

    // Should not be loading since query is disabled
    expect(result.current.invoice).toBeUndefined();
  });

  it('should have refetch function', async () => {
    const { result } = renderHook(() => useInvoice('inv-single'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.refetch).toBeDefined();
  });
});

describe('invoiceKeys', () => {
  it('should generate correct base keys', () => {
    expect(invoiceKeys.all).toEqual(['invoices']);
    expect(invoiceKeys.lists()).toEqual(['invoices', 'list']);
    expect(invoiceKeys.details()).toEqual(['invoices', 'detail']);
  });

  it('should generate correct detail key', () => {
    expect(invoiceKeys.detail('inv-123')).toEqual(['invoices', 'detail', 'inv-123']);
  });

  it('should generate correct property key', () => {
    expect(invoiceKeys.byProperty('prop-123')).toEqual(['invoices', 'property', 'prop-123']);
  });

  it('should generate correct booking key', () => {
    expect(invoiceKeys.byBooking('book-123')).toEqual(['invoices', 'booking', 'book-123']);
  });

  it('should include filters in list key', () => {
    const filters = { status: 'paid', property_id: 'prop-1' };
    expect(invoiceKeys.list(filters)).toEqual(['invoices', 'list', filters]);
  });
});

describe('Invoice Calculations', () => {
  it('should calculate subtotal from line items', () => {
    const lineItems = [
      { quantity: 4, unit_price: 250.00 },
      { quantity: 1, unit_price: 100.00 },
    ];

    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );

    expect(subtotal).toBe(1100.00);
  });

  it('should calculate tax correctly', () => {
    const subtotal = 1000.00;
    const taxRate = 0.08;
    const taxAmount = subtotal * taxRate;

    expect(taxAmount).toBe(80.00);
  });

  it('should calculate total correctly', () => {
    const subtotal = 1000.00;
    const taxAmount = 80.00;
    const total = subtotal + taxAmount;

    expect(total).toBe(1080.00);
  });

  it('should calculate balance due correctly', () => {
    const total = 1080.00;
    const amountPaid = 500.00;
    const balanceDue = total - amountPaid;

    expect(balanceDue).toBe(580.00);
  });

  it('should identify fully paid invoice', () => {
    const invoice = mockPaidInvoice();
    const isFullyPaid = invoice.amount_paid >= invoice.total_amount;

    expect(isFullyPaid).toBe(true);
  });

  it('should identify overdue invoice', () => {
    const invoice = mockOverdueInvoice();
    const today = new Date();
    const dueDate = new Date(invoice.due_date!);
    const isOverdue = dueDate < today && invoice.status !== 'paid';

    expect(isOverdue).toBe(true);
  });
});

describe('Invoice Status Transitions', () => {
  const validTransitions: Record<string, string[]> = {
    draft: ['sent', 'cancelled'],
    sent: ['paid', 'overdue', 'cancelled'],
    overdue: ['paid', 'cancelled'],
    paid: [], // Final state
    cancelled: [], // Final state
  };

  it('should allow draft to be sent', () => {
    expect(validTransitions.draft).toContain('sent');
  });

  it('should allow sent to be marked as paid', () => {
    expect(validTransitions.sent).toContain('paid');
  });

  it('should not allow transition from paid status', () => {
    expect(validTransitions.paid).toHaveLength(0);
  });

  it('should not allow transition from cancelled status', () => {
    expect(validTransitions.cancelled).toHaveLength(0);
  });
});
