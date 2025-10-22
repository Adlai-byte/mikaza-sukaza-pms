import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Expense, ExpenseInsert } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';

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
const deleteExpense = async (expenseId: string): Promise<void> => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('expense_id', expenseId);

  if (error) throw error;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
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
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(data.expense_id!) });
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

  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
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
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(data.expense_id!) });
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
