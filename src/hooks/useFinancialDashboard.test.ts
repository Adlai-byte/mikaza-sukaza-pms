import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useDashboardSummary,
  useRevenueByProperty,
  useExpensesByCategory,
  useFinancialOverTime,
} from './useFinancialDashboard';
import { createWrapper } from '@/test/utils/test-wrapper';
import {
  mockInvoice,
  mockPaidInvoice,
  mockExpense,
  mockProperty,
  mockDashboardSummary,
  mockRevenueByProperty,
  mockExpensesByCategory,
  mockFinancialOverTime,
} from '@/test/utils/mock-data';
import { mockSupabaseSuccess, mockSupabaseError } from '@/test/utils/supabase-mock';

// Mock AuthContext - Must be first
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', user_type: 'admin', is_active: true },
    session: { user: { id: 'user-123' }, access_token: 'mock-token' },
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock Supabase client - Must be defined inline for Vitest hoisting
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Import after mocking
import { supabase } from '@/integrations/supabase/client';
const mockSupabase = supabase as any;

describe('useDashboardSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate total revenue from paid invoices', async () => {
    const paidInvoices = [
      mockPaidInvoice({ total_amount: 1000, status: 'paid' }),
      mockPaidInvoice({ total_amount: 1500, status: 'paid' }),
      mockPaidInvoice({ total_amount: 2000, status: 'paid' }),
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(paidInvoices)),
            }),
          }),
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5 }),
          }),
        };
      }
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 3 }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDashboardSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.summary).toBeDefined();
    });

    // Total revenue should be sum of paid invoices
    expect(result.current.summary?.total_revenue).toBe(4500);
  });

  it('should exclude unpaid invoices from revenue calculation', async () => {
    const mixedInvoices = [
      mockPaidInvoice({ total_amount: 1000, status: 'paid' }),
      mockInvoice({ total_amount: 500, status: 'sent' }), // Not paid
      mockInvoice({ total_amount: 300, status: 'draft' }), // Not paid
      mockPaidInvoice({ total_amount: 1500, status: 'paid' }),
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(mixedInvoices)),
            }),
          }),
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5 }),
          }),
        };
      }
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 3 }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDashboardSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.summary).toBeDefined();
    });

    // Only paid invoices (1000 + 1500 = 2500)
    expect(result.current.summary?.total_revenue).toBe(2500);
  });

  it('should calculate total expenses including tax', async () => {
    const expenses = [
      mockExpense({ amount: 100, tax_amount: 8 }),
      mockExpense({ amount: 200, tax_amount: 16 }),
      mockExpense({ amount: 150, tax_amount: 12 }),
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(expenses)),
            }),
          }),
        };
      }
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5 }),
          }),
        };
      }
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 3 }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDashboardSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.summary).toBeDefined();
    });

    // Total expenses: (100+8) + (200+16) + (150+12) = 486
    expect(result.current.summary?.total_expenses).toBe(486);
  });

  it('should calculate net income correctly', async () => {
    const paidInvoices = [
      mockPaidInvoice({ total_amount: 5000 }),
    ];
    const expenses = [
      mockExpense({ amount: 1000, tax_amount: 80 }),
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(paidInvoices)),
            }),
          }),
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(expenses)),
            }),
          }),
        };
      }
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5 }),
          }),
        };
      }
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 3 }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDashboardSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.summary).toBeDefined();
    });

    // Net income: 5000 - 1080 = 3920
    expect(result.current.summary?.net_income).toBe(3920);
  });

  it('should count invoices by status correctly', async () => {
    const invoices = [
      mockPaidInvoice({ status: 'paid' }),
      mockPaidInvoice({ status: 'paid' }),
      mockInvoice({ status: 'sent' }),
      mockInvoice({ status: 'draft' }),
      mockInvoice({ status: 'overdue' }),
      mockInvoice({ status: 'overdue' }),
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoices)),
            }),
          }),
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5 }),
          }),
        };
      }
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 3 }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDashboardSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.summary).toBeDefined();
    });

    expect(result.current.summary?.total_invoices).toBe(6);
    expect(result.current.summary?.paid_invoices).toBe(2);
    expect(result.current.summary?.pending_invoices).toBe(2); // sent + draft
    expect(result.current.summary?.overdue_invoices).toBe(2);
  });

  it('should use default date range when no dates provided', async () => {
    const gteMock = vi.fn().mockReturnThis();
    const lteMock = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        gte: gteMock.mockReturnValue({
          lte: lteMock,
        }),
      }),
    }));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDashboardSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify gte/lte were called (indicating date range was applied)
    expect(gteMock).toHaveBeenCalled();
    expect(lteMock).toHaveBeenCalled();
  });
});

describe('useRevenueByProperty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should group revenue by property correctly', async () => {
    const invoicesWithProperty = [
      {
        total_amount: 1000,
        status: 'paid',
        paid_date: '2025-10-10',
        property: { property_id: 'prop-1', property_name: 'Sunset Villa' },
      },
      {
        total_amount: 1500,
        status: 'paid',
        paid_date: '2025-10-15',
        property: { property_id: 'prop-1', property_name: 'Sunset Villa' },
      },
      {
        total_amount: 800,
        status: 'paid',
        paid_date: '2025-10-20',
        property: { property_id: 'prop-2', property_name: 'Beach House' },
      },
    ];

    const bookings = [
      { property_id: 'prop-1', check_in_date: '2025-10-01', check_out_date: '2025-10-05' },
      { property_id: 'prop-1', check_in_date: '2025-10-15', check_out_date: '2025-10-18' },
      { property_id: 'prop-2', check_in_date: '2025-10-10', check_out_date: '2025-10-12' },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoicesWithProperty)),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(bookings)),
              }),
            }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRevenueByProperty(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Property 1 should have revenue of 2500 (1000 + 1500)
    const prop1 = result.current.revenueByProperty.find(p => p.property_id === 'prop-1');
    expect(prop1?.revenue).toBe(2500);
    expect(prop1?.invoice_count).toBe(2);

    // Property 2 should have revenue of 800
    const prop2 = result.current.revenueByProperty.find(p => p.property_id === 'prop-2');
    expect(prop2?.revenue).toBe(800);
    expect(prop2?.invoice_count).toBe(1);
  });

  it('should sort properties by revenue descending', async () => {
    const invoicesWithProperty = [
      {
        total_amount: 500,
        status: 'paid',
        paid_date: '2025-10-10',
        property: { property_id: 'prop-1', property_name: 'Low Revenue' },
      },
      {
        total_amount: 3000,
        status: 'paid',
        paid_date: '2025-10-10',
        property: { property_id: 'prop-2', property_name: 'High Revenue' },
      },
      {
        total_amount: 1500,
        status: 'paid',
        paid_date: '2025-10-10',
        property: { property_id: 'prop-3', property_name: 'Medium Revenue' },
      },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoicesWithProperty)),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
              }),
            }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRevenueByProperty(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should be sorted highest to lowest
    expect(result.current.revenueByProperty[0].revenue).toBe(3000);
    expect(result.current.revenueByProperty[1].revenue).toBe(1500);
    expect(result.current.revenueByProperty[2].revenue).toBe(500);
  });

  it('should calculate occupancy days correctly', async () => {
    const invoicesWithProperty = [
      {
        total_amount: 1000,
        status: 'paid',
        paid_date: '2025-10-10',
        property: { property_id: 'prop-1', property_name: 'Test Property' },
      },
    ];

    // 4 nights + 3 nights = 7 nights total occupancy
    const bookings = [
      { property_id: 'prop-1', check_in_date: '2025-10-01', check_out_date: '2025-10-05' }, // 4 nights
      { property_id: 'prop-1', check_in_date: '2025-10-10', check_out_date: '2025-10-13' }, // 3 nights
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoicesWithProperty)),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(bookings)),
              }),
            }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRevenueByProperty(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.revenueByProperty[0].occupancy_days).toBe(7);
  });

  it('should handle properties with no revenue', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
                }),
              }),
            }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRevenueByProperty(), { wrapper });

    await waitFor(() => {
      expect(result.current.revenueByProperty).toBeDefined();
    });

    expect(result.current.revenueByProperty).toEqual([]);
  });
});

describe('useExpensesByCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should group expenses by category', async () => {
    const expenses = [
      mockExpense({ category: 'maintenance', amount: 100, tax_amount: 8 }),
      mockExpense({ category: 'maintenance', amount: 200, tax_amount: 16 }),
      mockExpense({ category: 'utilities', amount: 150, tax_amount: 12 }),
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(expenses)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useExpensesByCategory(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const maintenance = result.current.expensesByCategory.find(c => c.category === 'maintenance');
    expect(maintenance?.amount).toBe(324); // (100+8) + (200+16)
    expect(maintenance?.count).toBe(2);

    const utilities = result.current.expensesByCategory.find(c => c.category === 'utilities');
    expect(utilities?.amount).toBe(162); // 150 + 12
    expect(utilities?.count).toBe(1);
  });

  it('should calculate percentages correctly', async () => {
    const expenses = [
      mockExpense({ category: 'maintenance', amount: 300, tax_amount: 0 }),
      mockExpense({ category: 'utilities', amount: 200, tax_amount: 0 }),
      mockExpense({ category: 'supplies', amount: 100, tax_amount: 0 }),
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(expenses)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useExpensesByCategory(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Total: 600, so percentages should be 50%, 33.33%, 16.67%
    const maintenance = result.current.expensesByCategory.find(c => c.category === 'maintenance');
    expect(maintenance?.percentage).toBeCloseTo(50, 1);

    const utilities = result.current.expensesByCategory.find(c => c.category === 'utilities');
    expect(utilities?.percentage).toBeCloseTo(33.33, 1);

    const supplies = result.current.expensesByCategory.find(c => c.category === 'supplies');
    expect(supplies?.percentage).toBeCloseTo(16.67, 1);
  });

  it('should sort by amount descending', async () => {
    const expenses = [
      mockExpense({ category: 'low', amount: 100, tax_amount: 0 }),
      mockExpense({ category: 'high', amount: 500, tax_amount: 0 }),
      mockExpense({ category: 'medium', amount: 300, tax_amount: 0 }),
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(expenses)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useExpensesByCategory(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.expensesByCategory[0].amount).toBe(500);
    expect(result.current.expensesByCategory[1].amount).toBe(300);
    expect(result.current.expensesByCategory[2].amount).toBe(100);
  });
});

describe('useFinancialOverTime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate revenue and expenses by month', async () => {
    const invoices = [
      { total_amount: 1000, paid_date: '2025-01-15', status: 'paid' },
      { total_amount: 1500, paid_date: '2025-01-20', status: 'paid' },
      { total_amount: 2000, paid_date: '2025-02-10', status: 'paid' },
    ];

    const expenses = [
      { amount: 300, tax_amount: 24, expense_date: '2025-01-05' },
      { amount: 200, tax_amount: 16, expense_date: '2025-02-08' },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoices)),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(expenses)),
            }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFinancialOverTime(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const jan = result.current.financialOverTime.find(m => m.month === '2025-01');
    expect(jan?.revenue).toBe(2500); // 1000 + 1500
    expect(jan?.expenses).toBe(324); // 300 + 24
    expect(jan?.net_income).toBe(2176); // 2500 - 324

    const feb = result.current.financialOverTime.find(m => m.month === '2025-02');
    expect(feb?.revenue).toBe(2000);
    expect(feb?.expenses).toBe(216); // 200 + 16
    expect(feb?.net_income).toBe(1784); // 2000 - 216
  });

  it('should sort months chronologically', async () => {
    const invoices = [
      { total_amount: 1000, paid_date: '2025-03-15', status: 'paid' },
      { total_amount: 1000, paid_date: '2025-01-15', status: 'paid' },
      { total_amount: 1000, paid_date: '2025-02-15', status: 'paid' },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue(mockSupabaseSuccess(invoices)),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFinancialOverTime(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.financialOverTime[0].month).toBe('2025-01');
    expect(result.current.financialOverTime[1].month).toBe('2025-02');
    expect(result.current.financialOverTime[2].month).toBe('2025-03');
  });
});
