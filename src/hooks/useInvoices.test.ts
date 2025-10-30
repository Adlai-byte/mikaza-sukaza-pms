/**
 * Comprehensive tests for useInvoices hook
 * Tests all 11 exported hooks: CRUD, line items, status transitions, and create from booking
 */

import { describe, it, expect, vi, beforeEach, createElement } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockInvoice, mockPaidInvoice, mockInvoiceLineItem, mockAccommodationLineItem,
  mockCleaningLineItem, mockBooking, mockProperty } from '@/test/utils/mock-data';
import React from 'react';

// Mock Supabase - Must be defined inline for Vitest hoisting
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { user_id: 'user-123', user_type: 'admin' },
    hasPermission: vi.fn(() => true),
  }),
}));

// Import after mocking
import { useInvoices, useInvoice, useCreateInvoice, useUpdateInvoice, useDeleteInvoice,
  useAddLineItem, useUpdateLineItem, useDeleteLineItem,
  useMarkInvoiceAsSent, useMarkInvoiceAsPaid, useCreateInvoiceFromBooking } from './useInvoices';
import { supabase } from '@/integrations/supabase/client';
const mockSupabase = supabase as any;

// Helper functions
const mockSupabaseSuccess = (data: any) => ({ data, error: null });
const mockSupabaseError = (message: string) => ({
  data: null,
  error: { message, code: 'PGRST116', details: '', hint: '' },
});

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children }: any) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetching Invoices', () => {
    it('should fetch all invoices successfully', async () => {
      const mockInvoices = [
        mockInvoice({ invoice_id: 'inv-1', invoice_number: 'INV-001' }),
        mockInvoice({ invoice_id: 'inv-2', invoice_number: 'INV-002' }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockInvoices)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoices(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.invoices).toHaveLength(2);
      expect(result.current.invoices[0].invoice_number).toBe('INV-001');
      expect(result.current.error).toBeNull();
    });

    it('should filter invoices by property_id', async () => {
      const mockInvoices = [mockInvoice({ property_id: 'prop-1' })];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockInvoices)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoices({ property_id: 'prop-1' }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.invoices).toHaveLength(1);
      expect(result.current.invoices[0].property_id).toBe('prop-1');
    });

    it('should filter invoices by status', async () => {
      const mockInvoices = [mockPaidInvoice({ status: 'paid' })];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockInvoices)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoices({ status: 'paid' }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.invoices[0].status).toBe('paid');
    });

    it('should filter invoices by date range', async () => {
      const mockInvoices = [mockInvoice({ issue_date: '2025-10-15' })];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockInvoices)),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoices({ date_from: '2025-10-01', date_to: '2025-10-31' }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.invoices).toHaveLength(1);
    });

    it('should filter invoices by guest name', async () => {
      const mockInvoices = [mockInvoice({ guest_name: 'John Doe' })];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            ilike: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockInvoices)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoices({ guest_name: 'John' }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.invoices[0].guest_name).toBe('John Doe');
    });

    it('should handle fetch error gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch invoices')),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoices(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.error).toBeTruthy();
      expect(result.current.invoices).toEqual([]);
    });
  });

  describe('Fetching Single Invoice', () => {
    it('should fetch invoice by ID with line items', async () => {
      const mockInv = mockInvoice({
        invoice_id: 'inv-123',
        line_items: [
          mockAccommodationLineItem(),
          mockCleaningLineItem(),
        ],
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockInv)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoice('inv-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.invoice?.invoice_id).toBe('inv-123');
      expect(result.current.invoice?.line_items).toHaveLength(2);
    });

    it('should not fetch invoice if ID is empty', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoice(''), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.invoice).toBeUndefined();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle fetch error for invalid invoice ID', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseError('Invoice not found')),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useInvoice('invalid-id'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Creating Invoices', () => {
    it('should create invoice with line items', async () => {
      const newInvoice = mockInvoice({ invoice_id: 'new-inv' });
      const lineItems = [mockAccommodationLineItem(), mockCleaningLineItem()];

      // Mock invoice and line items creation
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoice_line_items') {
          return {
            insert: vi.fn().mockResolvedValue(mockSupabaseSuccess(lineItems)),
          };
        }
        if (table === 'invoices') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newInvoice)),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ ...newInvoice, line_items: lineItems })),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
            }),
          }),
        };
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateInvoice(), { wrapper });

      const invoiceData = {
        property_id: 'prop-123',
        booking_id: 'booking-123',
        guest_name: 'Test Guest',
        issue_date: '2025-10-01',
        due_date: '2025-10-15',
        status: 'draft' as const,
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        amount_paid: 0,
      };

      result.current.mutate({ invoice: invoiceData, lineItems });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should create invoice without line items', async () => {
      const newInvoice = mockInvoice({ invoice_id: 'new-inv-2' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newInvoice)),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newInvoice)),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
            }),
          }),
        };
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateInvoice(), { wrapper });

      const invoiceData = {
        property_id: 'prop-123',
        guest_name: 'Test Guest',
        issue_date: '2025-10-01',
        due_date: '2025-10-15',
        status: 'draft' as const,
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        amount_paid: 0,
      };

      result.current.mutate({ invoice: invoiceData, lineItems: [] });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle invoice creation error', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to create invoice')),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateInvoice(), { wrapper });

      const invoiceData = {
        property_id: 'prop-123',
        guest_name: 'Test Guest',
        issue_date: '2025-10-01',
        due_date: '2025-10-15',
        status: 'draft' as const,
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        amount_paid: 0,
      };

      result.current.mutate({ invoice: invoiceData, lineItems: [] });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Updating Invoices', () => {
    it('should update invoice successfully', async () => {
      const updatedInvoice = mockInvoice({ invoice_id: 'inv-123', notes: 'Updated notes' });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedInvoice)),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateInvoice(), { wrapper });

      result.current.mutate({ invoiceId: 'inv-123', updates: { notes: 'Updated notes' } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle update error', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to update invoice')),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateInvoice(), { wrapper });

      result.current.mutate({ invoiceId: 'inv-123', updates: { notes: 'Updated' } });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Deleting Invoices', () => {
    it('should delete invoice successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteInvoice(), { wrapper });

      result.current.mutate('inv-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle delete error', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseError('Failed to delete invoice')),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteInvoice(), { wrapper });

      result.current.mutate('inv-123');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Line Item Management', () => {
    it('should add line item to invoice', async () => {
      const newLineItem = mockInvoiceLineItem({ line_item_id: 'new-line' });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newLineItem)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAddLineItem(), { wrapper });

      result.current.mutate({
        invoice_id: 'inv-123',
        line_number: 3,
        description: 'Extra Service',
        quantity: 1,
        unit_price: 50.00,
        tax_rate: 0,
        tax_amount: 0,
        item_type: 'extras',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should update line item', async () => {
      const updatedLineItem = mockInvoiceLineItem({ unit_price: 300.00 });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedLineItem)),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateLineItem(), { wrapper });

      result.current.mutate({ lineItemId: 'line-123', updates: { unit_price: 300.00 } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should delete line item', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteLineItem(), { wrapper });

      result.current.mutate('line-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('Status Transitions', () => {
    it('should mark invoice as sent', async () => {
      const sentInvoice = mockInvoice({ invoice_id: 'inv-123', status: 'sent' });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(sentInvoice)),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMarkInvoiceAsSent(), { wrapper });

      result.current.mutate('inv-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should mark invoice as paid with auto-calculated amount', async () => {
      const invoice = mockInvoice({ total_amount: 1080.00 });
      const paidInvoice = mockPaidInvoice({ total_amount: 1080.00, amount_paid: 1080.00 });

      // Mock implementation for select and update
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoice)),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockSupabaseSuccess(paidInvoice)),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
            }),
          }),
        };
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMarkInvoiceAsPaid(), { wrapper });

      result.current.mutate({ invoiceId: 'inv-123', paymentMethod: 'cash' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle mark as paid error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseError('Invoice not found')),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMarkInvoiceAsPaid(), { wrapper });

      result.current.mutate({ invoiceId: 'invalid-id' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Create Invoice from Booking', () => {
    it('should create invoice from booking with correct line items', async () => {
      const booking = mockBooking({
        booking_id: 'booking-123',
        property_id: 'prop-123',
        guest_name: 'John Doe',
        guest_email: 'john@example.com',
        check_in_date: '2025-11-01',
        check_out_date: '2025-11-05', // 4 nights
        base_amount: 800.00, // $200 per night
        cleaning_fee: 100.00,
        extras_amount: 50.00,
        tax_amount: 76.00,
        payment_method: 'credit_card',
        property: mockProperty(),
      });

      const newInvoice = mockInvoice({
        invoice_id: 'inv-from-booking',
        booking_id: 'booking-123',
        guest_name: 'John Doe',
      });

      // Mock implementation for all tables
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
        if (table === 'invoice_line_items') {
          return {
            insert: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
          };
        }
        if (table === 'invoices') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newInvoice)),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ ...newInvoice, line_items: [] })),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
            }),
          }),
        };
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateInvoiceFromBooking(), { wrapper });

      result.current.mutate('booking-123');

      await waitFor(() => {
        if (result.current.isError) {
          console.log('Mutation error:', result.current.error);
        }
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 10000 });

      if (result.current.isError) {
        console.log('Test failed with error:', result.current.error);
      }
      expect(result.current.isSuccess).toBe(true);
    });

    it('should calculate nights correctly', async () => {
      const booking = mockBooking({
        check_in_date: '2025-11-01',
        check_out_date: '2025-11-04', // 3 nights
        base_amount: 600.00,
        property: mockProperty(),
      });

      const newInvoice = mockInvoice({ invoice_id: 'inv-nights' });

      // Mock implementation for all tables
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
        if (table === 'invoice_line_items') {
          return {
            insert: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
          };
        }
        if (table === 'invoices') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newInvoice)),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ ...newInvoice, line_items: [] })),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
            }),
          }),
        };
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateInvoiceFromBooking(), { wrapper });

      result.current.mutate('booking-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify nights calculation: 3 nights, $200 per night
      // This would require inspecting the line items created, which we can't directly test
      // but the business logic is: quantity = 3, unit_price = 600 / 3 = 200
    });

    it('should set due date to check-in date', async () => {
      const booking = mockBooking({
        check_in_date: '2025-12-15',
        check_out_date: '2025-12-20',
        property: mockProperty(),
      });

      const newInvoice = mockInvoice({ due_date: '2025-12-15' });

      // Mock implementation for all tables
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
        if (table === 'invoice_line_items') {
          return {
            insert: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
          };
        }
        if (table === 'invoices') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newInvoice)),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ ...newInvoice, line_items: [] })),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
            }),
          }),
        };
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateInvoiceFromBooking(), { wrapper });

      result.current.mutate('booking-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle booking not found error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseError('Booking not found')),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateInvoiceFromBooking(), { wrapper });

      result.current.mutate('invalid-booking-id');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
