import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Expense, ExpenseInsert } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLogs } from '@/hooks/useActivityLogs';

// Query keys
export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (filters?: ExpenseFilters) => [...expenseKeys.lists(), filters] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
  byProperty: (propertyId: string) => [...expenseKeys.all, 'property', propertyId] as const,
  byCategory: (category: string) => [...expenseKeys.all, 'category', category] as const,
};

export interface ExpenseFilters {
  property_id?: string;
  category?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  vendor_name?: string;
  is_recurring?: boolean;
  entry_type?: 'credit' | 'debit' | 'owner_payment';
  is_scheduled?: boolean;
  is_paid?: boolean;
}

// Fetch all expenses with filters
const fetchExpenses = async (filters?: ExpenseFilters): Promise<Expense[]> => {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      property:properties(property_id, property_name),
      vendor:service_providers(provider_id, company_name, phone_primary, email)
    `)
    .order('expense_date', { ascending: false });

  if (filters?.property_id) {
    query = query.eq('property_id', filters.property_id);
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.payment_status) {
    query = query.eq('payment_status', filters.payment_status);
  }

  if (filters?.date_from) {
    query = query.gte('expense_date', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('expense_date', filters.date_to);
  }

  if (filters?.vendor_name) {
    query = query.ilike('vendor_name', `%${filters.vendor_name}%`);
  }

  if (filters?.is_recurring !== undefined) {
    query = query.eq('is_recurring', filters.is_recurring);
  }

  if (filters?.entry_type) {
    query = query.eq('entry_type', filters.entry_type);
  }

  if (filters?.is_scheduled !== undefined) {
    query = query.eq('is_scheduled', filters.is_scheduled);
  }

  if (filters?.is_paid !== undefined) {
    query = query.eq('is_paid', filters.is_paid);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Expense[];
};

// Fetch single expense by ID
const fetchExpense = async (expenseId: string): Promise<Expense> => {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      property:properties(property_id, property_name, location:property_location(*)),
      vendor:service_providers(provider_id, company_name, phone_primary, email, address, city, state)
    `)
    .eq('expense_id', expenseId)
    .single();

  if (error) throw error;
  return data as Expense;
};

// Create expense
const createExpense = async (expense: ExpenseInsert): Promise<Expense> => {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
};

// Update expense
const updateExpense = async ({ expenseId, updates }: { expenseId: string; updates: Partial<Expense> }): Promise<Expense> => {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('expense_id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
};

// Delete expense
const deleteExpense = async (expenseId: string): Promise<{ expenseId: string; expense: any }> => {
  // Fetch expense details before deleting for logging
  const { data: expense } = await supabase
    .from('expenses')
    .select('expense_id, description, amount, category, vendor_name, property_id')
    .eq('expense_id', expenseId)
    .single();

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('expense_id', expenseId);

  if (error) throw error;
  return { expenseId, expense };
};

// Mark expense as paid
const markExpenseAsPaid = async ({ expenseId, paymentMethod, paidDate }: { expenseId: string; paymentMethod?: string; paidDate?: string }): Promise<Expense> => {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      payment_status: 'paid',
      paid_date: paidDate || new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
    })
    .eq('expense_id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
};

// Get expense summary by category
const fetchExpenseSummaryByCategory = async (propertyId?: string, dateFrom?: string, dateTo?: string) => {
  let query = supabase
    .from('expense_summary_by_category')
    .select('*')
    .order('month', { ascending: false });

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  if (dateFrom) {
    query = query.gte('month', dateFrom);
  }

  if (dateTo) {
    query = query.lte('month', dateTo);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

// Get recurring expenses
const fetchRecurringExpenses = async (propertyId?: string): Promise<Expense[]> => {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      property:properties(property_id, property_name),
      vendor:service_providers(provider_id, company_name, phone_primary)
    `)
    .eq('is_recurring', true)
    .order('expense_date', { ascending: false });

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Expense[];
};

// Hooks
export function useExpenses(filters?: ExpenseFilters) {
  const { data: expenses = [], isLoading, error, refetch } = useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: () => fetchExpenses(filters),
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    expenses,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useExpense(expenseId: string) {
  const { data: expense, isLoading, error, refetch } = useQuery({
    queryKey: expenseKeys.detail(expenseId),
    queryFn: () => fetchExpense(expenseId),
    enabled: !!expenseId,
    staleTime: 30 * 1000,
  });

  return {
    expense,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useCreateExpense() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExpense,
    onSuccess: (data) => {
      // Use 'all' to refresh all queries regardless of active state
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists(), refetchType: 'all' });
      // Also invalidate financial summary and property detail
      queryClient.invalidateQueries({ queryKey: ['financial-summary'], refetchType: 'all' });
      if (data?.property_id) {
        queryClient.invalidateQueries({
          queryKey: ['properties', 'detail', data.property_id],
          refetchType: 'all'
        });
      }
      toast({
        title: 'Success',
        description: 'Expense created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create expense',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateExpense() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateExpense,
    onSuccess: (data) => {
      // Use 'all' to refresh all queries regardless of active state
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(data.expense_id!), refetchType: 'all' });
      // Also invalidate financial summary and property detail
      queryClient.invalidateQueries({ queryKey: ['financial-summary'], refetchType: 'all' });
      if (data?.property_id) {
        queryClient.invalidateQueries({
          queryKey: ['properties', 'detail', data.property_id],
          refetchType: 'all'
        });
      }
      toast({
        title: 'Success',
        description: 'Expense updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update expense',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteExpense() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: ({ expenseId, expense }) => {
      // Log the delete action
      logActivity('expense_deleted', {
        expense_id: expenseId,
        description: expense?.description || 'Unknown Expense',
        amount: expense?.amount,
        category: expense?.category,
        vendor_name: expense?.vendor_name,
        property_id: expense?.property_id,
      });

      // Use 'all' to refresh all queries regardless of active state
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists(), refetchType: 'all' });
      // Also invalidate financial summary and property detail
      queryClient.invalidateQueries({ queryKey: ['financial-summary'], refetchType: 'all' });
      if (expense?.property_id) {
        queryClient.invalidateQueries({
          queryKey: ['properties', 'detail', expense.property_id],
          refetchType: 'all'
        });
      }
      toast({
        title: 'Success',
        description: 'Expense deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete expense',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkExpenseAsPaid() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markExpenseAsPaid,
    onSuccess: (data) => {
      // Use 'all' to refresh all queries regardless of active state
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(data.expense_id!), refetchType: 'all' });
      // Also invalidate financial summary
      queryClient.invalidateQueries({ queryKey: ['financial-summary'], refetchType: 'all' });
      if (data?.property_id) {
        queryClient.invalidateQueries({
          queryKey: ['properties', 'detail', data.property_id],
          refetchType: 'all'
        });
      }
      toast({
        title: 'Success',
        description: 'Expense marked as paid',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark expense as paid',
        variant: 'destructive',
      });
    },
  });
}

export function useExpenseSummaryByCategory(propertyId?: string, dateFrom?: string, dateTo?: string) {
  const { data: summary = [], isLoading, error } = useQuery({
    queryKey: [...expenseKeys.all, 'summary', 'category', propertyId, dateFrom, dateTo],
    queryFn: () => fetchExpenseSummaryByCategory(propertyId, dateFrom, dateTo),
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    summary,
    loading: isLoading,
    error,
  };
}

export function useRecurringExpenses(propertyId?: string) {
  const { data: recurringExpenses = [], isLoading, error } = useQuery({
    queryKey: [...expenseKeys.all, 'recurring', propertyId],
    queryFn: () => fetchRecurringExpenses(propertyId),
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    recurringExpenses,
    loading: isLoading,
    error,
  };
}

// Mark financial entry as done (paid)
const markEntryAsDone = async (expenseId: string): Promise<Expense> => {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      is_paid: true,
      paid_at: new Date().toISOString(),
    })
    .eq('expense_id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
};

export function useMarkEntryAsDone() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markEntryAsDone,
    // Optimistic update for instant UI feedback
    onMutate: async (expenseId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: expenseKeys.lists() });

      // Snapshot previous values for rollback
      const previousData = queryClient.getQueriesData({ queryKey: expenseKeys.lists() });

      // Optimistically update all expense lists
      queryClient.setQueriesData({ queryKey: expenseKeys.lists() }, (old: Expense[] | undefined) => {
        if (!old) return old;
        return old.map((expense) =>
          expense.expense_id === expenseId
            ? { ...expense, is_paid: true, paid_at: new Date().toISOString() }
            : expense
        );
      });

      return { previousData };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark entry as done',
        variant: 'destructive',
      });
    },
    onSettled: (data) => {
      // Always refetch after mutation to ensure consistency
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      if (data?.property_id) {
        queryClient.invalidateQueries({ queryKey: expenseKeys.byProperty(data.property_id) });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Entry marked as done',
      });
    },
  });
}

// Approve an entry (for reports visibility)
const approveEntry = async ({
  expenseId,
  approvedBy,
}: {
  expenseId: string;
  approvedBy: string;
}): Promise<Expense> => {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      is_approved: true,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('expense_id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
};

export function useApproveEntry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveEntry,
    // Optimistic update for instant UI feedback
    onMutate: async ({ expenseId, approvedBy }) => {
      // Cancel any outgoing refetches for all expense queries
      await queryClient.cancelQueries({ queryKey: expenseKeys.all });

      // Snapshot previous values for rollback (all expense-related queries)
      const previousData = queryClient.getQueriesData({ queryKey: expenseKeys.all });

      // Helper function to update expense in array
      const updateExpenseInArray = (old: Expense[] | undefined) => {
        if (!old) return old;
        return old.map((expense) =>
          expense.expense_id === expenseId
            ? { ...expense, is_approved: true, approved_by: approvedBy, approved_at: new Date().toISOString() }
            : expense
        );
      };

      // Optimistically update ALL expense queries (lists, property-specific, financial entries)
      queryClient.setQueriesData({ queryKey: expenseKeys.all }, updateExpenseInArray);

      return { previousData };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve entry',
        variant: 'destructive',
      });
    },
    onSettled: (data) => {
      // Always refetch after mutation to ensure consistency
      queryClient.invalidateQueries({ queryKey: expenseKeys.all, refetchType: 'all' });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Entry approved for reports',
      });
    },
  });
}

// Fetch financial entries for a property with balance calculation
const fetchPropertyFinancialEntries = async (
  propertyId: string,
  month?: number,
  year?: number
): Promise<Expense[]> => {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      property:properties(property_id, property_name),
      vendor:service_providers(provider_id, company_name),
      expense_attachments(attachment_id),
      expense_notes(note_id)
    `)
    .eq('property_id', propertyId)
    .order('expense_date', { ascending: true });

  // Filter by month/year if provided
  if (month !== undefined && year !== undefined) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // Calculate last day of month without timezone issues
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('expense_date', startDate).lte('expense_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Calculate running balance and compute counts
  const entries = (data || []) as any[];
  let runningBalance = 0;

  return entries.map((entry) => {
    const amount = entry.amount || 0;
    if (entry.entry_type === 'credit') {
      runningBalance += amount;
    } else {
      // debit or owner_payment
      runningBalance -= amount;
    }

    return {
      ...entry,
      running_balance: runningBalance,
      attachment_count: entry.expense_attachments?.length || 0,
      note_count: entry.expense_notes?.length || 0,
    };
  });
};

// Calculate schedule balance (including future scheduled entries)
const calculateScheduleBalance = (entries: Expense[], month: number, year: number): number => {
  let balance = 0;

  entries.forEach((entry) => {
    const amount = entry.amount || 0;

    // Include actual entries
    if (!entry.is_scheduled) {
      if (entry.entry_type === 'credit') {
        balance += amount;
      } else {
        balance -= amount;
      }
    } else {
      // Include scheduled entries for this month
      const scheduledMonths = entry.scheduled_months || [];
      if (scheduledMonths.includes(month)) {
        if (entry.entry_type === 'credit') {
          balance += amount;
        } else {
          balance -= amount;
        }
      }
    }
  });

  return balance;
};

export function usePropertyFinancialEntries(propertyId: string, month?: number, year?: number) {
  const currentDate = new Date();
  const selectedMonth = month ?? currentDate.getMonth() + 1;
  const selectedYear = year ?? currentDate.getFullYear();

  const { data: entries = [], isLoading, error, refetch } = useQuery({
    queryKey: [...expenseKeys.byProperty(propertyId), 'financial', selectedMonth, selectedYear],
    queryFn: () => fetchPropertyFinancialEntries(propertyId, selectedMonth, selectedYear),
    enabled: !!propertyId,
    staleTime: 30 * 1000,
  });

  // Calculate schedule balance
  const scheduleBalance = calculateScheduleBalance(entries, selectedMonth, selectedYear);

  // Add schedule balance to the last entry
  const entriesWithScheduleBalance = entries.map((entry, index) => ({
    ...entry,
    schedule_balance: index === entries.length - 1 ? scheduleBalance : undefined,
  }));

  return {
    entries: entriesWithScheduleBalance,
    loading: isLoading,
    error,
    refetch,
    scheduleBalance,
  };
}

// Fetch initial balance (sum of all entries before the selected month/year)
const fetchPropertyInitialBalance = async (
  propertyId: string,
  month: number,
  year: number
): Promise<number> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('expenses')
    .select('amount, entry_type')
    .eq('property_id', propertyId)
    .lt('expense_date', startDate);

  if (error) throw error;

  // Calculate initial balance from all previous entries
  let balance = 0;
  (data || []).forEach((entry: { amount: number | null; entry_type: string | null }) => {
    const amount = entry.amount || 0;
    if (entry.entry_type === 'credit') {
      balance += amount;
    } else {
      balance -= amount;
    }
  });

  return balance;
};

export function usePropertyInitialBalance(propertyId: string, month?: number, year?: number) {
  const currentDate = new Date();
  const selectedMonth = month ?? currentDate.getMonth() + 1;
  const selectedYear = year ?? currentDate.getFullYear();

  const { data: initialBalance = 0, isLoading, error } = useQuery({
    queryKey: [...expenseKeys.byProperty(propertyId), 'initialBalance', selectedMonth, selectedYear],
    queryFn: () => fetchPropertyInitialBalance(propertyId, selectedMonth, selectedYear),
    enabled: !!propertyId,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    initialBalance,
    loading: isLoading,
    error,
  };
}
