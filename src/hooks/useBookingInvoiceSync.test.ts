import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useSyncInvoicePaymentToBooking,
  useSyncBookingPaymentToInvoice,
  useRecordPartialPayment,
  useLinkInvoiceToBooking,
  useUnlinkInvoiceFromBooking,
} from './useBookingInvoiceSync';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockInvoice, mockBooking } from '@/test/utils/mock-data';
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

describe('useSyncInvoicePaymentToBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sync paid invoice to booking as paid', async () => {
    const paidInvoice = mockInvoice({
      invoice_id: 'inv-123',
      booking_id: 'booking-123',
      total_amount: 1000,
      amount_paid: 1000,
      status: 'paid',
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(paidInvoice)),
            }),
          }),
        };
      }
      if (table === 'property_bookings') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSyncInvoicePaymentToBooking(), { wrapper });

    result.current.mutate('inv-123');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should sync partially paid invoice to booking', async () => {
    const partiallyPaidInvoice = mockInvoice({
      invoice_id: 'inv-123',
      booking_id: 'booking-123',
      total_amount: 1000,
      amount_paid: 500,
      status: 'sent',
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(partiallyPaidInvoice)),
            }),
          }),
        };
      }
      if (table === 'property_bookings') {
        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
        });
        return { update: updateMock };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSyncInvoicePaymentToBooking(), { wrapper });

    result.current.mutate('inv-123');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should sync unpaid invoice to booking as pending', async () => {
    const unpaidInvoice = mockInvoice({
      invoice_id: 'inv-123',
      booking_id: 'booking-123',
      total_amount: 1000,
      amount_paid: 0,
      status: 'sent',
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(unpaidInvoice)),
            }),
          }),
        };
      }
      if (table === 'property_bookings') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSyncInvoicePaymentToBooking(), { wrapper });

    result.current.mutate('inv-123');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle error when invoice not linked to booking', async () => {
    const invoiceWithoutBooking = mockInvoice({
      invoice_id: 'inv-123',
      booking_id: null,
      total_amount: 1000,
      amount_paid: 1000,
      status: 'paid',
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoiceWithoutBooking)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSyncInvoicePaymentToBooking(), { wrapper });

    result.current.mutate('inv-123');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should handle sync error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch invoice')),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSyncInvoicePaymentToBooking(), { wrapper });

    result.current.mutate('inv-123');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useSyncBookingPaymentToInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sync full payment from booking to invoice', async () => {
    const booking = {
      booking_id: 'booking-123',
      invoice_id: 'inv-123',
      total_amount: 1000,
      payment_status: 'paid',
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(booking)),
            }),
          }),
        };
      }
      if (table === 'invoices') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSyncBookingPaymentToInvoice(), { wrapper });

    result.current.mutate({ bookingId: 'booking-123', amountPaid: 1000 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should sync partial payment from booking to invoice', async () => {
    const booking = {
      booking_id: 'booking-123',
      invoice_id: 'inv-123',
      total_amount: 1000,
      payment_status: 'partially_paid',
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(booking)),
            }),
          }),
        };
      }
      if (table === 'invoices') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSyncBookingPaymentToInvoice(), { wrapper });

    result.current.mutate({ bookingId: 'booking-123', amountPaid: 500 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle error when booking has no invoice', async () => {
    const bookingWithoutInvoice = {
      booking_id: 'booking-123',
      invoice_id: null,
      total_amount: 1000,
      payment_status: 'pending',
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(bookingWithoutInvoice)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSyncBookingPaymentToInvoice(), { wrapper });

    result.current.mutate({ bookingId: 'booking-123', amountPaid: 1000 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should handle sync error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch booking')),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSyncBookingPaymentToInvoice(), { wrapper });

    result.current.mutate({ bookingId: 'booking-123', amountPaid: 1000 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useRecordPartialPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should record partial payment on invoice', async () => {
    const invoice = mockInvoice({
      invoice_id: 'inv-123',
      booking_id: 'booking-123',
      total_amount: 1000,
      amount_paid: 0,
      status: 'sent',
    });

    const updatedBooking = mockBooking({
      booking_id: 'booking-123',
      payment_status: 'partially_paid',
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        const selectMock = vi.fn();
        // First call: get current invoice
        selectMock.mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoice)),
          }),
        });
        // Second call: get invoice for sync
        selectMock.mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess({
              ...invoice,
              amount_paid: 500,
              booking_id: 'booking-123',
            })),
          }),
        });

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
        });

        return { select: selectMock, update: updateMock };
      }
      if (table === 'property_bookings') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedBooking)),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecordPartialPayment(), { wrapper });

    result.current.mutate({
      invoiceId: 'inv-123',
      amount: 500,
      paymentMethod: 'credit_card',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should mark invoice as paid when full amount is reached', async () => {
    const invoice = mockInvoice({
      invoice_id: 'inv-123',
      booking_id: 'booking-123',
      total_amount: 1000,
      amount_paid: 500,
      status: 'sent',
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        const selectMock = vi.fn();
        // First call: get current invoice
        selectMock.mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoice)),
          }),
        });
        // Second call: get invoice for sync
        selectMock.mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess({
              ...invoice,
              amount_paid: 1000,
              status: 'paid',
            })),
          }),
        });

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
        });

        return { select: selectMock, update: updateMock };
      }
      if (table === 'property_bookings') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecordPartialPayment(), { wrapper });

    result.current.mutate({
      invoiceId: 'inv-123',
      amount: 500,
      paymentMethod: 'cash',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle payment recording error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch invoice')),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecordPartialPayment(), { wrapper });

    result.current.mutate({
      invoiceId: 'inv-123',
      amount: 500,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useLinkInvoiceToBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should link invoice to booking successfully', async () => {
    const invoice = mockInvoice({
      invoice_id: 'inv-123',
      status: 'sent',
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        const selectMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoice)),
          }),
        });

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
        });

        return { select: selectMock, update: updateMock };
      }
      if (table === 'property_bookings') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useLinkInvoiceToBooking(), { wrapper });

    result.current.mutate({
      invoiceId: 'inv-123',
      bookingId: 'booking-123',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle linking error', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockSupabaseError('Failed to link invoice')),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useLinkInvoiceToBooking(), { wrapper });

    result.current.mutate({
      invoiceId: 'inv-123',
      bookingId: 'booking-123',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useUnlinkInvoiceFromBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should unlink invoice from booking successfully', async () => {
    const invoice = mockInvoice({
      invoice_id: 'inv-123',
      booking_id: 'booking-123',
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        const selectMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoice)),
          }),
        });

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
        });

        return { select: selectMock, update: updateMock };
      }
      if (table === 'property_bookings') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUnlinkInvoiceFromBooking(), { wrapper });

    result.current.mutate('inv-123');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle unlinking error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch invoice')),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUnlinkInvoiceFromBooking(), { wrapper });

    result.current.mutate('inv-123');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should handle invoice without booking', async () => {
    const invoiceWithoutBooking = mockInvoice({
      invoice_id: 'inv-123',
      booking_id: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        const selectMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoiceWithoutBooking)),
          }),
        });

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
        });

        return { select: selectMock, update: updateMock };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUnlinkInvoiceFromBooking(), { wrapper });

    result.current.mutate('inv-123');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('Payment Status Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update booking payment_status when invoice becomes paid', async () => {
    const paidInvoice = mockInvoice({
      invoice_id: 'inv-123',
      booking_id: 'booking-123',
      total_amount: 1000,
      amount_paid: 1000,
      status: 'paid',
    });

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(paidInvoice)),
            }),
          }),
        };
      }
      if (table === 'property_bookings') {
        return { update: updateMock };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSyncInvoicePaymentToBooking(), { wrapper });

    result.current.mutate('inv-123');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify update was called with payment_status: 'paid'
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_status: 'paid',
      })
    );
  });

  it('should update invoice when booking receives payment', async () => {
    const booking = {
      booking_id: 'booking-123',
      invoice_id: 'inv-123',
      total_amount: 1000,
      payment_status: 'paid',
    };

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(mockSupabaseSuccess({})),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(booking)),
            }),
          }),
        };
      }
      if (table === 'invoices') {
        return { update: updateMock };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSyncBookingPaymentToInvoice(), { wrapper });

    result.current.mutate({ bookingId: 'booking-123', amountPaid: 1000 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify invoice was updated with amount_paid
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount_paid: 1000,
        status: 'paid',
      })
    );
  });
});
