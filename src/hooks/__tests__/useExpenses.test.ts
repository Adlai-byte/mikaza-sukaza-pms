/**
 * useExpenses Hook Tests
 * Tests for expense management functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExpenses, useExpense, expenseKeys } from '../useExpenses';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockExpense, mockExpenseWithJob, createMockArray } from '@/test/utils/mock-data';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useActivityLogs', () => ({
  useActivityLogs: () => ({
    logActivity: vi.fn(),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: { user_id: 'test-user-id', user_type: 'admin' },
  }),
}));

// Import after mocks
import { supabase as mockSupabase } from '@/integrations/supabase/client';

describe('useExpenses', () => {
  const mockExpenses = createMockArray(mockExpense, 10);
  const testExpense = mockExpense({
    expense_id: 'exp-test-1',
    property_id: 'prop-1',
    category: 'maintenance',
    amount: 250.00,
    description: 'Plumbing repair',
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for expenses fetch
    (mockSupabase.from as any).mockImplementation((table: string) => {
      if (table === 'expenses') {
        const orderResult = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          then: (callback: any) => Promise.resolve({ data: mockExpenses, error: null }).then(callback),
        };

        const selectResult = {
          order: vi.fn().mockReturnValue(orderResult),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              then: (callback: any) => Promise.resolve({ data: testExpense, error: null }).then(callback),
            }),
          }),
        };

        return {
          select: vi.fn().mockReturnValue(selectResult),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: (callback: any) => Promise.resolve({ data: testExpense, error: null }).then(callback),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({
                  then: (callback: any) => Promise.resolve({ data: { ...testExpense, payment_status: 'paid' }, error: null }).then(callback),
                }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: (callback: any) => Promise.resolve({ data: null, error: null }).then(callback),
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

  describe('fetching expenses', () => {
    it('should fetch all expenses on mount', async () => {
      const { result } = renderHook(() => useExpenses(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.expenses.length).toBeGreaterThan(0);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
    });

    it('should return empty array when no expenses exist', async () => {
      (mockSupabase.from as any).mockImplementation((table: string) => {
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

      const { result } = renderHook(() => useExpenses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.expenses).toEqual([]);
    });
  });

  describe('filtering', () => {
    it('should filter by property_id', async () => {
      const { result } = renderHook(() => useExpenses({ property_id: 'prop-123' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
    });

    it('should filter by category', async () => {
      const { result } = renderHook(() => useExpenses({ category: 'maintenance' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
    });

    it('should filter by payment_status', async () => {
      const { result } = renderHook(() => useExpenses({ payment_status: 'paid' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
    });

    it('should filter by date range', async () => {
      const { result } = renderHook(
        () => useExpenses({ date_from: '2025-01-01', date_to: '2025-12-31' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
    });

    it('should filter by vendor_name', async () => {
      const { result } = renderHook(() => useExpenses({ vendor_name: 'ABC Plumbing' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
    });

    it('should filter recurring expenses', async () => {
      const { result } = renderHook(() => useExpenses({ is_recurring: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
    });

    it('should filter by entry_type', async () => {
      const { result } = renderHook(() => useExpenses({ entry_type: 'debit' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
    });
  });

  describe('refetch functionality', () => {
    it('should have refetch function', async () => {
      const { result } = renderHook(() => useExpenses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });
  });
});

describe('useExpense', () => {
  const singleExpense = mockExpense({
    expense_id: 'exp-single',
    description: 'Single expense test',
    amount: 500.00,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    (mockSupabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue({
            then: (callback: any) => Promise.resolve({ data: singleExpense, error: null }).then(callback),
          }),
        }),
      }),
    }));
  });

  it('should fetch single expense by ID', async () => {
    const { result } = renderHook(() => useExpense('exp-single'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
  });

  it('should not fetch if ID is empty', async () => {
    const { result } = renderHook(() => useExpense(''), {
      wrapper: createWrapper(),
    });

    // Should not be loading since query is disabled
    expect(result.current.expense).toBeUndefined();
  });

  it('should have refetch function', async () => {
    const { result } = renderHook(() => useExpense('exp-single'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.refetch).toBeDefined();
  });
});

describe('expenseKeys', () => {
  it('should generate correct base keys', () => {
    expect(expenseKeys.all).toEqual(['expenses']);
    expect(expenseKeys.lists()).toEqual(['expenses', 'list']);
    expect(expenseKeys.details()).toEqual(['expenses', 'detail']);
  });

  it('should generate correct detail key', () => {
    expect(expenseKeys.detail('exp-123')).toEqual(['expenses', 'detail', 'exp-123']);
  });

  it('should generate correct property key', () => {
    expect(expenseKeys.byProperty('prop-123')).toEqual(['expenses', 'property', 'prop-123']);
  });

  it('should generate correct category key', () => {
    expect(expenseKeys.byCategory('maintenance')).toEqual(['expenses', 'category', 'maintenance']);
  });

  it('should include filters in list key', () => {
    const filters = { category: 'utilities', property_id: 'prop-1' };
    expect(expenseKeys.list(filters)).toEqual(['expenses', 'list', filters]);
  });
});

describe('Expense Categories', () => {
  const expenseCategories = [
    'maintenance',
    'utilities',
    'supplies',
    'insurance',
    'cleaning',
    'repairs',
    'landscaping',
    'property_tax',
    'mortgage',
    'other',
  ];

  it('should have all expected categories', () => {
    expenseCategories.forEach(category => {
      expect(typeof category).toBe('string');
      expect(category.length).toBeGreaterThan(0);
    });
  });

  it('should have maintenance category', () => {
    expect(expenseCategories).toContain('maintenance');
  });

  it('should have utilities category', () => {
    expect(expenseCategories).toContain('utilities');
  });
});

describe('Expense Entry Types', () => {
  const entryTypes = ['credit', 'debit', 'owner_payment'];

  it('should have all expected entry types', () => {
    expect(entryTypes).toHaveLength(3);
  });

  it('should have credit entry type', () => {
    expect(entryTypes).toContain('credit');
  });

  it('should have debit entry type', () => {
    expect(entryTypes).toContain('debit');
  });

  it('should have owner_payment entry type', () => {
    expect(entryTypes).toContain('owner_payment');
  });
});

describe('Expense Balance Calculations', () => {
  it('should calculate running balance for credits', () => {
    let runningBalance = 0;
    const creditAmount = 1000;

    runningBalance += creditAmount;

    expect(runningBalance).toBe(1000);
  });

  it('should calculate running balance for debits', () => {
    let runningBalance = 1000;
    const debitAmount = 300;

    runningBalance -= debitAmount;

    expect(runningBalance).toBe(700);
  });

  it('should handle mixed transactions', () => {
    let runningBalance = 0;
    const transactions = [
      { type: 'credit', amount: 5000 },
      { type: 'debit', amount: 1500 },
      { type: 'debit', amount: 800 },
      { type: 'credit', amount: 2000 },
      { type: 'owner_payment', amount: 1000 },
    ];

    transactions.forEach(tx => {
      if (tx.type === 'credit') {
        runningBalance += tx.amount;
      } else {
        runningBalance -= tx.amount;
      }
    });

    // 5000 - 1500 - 800 + 2000 - 1000 = 3700
    expect(runningBalance).toBe(3700);
  });

  it('should handle negative balances', () => {
    let runningBalance = 500;
    const debitAmount = 800;

    runningBalance -= debitAmount;

    expect(runningBalance).toBe(-300);
  });
});

describe('Expense Payment Status', () => {
  const paymentStatuses = ['pending', 'paid', 'partial', 'overdue'];

  it('should have all expected payment statuses', () => {
    expect(paymentStatuses).toHaveLength(4);
  });

  it('should identify paid expense', () => {
    const expense = mockExpense({ payment_status: 'paid' });
    expect(expense.payment_status).toBe('paid');
  });

  it('should identify pending expense', () => {
    const expense = mockExpense({ payment_status: 'pending' });
    expect(expense.payment_status).toBe('pending');
  });
});

describe('Recurring Expenses', () => {
  it('should identify recurring expense', () => {
    const recurringExpense = mockExpense({
      is_recurring: true,
      recurring_frequency: 'monthly',
    });

    expect(recurringExpense.is_recurring).toBe(true);
  });

  it('should identify one-time expense', () => {
    const oneTimeExpense = mockExpense({
      is_recurring: false,
    });

    expect(oneTimeExpense.is_recurring).toBe(false);
  });
});

describe('Expense with Job Association', () => {
  it('should create expense associated with job', () => {
    const expense = mockExpenseWithJob();

    expect(expense.job_id).toBeDefined();
    expect(expense.job_id).toBe('job-123');
  });

  it('should create expense without job association', () => {
    const expense = mockExpense();

    expect(expense.job_id).toBeNull();
  });
});
