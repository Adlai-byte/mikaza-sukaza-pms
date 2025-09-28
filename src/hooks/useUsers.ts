import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, BankAccount, CreditCard, UserInsert } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('👥 Fetching users...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Users fetch error:', error);
        throw error;
      }
      
      console.log('✅ Users data:', data);
      console.log('📊 Users count:', data?.length || 0);
      
      setUsers((data || []) as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('⏰ Users loading finished');
    }
  };

  const createUser = async (userData: UserInsert) => {
    try {
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

      setUsers(prev => [data as User, ...prev]);
      toast({
        title: "Success",
        description: "User created successfully",
      });
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateUser = async (userId: string, userData: Partial<UserInsert>) => {
    try {
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

      setUsers(prev => prev.map(user => 
        user.user_id === userId ? data as User : user
      ));
      
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

      toast({
        title: "Success",
        description: "User updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const userToDelete = users.find(u => u.user_id === userId);
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(user => user.user_id !== userId));
      
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

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getUserBankAccounts = async (userId: string): Promise<BankAccount[]> => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      return [];
    }
  };

  const getUserCreditCards = async (userId: string): Promise<CreditCard[]> => {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []) as CreditCard[];
    } catch (error) {
      console.error('Error fetching credit cards:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    createUser,
    updateUser,
    deleteUser,
    getUserBankAccounts,
    getUserCreditCards,
    refetch: fetchUsers,
  };
}