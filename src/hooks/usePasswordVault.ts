import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  encryptWithVault,
  decryptWithVault,
  hashMasterPassword,
  verifyMasterPassword,
  unlockVault,
  lockVault,
  isVaultUnlocked,
  generateSalt,
  EncryptedData,
} from '@/lib/password-vault-crypto';

// ============================================
// TYPES
// ============================================

export type PasswordEntryType = 'property_code' | 'service_account' | 'internal_system';

export interface PasswordEntry {
  password_id: string;
  property_id: string | null;
  entry_type: PasswordEntryType;
  category: string;
  name: string;
  encrypted_username: string | null;
  encrypted_password: string;
  encrypted_notes: string | null;
  encryption_iv: string;
  url: string | null;
  last_rotated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  property?: {
    property_id: string;
    property_type: string;
  } | null;
  created_user?: {
    user_id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface DecryptedPasswordEntry extends Omit<PasswordEntry, 'encrypted_username' | 'encrypted_password' | 'encrypted_notes'> {
  username: string | null;
  password: string;
  notes: string | null;
}

export interface PasswordAccessLog {
  log_id: string;
  password_id: string;
  user_id: string;
  action: 'viewed' | 'created' | 'updated' | 'deleted';
  ip_address: string | null;
  user_agent: string | null;
  entry_name: string | null;
  created_at: string;
  // Joined data
  user?: {
    user_id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface PasswordVaultStats {
  total_entries: number;
  property_codes: number;
  service_accounts: number;
  internal_systems: number;
  entries_this_month: number;
}

export interface MasterPasswordData {
  user_id: string;
  password_hash: string;
  salt: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePasswordEntryInput {
  property_id?: string | null;
  entry_type: PasswordEntryType;
  category: string;
  name: string;
  username?: string | null;
  password: string;
  notes?: string | null;
  url?: string | null;
}

export interface UpdatePasswordEntryInput extends Partial<CreatePasswordEntryInput> {
  password_id: string;
}

interface UsePasswordEntriesOptions {
  entry_type?: PasswordEntryType;
  property_id?: string;
  category?: string;
}

// ============================================
// QUERY KEYS
// ============================================

export const passwordVaultKeys = {
  all: ['password-vault'] as const,
  entries: () => [...passwordVaultKeys.all, 'entries'] as const,
  entry: (id: string) => [...passwordVaultKeys.entries(), id] as const,
  stats: () => [...passwordVaultKeys.all, 'stats'] as const,
  accessLogs: (passwordId?: string) => [...passwordVaultKeys.all, 'logs', passwordId] as const,
  masterPassword: () => [...passwordVaultKeys.all, 'master'] as const,
};

// ============================================
// MAIN HOOK
// ============================================

export function usePasswordVault(options: UsePasswordEntriesOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch password entries (encrypted - decryption happens on view)
  const {
    data: entries = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...passwordVaultKeys.entries(), JSON.stringify(options)],
    queryFn: async () => {
      let query = supabase
        .from('password_vault')
        .select(`
          *,
          property:properties(property_id, property_type),
          created_user:users!password_vault_created_by_fkey(user_id, first_name, last_name)
        `)
        .order('name', { ascending: true });

      // Apply filters
      if (options.entry_type) {
        query = query.eq('entry_type', options.entry_type);
      }
      if (options.property_id) {
        query = query.eq('property_id', options.property_id);
      }
      if (options.category) {
        query = query.eq('category', options.category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching password entries:', error);
        throw error;
      }

      return data as PasswordEntry[];
    },
  });

  // Create new password entry
  const createEntry = useMutation({
    mutationFn: async (input: CreatePasswordEntryInput) => {
      if (!isVaultUnlocked()) {
        throw new Error('Vault is locked. Please unlock with master password.');
      }

      // Encrypt sensitive fields
      const encryptedPassword = await encryptWithVault(input.password);
      const encryptedUsername = input.username ? await encryptWithVault(input.username) : null;
      const encryptedNotes = input.notes ? await encryptWithVault(input.notes) : null;

      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('password_vault')
        .insert([{
          property_id: input.property_id || null,
          entry_type: input.entry_type,
          category: input.category,
          name: input.name,
          encrypted_username: encryptedUsername?.ciphertext || null,
          encrypted_password: encryptedPassword.ciphertext,
          encrypted_notes: encryptedNotes?.ciphertext || null,
          encryption_iv: encryptedPassword.iv, // Use same IV for all fields
          url: input.url || null,
          created_by: user?.id,
          updated_by: user?.id,
        }])
        .select(`
          *,
          property:properties(property_id, property_type)
        `)
        .single();

      if (error) throw error;

      // Log the creation
      await logAccess(data.password_id, 'created', input.name);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordVaultKeys.entries(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: passwordVaultKeys.stats(), refetchType: 'all' });
      toast({
        title: 'Password Added',
        description: 'Password entry has been securely stored.',
      });
    },
    onError: (error: Error) => {
      console.error('Error creating password entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add password entry.',
        variant: 'destructive',
      });
    },
  });

  // Update existing password entry
  const updateEntry = useMutation({
    mutationFn: async (input: UpdatePasswordEntryInput) => {
      if (!isVaultUnlocked()) {
        throw new Error('Vault is locked. Please unlock with master password.');
      }

      const { password_id, ...updates } = input;
      const user = (await supabase.auth.getUser()).data.user;

      // Prepare update object
      const updateData: Record<string, any> = {
        updated_by: user?.id,
      };

      // Only encrypt fields that are being updated
      if (updates.password !== undefined) {
        const encrypted = await encryptWithVault(updates.password);
        updateData.encrypted_password = encrypted.ciphertext;
        updateData.encryption_iv = encrypted.iv;
        updateData.last_rotated_at = new Date().toISOString();
      }

      if (updates.username !== undefined) {
        if (updates.username) {
          const encrypted = await encryptWithVault(updates.username);
          updateData.encrypted_username = encrypted.ciphertext;
        } else {
          updateData.encrypted_username = null;
        }
      }

      if (updates.notes !== undefined) {
        if (updates.notes) {
          const encrypted = await encryptWithVault(updates.notes);
          updateData.encrypted_notes = encrypted.ciphertext;
        } else {
          updateData.encrypted_notes = null;
        }
      }

      // Copy non-encrypted fields
      if (updates.property_id !== undefined) updateData.property_id = updates.property_id || null;
      if (updates.entry_type !== undefined) updateData.entry_type = updates.entry_type;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.url !== undefined) updateData.url = updates.url || null;

      const { data, error } = await supabase
        .from('password_vault')
        .update(updateData)
        .eq('password_id', password_id)
        .select(`
          *,
          property:properties(property_id, property_type)
        `)
        .single();

      if (error) throw error;

      // Log the update
      await logAccess(password_id, 'updated', data.name);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordVaultKeys.entries(), refetchType: 'all' });
      toast({
        title: 'Password Updated',
        description: 'Password entry has been updated.',
      });
    },
    onError: (error: Error) => {
      console.error('Error updating password entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password entry.',
        variant: 'destructive',
      });
    },
  });

  // Delete password entry
  const deleteEntry = useMutation({
    mutationFn: async ({ password_id, entry_name }: { password_id: string; entry_name: string }) => {
      // Log the deletion before deleting
      await logAccess(password_id, 'deleted', entry_name);

      const { error } = await supabase
        .from('password_vault')
        .delete()
        .eq('password_id', password_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordVaultKeys.entries(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: passwordVaultKeys.stats(), refetchType: 'all' });
      toast({
        title: 'Password Deleted',
        description: 'Password entry has been removed.',
      });
    },
    onError: (error: Error) => {
      console.error('Error deleting password entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete password entry.',
        variant: 'destructive',
      });
    },
  });

  return {
    entries,
    isLoading,
    error,
    refetch,
    createEntry: createEntry.mutateAsync,
    updateEntry: updateEntry.mutateAsync,
    deleteEntry: deleteEntry.mutateAsync,
    isCreating: createEntry.isPending,
    isUpdating: updateEntry.isPending,
    isDeleting: deleteEntry.isPending,
  };
}

// ============================================
// DECRYPT ENTRY HOOK
// ============================================

export function useDecryptPasswordEntry() {
  const { toast } = useToast();

  const decryptEntry = async (entry: PasswordEntry): Promise<DecryptedPasswordEntry> => {
    if (!isVaultUnlocked()) {
      throw new Error('Vault is locked. Please unlock with master password.');
    }

    try {
      const password = await decryptWithVault(entry.encrypted_password, entry.encryption_iv);
      const username = entry.encrypted_username
        ? await decryptWithVault(entry.encrypted_username, entry.encryption_iv)
        : null;
      const notes = entry.encrypted_notes
        ? await decryptWithVault(entry.encrypted_notes, entry.encryption_iv)
        : null;

      // Log the view
      await logAccess(entry.password_id, 'viewed', entry.name);

      return {
        ...entry,
        username,
        password,
        notes,
      };
    } catch (error: any) {
      console.error('Error decrypting password entry:', error);
      toast({
        title: 'Decryption Error',
        description: 'Failed to decrypt password. The vault may need to be unlocked again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return { decryptEntry };
}

// ============================================
// VAULT STATS HOOK
// ============================================

export function usePasswordVaultStats() {
  return useQuery({
    queryKey: passwordVaultKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_password_vault_stats');

      if (error) {
        console.error('Error fetching vault stats:', error);
        throw error;
      }

      return (data?.[0] || {
        total_entries: 0,
        property_codes: 0,
        service_accounts: 0,
        internal_systems: 0,
        entries_this_month: 0,
      }) as PasswordVaultStats;
    },
  });
}

// ============================================
// ACCESS LOGS HOOK
// ============================================

export function usePasswordAccessLogs(passwordId?: string) {
  return useQuery({
    queryKey: passwordVaultKeys.accessLogs(passwordId),
    queryFn: async () => {
      let query = supabase
        .from('password_vault_access_log')
        .select(`
          *,
          user:users!password_vault_access_log_user_id_fkey(user_id, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (passwordId) {
        query = query.eq('password_id', passwordId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching access logs:', error);
        throw error;
      }

      return data as PasswordAccessLog[];
    },
  });
}

// ============================================
// MASTER PASSWORD HOOKS
// ============================================

export function useMasterPassword() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user has set up master password
  const { data: masterData, isLoading, refetch } = useQuery({
    queryKey: passwordVaultKeys.masterPassword(),
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('password_vault_master')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching master password data:', error);
        throw error;
      }

      return data as MasterPasswordData | null;
    },
  });

  // Set up master password (first time)
  const setupMasterPassword = useMutation({
    mutationFn: async (masterPassword: string) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      // Generate salt and hash
      const { hash, salt } = await hashMasterPassword(masterPassword);

      const { data, error } = await supabase
        .from('password_vault_master')
        .insert([{
          user_id: user.id,
          password_hash: hash,
          salt: salt,
        }])
        .select()
        .single();

      if (error) throw error;

      // Unlock the vault after setup
      await unlockVault(masterPassword, salt);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordVaultKeys.masterPassword() });
      toast({
        title: 'Master Password Set',
        description: 'Your master password has been configured. The vault is now unlocked.',
      });
    },
    onError: (error: Error) => {
      console.error('Error setting up master password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to set up master password.',
        variant: 'destructive',
      });
    },
  });

  // Change master password
  const changeMasterPassword = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      // Verify current password
      if (!masterData) throw new Error('Master password not set up');

      const isValid = await verifyMasterPassword(currentPassword, masterData.password_hash, masterData.salt);
      if (!isValid) throw new Error('Current master password is incorrect');

      // Generate new hash and salt
      const { hash, salt } = await hashMasterPassword(newPassword);

      const { data, error } = await supabase
        .from('password_vault_master')
        .update({
          password_hash: hash,
          salt: salt,
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Re-unlock with new password
      await unlockVault(newPassword, salt);

      // Note: All existing passwords would need to be re-encrypted with the new key
      // This is a complex operation that should be done carefully
      // For now, changing master password will make existing entries unreadable
      // Consider implementing key re-encryption in a future update

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordVaultKeys.masterPassword() });
      toast({
        title: 'Master Password Changed',
        description: 'Your master password has been updated.',
      });
    },
    onError: (error: Error) => {
      console.error('Error changing master password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to change master password.',
        variant: 'destructive',
      });
    },
  });

  // Unlock vault with master password
  const unlock = async (masterPassword: string): Promise<boolean> => {
    if (!masterData) {
      toast({
        title: 'Error',
        description: 'Master password not set up. Please set up your master password first.',
        variant: 'destructive',
      });
      return false;
    }

    const isValid = await verifyMasterPassword(masterPassword, masterData.password_hash, masterData.salt);

    if (!isValid) {
      toast({
        title: 'Invalid Password',
        description: 'The master password is incorrect.',
        variant: 'destructive',
      });
      return false;
    }

    await unlockVault(masterPassword, masterData.salt);

    toast({
      title: 'Vault Unlocked',
      description: 'You can now view and manage passwords.',
    });

    return true;
  };

  // Lock vault
  const lock = () => {
    lockVault();
    toast({
      title: 'Vault Locked',
      description: 'The password vault has been locked.',
    });
  };

  return {
    masterData,
    isLoading,
    refetch,
    hasMasterPassword: !!masterData,
    isUnlocked: isVaultUnlocked(),
    setupMasterPassword: setupMasterPassword.mutateAsync,
    changeMasterPassword: changeMasterPassword.mutateAsync,
    unlock,
    lock,
    isSettingUp: setupMasterPassword.isPending,
    isChanging: changeMasterPassword.isPending,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function logAccess(
  passwordId: string,
  action: 'viewed' | 'created' | 'updated' | 'deleted',
  entryName: string
): Promise<void> {
  try {
    await supabase.rpc('log_password_access', {
      p_password_id: passwordId,
      p_action: action,
      p_entry_name: entryName,
      p_ip_address: null, // Could be captured from request headers
      p_user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Error logging password access:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

// ============================================
// CATEGORIES FOR UI
// ============================================

export const PASSWORD_CATEGORIES = {
  property_code: [
    'Door Code',
    'Gate Code',
    'WiFi Password',
    'Garage Code',
    'Safe Code',
    'Alarm Code',
    'Mailbox Code',
    'Storage Code',
    'Other',
  ],
  service_account: [
    'Airbnb',
    'VRBO',
    'Booking.com',
    'Expedia',
    'Guesty',
    'Hostaway',
    'Cleaning Service',
    'Property Management',
    'Smart Lock App',
    'Thermostat App',
    'Security Camera',
    'Other',
  ],
  internal_system: [
    'Email Account',
    'Bank Account',
    'Accounting Software',
    'CRM',
    'Payment Processor',
    'Social Media',
    'Website Admin',
    'Cloud Storage',
    'Other',
  ],
} as const;

export const ENTRY_TYPE_LABELS: Record<PasswordEntryType, string> = {
  property_code: 'Property Code',
  service_account: 'Service Account',
  internal_system: 'Internal System',
};
