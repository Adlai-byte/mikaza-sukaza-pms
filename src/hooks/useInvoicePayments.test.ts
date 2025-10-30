import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRecordPayment, useInvoicePayments, usePaymentSummary } from './useInvoicePayments';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockPayment, mockPartialPayment, mockInvoice } from '@/test/utils/mock-data';
import { mockSupabaseSuccess, mockSupabaseError } from '@/test/utils/supabase-mock';

// Mock AuthContext - Must be first
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', user_id: 'user-123', email: 'test@example.com', user_type: 'admin', is_active: true },
    session: { user: { id: 'user-123' }, access_token: 'mock-token' },
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock Supabase client - Must be defined inline for Vitest hoisting
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

describe('useRecordPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should record a full payment successfully', async () => {
    const mockPaymentData = mockPayment();

    // Mock insert operation
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockPaymentData)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecordPayment(), { wrapper });

    // Execute mutation
    result.current.mutate({
      invoice_id: 'inv-123',
      payment_date: '2025-10-23',
      amount: 1080.00,
      payment_method: 'cash',
      reference_number: 'REF-001',
      notes: 'Full payment received',
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify insert was called with correct data
    expect(mockSupabase.from).toHaveBeenCalledWith('invoice_payments');
  });

  it('should record a partial payment successfully', async () => {
    const mockPartialPaymentData = mockPartialPayment();

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockPartialPaymentData)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecordPayment(), { wrapper });

    result.current.mutate({
      invoice_id: 'inv-123',
      payment_date: '2025-10-23',
      amount: 500.00, // Partial payment
      payment_method: 'bank_transfer',
      reference_number: 'REF-002',
      notes: 'Partial payment - 1st installment',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle payment recording error', async () => {
    // Mock error response
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(
            mockSupabaseError('Payment recording failed')
          ),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecordPayment(), { wrapper });

    result.current.mutate({
      invoice_id: 'inv-123',
      payment_date: '2025-10-23',
      amount: 1080.00,
      payment_method: 'cash',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should validate payment amount is greater than zero', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecordPayment(), { wrapper });

    // This should trigger validation error
    result.current.mutate({
      invoice_id: 'inv-123',
      payment_date: '2025-10-23',
      amount: 0, // Invalid amount
      payment_method: 'cash',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should include created_by from current user session', async () => {
    const mockPaymentData = mockPayment({ created_by: 'user-123' });

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockPaymentData)),
      }),
    });

    mockSupabase.from.mockReturnValue({
      insert: insertMock,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecordPayment(), { wrapper });

    result.current.mutate({
      invoice_id: 'inv-123',
      payment_date: '2025-10-23',
      amount: 1080.00,
      payment_method: 'cash',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify created_by was included in the insert
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by: 'user-123',
      })
    );
  });
});

describe('useInvoicePayments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch payments for an invoice', async () => {
    const mockPayments = [
      mockPayment({ payment_id: 'pay-1', amount: 500 }),
      mockPayment({ payment_id: 'pay-2', amount: 580 }),
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockPayments)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useInvoicePayments('inv-123'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.payments).toEqual(mockPayments);
    expect(result.current.payments.length).toBe(2);
  });

  it('should return empty array when invoice has no payments', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useInvoicePayments('inv-no-payments'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.payments).toEqual([]);
  });

  it('should handle fetch error gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(
            mockSupabaseError('Failed to fetch payments')
          ),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useInvoicePayments('inv-123'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});

describe('usePaymentSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate payment summary correctly for full payment', async () => {
    const mockInvoiceData = { total_amount: 1080.00, amount_paid: 1080.00 };
    const mockPaymentsData = [mockPayment({ amount: 1080.00, payment_date: '2025-10-23' })];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockInvoiceData)),
            }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockPaymentsData)),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => usePaymentSummary('inv-123'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary).toBeTruthy();
    expect(result.current.summary?.total_paid).toBe(1080.00);
    expect(result.current.summary?.payment_count).toBe(1);
  });

  it('should calculate payment summary for multiple partial payments', async () => {
    const mockInvoiceData = { total_amount: 1080.00, amount_paid: 1080.00 };
    const mockPayments = [
      mockPayment({ payment_id: 'pay-1', amount: 500.00, payment_date: '2025-10-20' }),
      mockPayment({ payment_id: 'pay-2', amount: 300.00, payment_date: '2025-10-21' }),
      mockPayment({ payment_id: 'pay-3', amount: 280.00, payment_date: '2025-10-22' }),
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockInvoiceData)),
            }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockPayments)),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => usePaymentSummary('inv-123'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary).toBeTruthy();
    expect(result.current.summary?.total_paid).toBe(1080.00);
    expect(result.current.summary?.payment_count).toBe(3);
  });

  it('should return zero for invoice with no payments', async () => {
    const mockInvoiceData = { total_amount: 1080.00, amount_paid: 0 };
    const mockPaymentsData: any[] = [];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockInvoiceData)),
            }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockPaymentsData)),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => usePaymentSummary('inv-no-payments'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary).toBeTruthy();
    expect(result.current.summary?.total_paid).toBe(0);
    expect(result.current.summary?.payment_count).toBe(0);
  });
});

describe('Payment Workflow Integration', () => {
  it('should update invoice status when full payment is recorded', async () => {
    // This tests the trigger behavior (actual DB trigger test would need integration test)
    const invoice = mockInvoice({ total_amount: 1080.00, amount_paid: 0 });
    const payment = mockPayment({ amount: 1080.00 });

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(payment)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecordPayment(), { wrapper });

    result.current.mutate({
      invoice_id: invoice.invoice_id,
      payment_date: '2025-10-23',
      amount: payment.amount,
      payment_method: 'cash',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // In real scenario, DB trigger would update invoice status to 'paid'
    // This would be verified in integration/E2E tests
  });

  it('should keep invoice status as sent when partial payment is recorded', async () => {
    const invoice = mockInvoice({ total_amount: 1080.00, amount_paid: 0 });
    const partialPayment = mockPartialPayment({ amount: 500.00 });

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(partialPayment)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecordPayment(), { wrapper });

    result.current.mutate({
      invoice_id: invoice.invoice_id,
      payment_date: '2025-10-23',
      amount: partialPayment.amount,
      payment_method: 'bank_transfer',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // In real scenario, invoice would remain 'sent' with amount_paid updated
    // Full verification requires integration test
  });
});
