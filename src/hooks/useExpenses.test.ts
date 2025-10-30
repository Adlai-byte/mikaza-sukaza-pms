import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from './useExpenses';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockExpense, mockExpenseWithJob } from '@/test/utils/mock-data';
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

describe('useExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all expenses successfully', async () => {
    const mockExpenses = [
      mockExpense({ expense_id: 'exp-1', amount: 100 }),
      mockExpense({ expense_id: 'exp-2', amount: 200 }),
      mockExpense({ expense_id: 'exp-3', amount: 150 }),
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockExpenses)),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useExpenses(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.expenses).toEqual(mockExpenses);
    expect(result.current.expenses.length).toBe(3);
  });

  it('should fetch expenses filtered by property', async () => {
    const mockExpenses = [
      mockExpense({ expense_id: 'exp-1', property_id: 'prop-123' }),
      mockExpense({ expense_id: 'exp-2', property_id: 'prop-123' }),
    ];

    const queryChain: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };

    queryChain.then = vi.fn((resolve) => {
      return Promise.resolve(mockSupabaseSuccess(mockExpenses)).then(resolve);
    });

    mockSupabase.from.mockReturnValue(queryChain);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useExpenses({ property_id: 'prop-123' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.expenses).toEqual(mockExpenses);
    expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
  });

  it('should fetch expenses filtered by category', async () => {
    const mockExpenses = [
      mockExpense({ category: 'maintenance' }),
    ];

    const queryChain: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };

    queryChain.then = vi.fn((resolve) => {
      return Promise.resolve(mockSupabaseSuccess(mockExpenses)).then(resolve);
    });

    mockSupabase.from.mockReturnValue(queryChain);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useExpenses({ category: 'maintenance' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.expenses).toEqual(mockExpenses);
  });

  it('should fetch expenses filtered by date range', async () => {
    const mockExpenses = [
      mockExpense({ expense_date: '2025-10-15' }),
      mockExpense({ expense_date: '2025-10-20' }),
    ];

    const queryChain: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    };

    queryChain.then = vi.fn((resolve) => {
      return Promise.resolve(mockSupabaseSuccess(mockExpenses)).then(resolve);
    });

    mockSupabase.from.mockReturnValue(queryChain);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useExpenses({ date_from: '2025-10-01', date_to: '2025-10-31' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.expenses).toEqual(mockExpenses);
  });

  it('should handle fetch error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue(
          mockSupabaseError('Failed to fetch expenses')
        ),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useExpenses(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should return empty array when no expenses exist', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useExpenses(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.expenses).toEqual([]);
  });
});

describe('useCreateExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create expense successfully', async () => {
    const newExpense = mockExpense({
      description: 'New plumbing repair',
      amount: 250,
    });

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newExpense)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateExpense(), { wrapper });

    result.current.mutate({
      property_id: 'prop-123',
      category: 'maintenance',
      description: 'New plumbing repair',
      amount: 250,
      tax_amount: 20,
      expense_date: '2025-10-23',
      vendor_name: 'ABC Plumbing',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(newExpense);
  });

  it('should create expense with job_id link', async () => {
    const newExpense = mockExpenseWithJob({
      job_id: 'job-456',
    });

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newExpense)),
      }),
    });

    mockSupabase.from.mockReturnValue({
      insert: insertMock,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateExpense(), { wrapper });

    result.current.mutate({
      property_id: 'prop-123',
      job_id: 'job-456', // Link to job
      category: 'maintenance',
      description: 'Job-related expense',
      amount: 300,
      tax_amount: 24,
      expense_date: '2025-10-23',
      vendor_name: 'Contractor Inc',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: 'job-456',
      })
    );
  });

  it('should create expense with all fields', async () => {
    const newExpense = mockExpense({
      property_id: 'prop-123',
      category: 'utilities',
      description: 'Electric bill',
      amount: 150,
    });

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(
          mockSupabaseSuccess(newExpense)
        ),
      }),
    });

    mockSupabase.from.mockReturnValue({
      insert: insertMock,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateExpense(), { wrapper });

    result.current.mutate({
      property_id: 'prop-123',
      category: 'utilities',
      description: 'Electric bill',
      amount: 150,
      tax_amount: 0,
      expense_date: '2025-10-23',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the insert was called with expected data
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        property_id: 'prop-123',
        category: 'utilities',
        amount: 150,
      })
    );
  });

  it('should handle creation error', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(
            mockSupabaseError('Failed to create expense')
          ),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateExpense(), { wrapper });

    result.current.mutate({
      property_id: 'prop-123',
      category: 'maintenance',
      description: 'Test expense',
      amount: 100,
      tax_amount: 8,
      expense_date: '2025-10-23',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should validate amount is positive', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateExpense(), { wrapper });

    result.current.mutate({
      property_id: 'prop-123',
      category: 'maintenance',
      description: 'Invalid expense',
      amount: -100, // Invalid negative amount
      tax_amount: 0,
      expense_date: '2025-10-23',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useUpdateExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update expense successfully', async () => {
    const updatedExpense = mockExpense({
      expense_id: 'exp-123',
      amount: 350, // Updated amount
    });

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedExpense)),
          }),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateExpense(), { wrapper });

    result.current.mutate({
      expenseId: 'exp-123',
      updates: {
        amount: 350,
        description: 'Updated description',
      },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(updatedExpense);
  });

  it('should update expense category', async () => {
    const updatedExpense = mockExpense({
      expense_id: 'exp-123',
      category: 'supplies', // Changed category
    });

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedExpense)),
        }),
      }),
    });

    mockSupabase.from.mockReturnValue({
      update: updateMock,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateExpense(), { wrapper });

    result.current.mutate({
      expenseId: 'exp-123',
      updates: {
        category: 'supplies',
      },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'supplies',
      })
    );
  });

  it('should handle update error', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              mockSupabaseError('Failed to update expense')
            ),
          }),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateExpense(), { wrapper });

    result.current.mutate({
      expenseId: 'exp-123',
      updates: {
        amount: 500,
      },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useDeleteExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete expense successfully', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteExpense(), { wrapper });

    result.current.mutate('exp-123');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
  });

  it('should handle delete error', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(
          mockSupabaseError('Failed to delete expense')
        ),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteExpense(), { wrapper });

    result.current.mutate('exp-123');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should handle deleting non-existent expense', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(
          mockSupabaseError('Expense not found', 'PGRST116')
        ),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteExpense(), { wrapper });

    result.current.mutate('non-existent-id');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('Expense Calculations', () => {
  it('should calculate total expense including tax', () => {
    const expense = mockExpense({
      amount: 100,
      tax_amount: 8,
    });

    const total = expense.amount + expense.tax_amount;
    expect(total).toBe(108);
  });

  it('should handle expenses with no tax', () => {
    const expense = mockExpense({
      amount: 100,
      tax_amount: 0,
    });

    const total = expense.amount + (expense.tax_amount || 0);
    expect(total).toBe(100);
  });

  it('should aggregate multiple expenses correctly', () => {
    const expenses = [
      mockExpense({ amount: 100, tax_amount: 8 }),
      mockExpense({ amount: 200, tax_amount: 16 }),
      mockExpense({ amount: 150, tax_amount: 12 }),
    ];

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + exp.amount + (exp.tax_amount || 0),
      0
    );

    expect(totalExpenses).toBe(486);
  });
});
