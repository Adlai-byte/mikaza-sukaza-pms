import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User, BankAccount, CreditCard, UserInsert } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { validatePassword } from "@/lib/password-validation";
import { CACHE_CONFIG } from "@/lib/cache-config";
import { OptimisticUpdates } from "@/lib/cache-manager-simplified";

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
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }

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

  // Users query with intelligent caching
  const {
    data: users = [],
    isLoading: loading,
    isFetching,
    error: usersError,
    refetch,
  } = useQuery({
    queryKey: userKeys.lists(),
    queryFn: fetchUsers,
    // Enable caching - realtime subscriptions will invalidate when data changes
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: CACHE_CONFIG.LIST.gcTime, // 2 hours
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: 2,
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

      // Validate password strength
      const passwordValidation = validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join('. '));
      }

      // Step 1: Create Supabase Auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            user_type: userData.user_type,
          }
        }
      });

      if (authError) {
        throw new Error(`Failed to create authentication account: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create authentication account');
      }

      // Step 2: Create insertion data with Supabase Auth user ID
      const { confirmPassword, ...insertData } = {
        ...userData,
        user_id: authData.user.id,
        password: userData.password
      };

      // Clean up optional fields with empty strings
      const optionalFields = [
        'date_of_birth', 'company', 'cellphone_primary', 'cellphone_usa',
        'whatsapp', 'address', 'city', 'state', 'zip', 'photo_url'
      ];

      optionalFields.forEach(field => {
        if (insertData[field as keyof typeof insertData] === "" ||
            insertData[field as keyof typeof insertData] === undefined) {
          delete insertData[field as keyof typeof insertData];
        }
      });

      // Step 3: Insert user into users table
      const { data, error } = await supabase
        .from('users')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        throw new Error(`User account created but database entry failed: ${error.message}. Please contact administrator.`);
      }

      toast({
        title: "User Created Successfully",
        description: `User account created. A verification email has been sent to ${userData.email}.`,
      });

      return data;
    },
    onMutate: async (userData) => {
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });
      const previousUsers = queryClient.getQueryData(userKeys.lists());

      const tempUser = {
        user_id: `temp-${Date.now()}`,
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData(userKeys.lists(), (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return [tempUser];
        return [tempUser, ...oldData];
      });

      return { rollback: () => queryClient.setQueryData(userKeys.lists(), previousUsers) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists(), refetchType: 'all' });
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error, userData, context) => {
      context?.rollback?.();
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
      const userBeforeUpdate = users.find(u => u.user_id === userId);

      if (!hasPermission(PERMISSIONS.USERS_EDIT)) {
        throw new Error("You don't have permission to edit users");
      }

      const updateData = { ...userData };
      if (updateData.password === "") {
        delete updateData.password;
      }
      if (updateData.date_of_birth === "") {
        delete updateData.date_of_birth;
      }

      if (updateData.password && updateData.password !== "") {
        const passwordValidation = validatePassword(updateData.password);
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.errors.join('. '));
        }
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
          userEmail: updateData.email || userBeforeUpdate?.email || 'Unknown'
        },
        userId
      );

      return data;
    },
    onMutate: async ({ userId, userData }) => {
      const rollback = OptimisticUpdates.updateUser(queryClient, userId, userData);
      return { rollback };
    },
    onSuccess: async () => {
      // Invalidate and immediately refetch to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: userKeys.lists(), refetchType: 'all' });
      // Cross-entity: invalidate activity logs since user data changed
      await queryClient.invalidateQueries({ queryKey: ['activity_logs'], refetchType: 'all' });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error, variables, context) => {
      context?.rollback?.();
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
      const userToDelete = users.find(u => u.user_id === userId);

      if (!hasPermission(PERMISSIONS.USERS_DELETE)) {
        throw new Error("You don't have permission to delete users");
      }

      // Log activity BEFORE deletion (so the user still exists for the foreign key reference)
      await logActivity(
        'USER_DELETED',
        {
          userId,
          userEmail: userToDelete?.email || 'Unknown',
          userType: userToDelete?.user_type || 'Unknown'
        },
        userId
      );

      // Now delete the user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      return userId;
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });
      const previousUsers = queryClient.getQueryData(userKeys.lists());

      queryClient.setQueryData(userKeys.lists(), (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((user: any) => user.user_id !== userId);
      });

      return { rollback: () => queryClient.setQueryData(userKeys.lists(), previousUsers) };
    },
    onSuccess: async () => {
      // Invalidate and immediately refetch to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: userKeys.lists(), refetchType: 'all' });
      // Cross-entity: invalidate activity logs since user was deleted
      await queryClient.invalidateQueries({ queryKey: ['activity_logs'], refetchType: 'all' });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error, userId, context) => {
      context?.rollback?.();
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
      staleTime: CACHE_CONFIG.DETAIL.staleTime,
      gcTime: CACHE_CONFIG.DETAIL.gcTime,
    });
  };

  // Credit cards query - lazy loaded when needed
  const useUserCreditCards = (userId: string) => {
    return useQuery({
      queryKey: userKeys.creditCards(userId),
      queryFn: () => fetchCreditCards(userId),
      enabled: !!userId,
      staleTime: CACHE_CONFIG.DETAIL.staleTime,
      gcTime: CACHE_CONFIG.DETAIL.gcTime,
    });
  };

  // Handle errors
  useEffect(() => {
    if (usersError) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  }, [usersError, toast]);

  return {
    users,
    loading,
    isFetching,
    createUser: createUserMutation.mutateAsync,
    updateUser: (userId: string, userData: Partial<UserInsert>) =>
      updateUserMutation.mutateAsync({ userId, userData }),
    deleteUser: deleteUserMutation.mutateAsync,
    refetch,
    useUserBankAccounts,
    useUserCreditCards,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
  };
}
