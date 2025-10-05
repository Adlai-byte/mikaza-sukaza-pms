import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User, BankAccount, CreditCard, UserInsert } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";

// Query keys for cache management
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  bankAccounts: (userId: string) => [...userKeys.all, 'bankAccounts', userId] as const,
  creditCards: (userId: string) => [...userKeys.all, 'creditCards', userId] as const,
};

// Fetch users with optimized query
const fetchUsers = async (): Promise<User[]> => {
  console.log('👥 Fetching users with React Query...');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Users fetch error:', error);
    throw error;
  }

  console.log('✅ Users data:', data?.length || 0, 'users');
  return (data || []) as User[];
};

// Fetch bank accounts for a user
const fetchBankAccounts = async (userId: string): Promise<BankAccount[]> => {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
};

// Fetch credit cards for a user
const fetchCreditCards = async (userId: string): Promise<CreditCard[]> => {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []) as CreditCard[];
};

export function useUsersOptimized() {
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  // Users query with caching
  const {
    data: users = [],
    isLoading: loading,
    isFetching,
    error: usersError,
    refetch,
  } = useQuery({
    queryKey: userKeys.lists(),
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserInsert) => {
      // Check permission
      if (!hasPermission(PERMISSIONS.USERS_CREATE)) {
        throw new Error("You don't have permission to create users");
      }

      // Ensure password is provided for new users
      if (!userData.password) {
        throw new Error("Password is required for new users");
      }

      // Create insertion data with required password
      const insertData = { ...userData, password: userData.password };

      const { data, error } = await supabase
        .from('users')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch users
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: Partial<UserInsert> }) => {
      // Check permission
      if (!hasPermission(PERMISSIONS.USERS_EDIT)) {
        throw new Error("You don't have permission to edit users");
      }

      // Remove empty password field and empty date fields for updates
      const updateData = { ...userData };
      if (updateData.password === "") {
        delete updateData.password;
      }
      if (updateData.date_of_birth === "") {
        delete updateData.date_of_birth;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      await logActivity(
        'USER_UPDATED',
        {
          userId,
          updatedFields: Object.keys(updateData),
          userEmail: updateData.email || 'Unknown'
        },
        userId,
        'Admin'
      );

      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch users
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Check permission
      if (!hasPermission(PERMISSIONS.USERS_DELETE)) {
        throw new Error("You don't have permission to delete users");
      }

      const userToDelete = users.find(u => u.user_id === userId);

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      await logActivity(
        'USER_DELETED',
        {
          userId,
          userEmail: userToDelete?.email || 'Unknown',
          userType: userToDelete?.user_type || 'Unknown'
        },
        userId,
        'Admin'
      );

      return userId;
    },
    onSuccess: () => {
      // Invalidate and refetch users
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Bank accounts query - lazy loaded when needed
  const useUserBankAccounts = (userId: string) => {
    return useQuery({
      queryKey: userKeys.bankAccounts(userId),
      queryFn: () => fetchBankAccounts(userId),
      enabled: !!userId,
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
    });
  };

  // Credit cards query - lazy loaded when needed
  const useUserCreditCards = (userId: string) => {
    return useQuery({
      queryKey: userKeys.creditCards(userId),
      queryFn: () => fetchCreditCards(userId),
      enabled: !!userId,
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
    });
  };

  // Handle errors
  if (usersError) {
    toast({
      title: "Error",
      description: "Failed to fetch users",
      variant: "destructive",
    });
  }

  return {
    users,
    loading,
    isFetching,
    createUser: createUserMutation.mutate,
    updateUser: (userId: string, userData: Partial<UserInsert>) =>
      updateUserMutation.mutate({ userId, userData }),
    deleteUser: deleteUserMutation.mutate,
    refetch,
    // Lazy loading functions for bank accounts and credit cards
    useUserBankAccounts,
    useUserCreditCards,
    // Mutation states for UI feedback
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
  };
}