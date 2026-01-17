import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import {
  KeyInventory,
  KeyInventoryInsert,
  KeyInventoryFilters,
  KeyTransaction,
  KeyTransactionInsert,
  KeyTransactionFilters,
  KeyCategory,
  KeyType,
  PropertyKeySummary,
  KeyBorrowing,
  KeyBorrowingInsert,
  KeyBorrowingFilters,
  BorrowerType,
  BorrowingStatus,
} from '@/lib/schemas';

// Query keys for cache management
export const keyControlKeys = {
  all: ['key_control'] as const,
  inventory: () => [...keyControlKeys.all, 'inventory'] as const,
  inventoryList: (filters?: KeyInventoryFilters) => [...keyControlKeys.inventory(), filters] as const,
  transactions: () => [...keyControlKeys.all, 'transactions'] as const,
  transactionList: (filters?: KeyTransactionFilters) => [...keyControlKeys.transactions(), filters] as const,
  propertySummary: (propertyId?: string) => [...keyControlKeys.all, 'summary', propertyId] as const,
  allPropertiesSummary: () => [...keyControlKeys.all, 'all_summaries'] as const,
  borrowings: () => [...keyControlKeys.all, 'borrowings'] as const,
  borrowingList: (filters?: KeyBorrowingFilters) => [...keyControlKeys.borrowings(), filters] as const,
  outstandingBorrowings: () => [...keyControlKeys.borrowings(), 'outstanding'] as const,
};

/**
 * Fetch key inventory with optional filters
 */
export function useKeyInventory(filters?: KeyInventoryFilters) {
  return useQuery({
    queryKey: keyControlKeys.inventoryList(filters),
    staleTime: 0, // Always refetch when invalidated - operational data
    queryFn: async () => {
      let query = supabase
        .from('key_inventory')
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.key_type) {
        query = query.eq('key_type', filters.key_type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as KeyInventory[];
    },
  });
}

/**
 * Fetch key transactions (audit log) with optional filters
 */
export function useKeyTransactions(filters?: KeyTransactionFilters) {
  return useQuery({
    queryKey: keyControlKeys.transactionList(filters),
    staleTime: 0, // Always refetch when invalidated - operational data
    queryFn: async () => {
      let query = supabase
        .from('key_transactions')
        .select(`
          *,
          property:properties(property_id, property_name),
          performer:users!key_transactions_performed_by_fkey(user_id:id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id);
      }

      if (filters?.key_type) {
        query = query.eq('key_type', filters.key_type);
      }

      if (filters?.from_category) {
        query = query.eq('from_category', filters.from_category);
      }

      if (filters?.to_category) {
        query = query.eq('to_category', filters.to_category);
      }

      if (filters?.performed_by) {
        query = query.eq('performed_by', filters.performed_by);
      }

      if (filters?.start_date) {
        query = query.gte('created_at', filters.start_date);
      }

      if (filters?.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as KeyTransaction[];
    },
  });
}

/**
 * Fetch property key summary (all keys for a specific property)
 */
export function usePropertyKeySummary(propertyId: string | null) {
  return useQuery({
    queryKey: keyControlKeys.propertySummary(propertyId || undefined),
    staleTime: 0, // Always refetch when invalidated - operational data
    queryFn: async () => {
      if (!propertyId) return null;

      const { data: inventory, error: inventoryError } = await supabase
        .from('key_inventory')
        .select('*')
        .eq('property_id', propertyId);

      if (inventoryError) throw inventoryError;

      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('property_id, property_name')
        .eq('property_id', propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Build the summary object
      const categories: KeyCategory[] = ['office', 'operational', 'housekeepers', 'extras'];
      const keyTypes: KeyType[] = ['house_key', 'mailbox_key', 'storage_key', 'remote_control'];

      const inventoryMap: PropertyKeySummary['inventory'] = {} as PropertyKeySummary['inventory'];
      const notesMap: PropertyKeySummary['inventoryNotes'] = {} as PropertyKeySummary['inventoryNotes'];
      let totalKeys = 0;
      let lastUpdated = '';

      categories.forEach(category => {
        inventoryMap[category] = {} as { [keyType in KeyType]: number };
        notesMap[category] = {} as { [keyType in KeyType]: string | null };
        keyTypes.forEach(keyType => {
          const item = (inventory || []).find(i => i.category === category && i.key_type === keyType);
          inventoryMap[category][keyType] = item?.quantity || 0;
          notesMap[category][keyType] = item?.notes || null;
          totalKeys += item?.quantity || 0;
          if (item?.updated_at && (!lastUpdated || item.updated_at > lastUpdated)) {
            lastUpdated = item.updated_at;
          }
        });
      });

      return {
        property_id: property.property_id,
        property_name: property.property_name,
        inventory: inventoryMap,
        inventoryNotes: notesMap,
        total_keys: totalKeys,
        last_updated: lastUpdated || new Date().toISOString(),
      } as PropertyKeySummary;
    },
    enabled: !!propertyId,
  });
}

/**
 * Fetch all properties with their key summaries
 */
export function useAllPropertiesKeySummary(searchTerm?: string) {
  return useQuery({
    queryKey: [...keyControlKeys.allPropertiesSummary(), searchTerm],
    staleTime: 0, // Always refetch when invalidated - operational data
    queryFn: async () => {
      // Fetch all properties
      let propertiesQuery = supabase
        .from('properties')
        .select('property_id, property_name')
        .order('property_name');

      if (searchTerm) {
        propertiesQuery = propertiesQuery.ilike('property_name', `%${searchTerm}%`);
      }

      const { data: properties, error: propertiesError } = await propertiesQuery;

      if (propertiesError) throw propertiesError;

      // Fetch all inventory
      const { data: allInventory, error: inventoryError } = await supabase
        .from('key_inventory')
        .select('*');

      if (inventoryError) throw inventoryError;

      const categories: KeyCategory[] = ['office', 'operational', 'housekeepers', 'extras'];
      const keyTypes: KeyType[] = ['house_key', 'mailbox_key', 'storage_key', 'remote_control'];

      // Build summaries for each property
      const summaries: PropertyKeySummary[] = (properties || []).map(property => {
        const propertyInventory = (allInventory || []).filter(i => i.property_id === property.property_id);

        const inventoryMap: PropertyKeySummary['inventory'] = {} as PropertyKeySummary['inventory'];
        const notesMap: PropertyKeySummary['inventoryNotes'] = {} as PropertyKeySummary['inventoryNotes'];
        let totalKeys = 0;
        let lastUpdated = '';

        categories.forEach(category => {
          inventoryMap[category] = {} as { [keyType in KeyType]: number };
          notesMap[category] = {} as { [keyType in KeyType]: string | null };
          keyTypes.forEach(keyType => {
            const item = propertyInventory.find(i => i.category === category && i.key_type === keyType);
            inventoryMap[category][keyType] = item?.quantity || 0;
            notesMap[category][keyType] = item?.notes || null;
            totalKeys += item?.quantity || 0;
            if (item?.updated_at && (!lastUpdated || item.updated_at > lastUpdated)) {
              lastUpdated = item.updated_at;
            }
          });
        });

        return {
          property_id: property.property_id,
          property_name: property.property_name,
          inventory: inventoryMap,
          inventoryNotes: notesMap,
          total_keys: totalKeys,
          last_updated: lastUpdated || new Date().toISOString(),
        };
      });

      return summaries;
    },
  });
}

/**
 * Update key inventory (set quantity for a specific category/key type)
 */
export function useUpdateKeyInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async ({
      propertyId,
      category,
      keyType,
      quantity,
      notes,
    }: {
      propertyId: string;
      category: KeyCategory;
      keyType: KeyType;
      quantity: number;
      notes?: string;
    }) => {
      // Upsert - insert or update
      const { data, error } = await supabase
        .from('key_inventory')
        .upsert(
          {
            property_id: propertyId,
            category,
            key_type: keyType,
            quantity,
            notes,
          },
          {
            onConflict: 'property_id,category,key_type',
          }
        )
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .single();

      if (error) throw error;
      return data as KeyInventory;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: keyControlKeys.all,
        refetchType: 'all',
      });

      logActivity('key_inventory_updated', {
        property_id: data.property_id,
        category: data.category,
        key_type: data.key_type,
        new_quantity: data.quantity,
      });

      toast({
        title: 'Inventory updated',
        description: `Key inventory has been updated successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error updating key inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to update inventory. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Transfer keys between categories
 */
export function useTransferKeys() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async ({
      propertyId,
      keyType,
      fromCategory,
      toCategory,
      quantity,
      notes,
    }: {
      propertyId: string;
      keyType: KeyType;
      fromCategory: KeyCategory;
      toCategory: KeyCategory;
      quantity: number;
      notes?: string;
    }) => {
      // Get current user for performed_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get current quantities
      const { data: fromInventory } = await supabase
        .from('key_inventory')
        .select('quantity')
        .eq('property_id', propertyId)
        .eq('category', fromCategory)
        .eq('key_type', keyType)
        .single();

      const currentFromQty = fromInventory?.quantity || 0;

      if (currentFromQty < quantity) {
        throw new Error(`Not enough keys in ${fromCategory}. Available: ${currentFromQty}`);
      }

      const { data: toInventory } = await supabase
        .from('key_inventory')
        .select('quantity')
        .eq('property_id', propertyId)
        .eq('category', toCategory)
        .eq('key_type', keyType)
        .single();

      const currentToQty = toInventory?.quantity || 0;

      // Update source category (decrease)
      const { error: fromError } = await supabase
        .from('key_inventory')
        .upsert(
          {
            property_id: propertyId,
            category: fromCategory,
            key_type: keyType,
            quantity: currentFromQty - quantity,
          },
          { onConflict: 'property_id,category,key_type' }
        );

      if (fromError) throw fromError;

      // Update destination category (increase)
      const { error: toError } = await supabase
        .from('key_inventory')
        .upsert(
          {
            property_id: propertyId,
            category: toCategory,
            key_type: keyType,
            quantity: currentToQty + quantity,
          },
          { onConflict: 'property_id,category,key_type' }
        );

      if (toError) throw toError;

      // Create transaction record for audit
      const { data: transaction, error: transactionError } = await supabase
        .from('key_transactions')
        .insert({
          property_id: propertyId,
          key_type: keyType,
          from_category: fromCategory,
          to_category: toCategory,
          quantity,
          performed_by: user.id,
          notes,
        })
        .select(`
          *,
          property:properties(property_id, property_name),
          performer:users!key_transactions_performed_by_fkey(user_id:id, first_name, last_name)
        `)
        .single();

      if (transactionError) throw transactionError;
      return transaction as KeyTransaction;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: keyControlKeys.all,
        refetchType: 'all',
      });

      logActivity('key_transfer', {
        property_id: data.property_id,
        key_type: data.key_type,
        from_category: data.from_category,
        to_category: data.to_category,
        quantity: data.quantity,
      });

      toast({
        title: 'Keys transferred',
        description: `${data.quantity} key(s) transferred from ${data.from_category} to ${data.to_category}.`,
      });
    },
    onError: (error: Error) => {
      console.error('Error transferring keys:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to transfer keys. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Initialize inventory for a property (create all category/key type combinations with 0)
 */
export function useInitializePropertyInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      const categories: KeyCategory[] = ['office', 'operational', 'housekeepers', 'extras'];
      const keyTypes: KeyType[] = ['house_key', 'mailbox_key', 'storage_key', 'remote_control'];

      const inventoryItems: KeyInventoryInsert[] = [];

      categories.forEach(category => {
        keyTypes.forEach(keyType => {
          inventoryItems.push({
            property_id: propertyId,
            category,
            key_type: keyType,
            quantity: 0,
          });
        });
      });

      const { data, error } = await supabase
        .from('key_inventory')
        .upsert(inventoryItems, { onConflict: 'property_id,category,key_type' })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, propertyId) => {
      await queryClient.invalidateQueries({
        queryKey: keyControlKeys.all,
        refetchType: 'all',
      });

      logActivity('key_inventory_initialized', {
        property_id: propertyId,
        items_created: data.length,
      });

      toast({
        title: 'Inventory initialized',
        description: 'Key inventory has been initialized for this property.',
      });
    },
    onError: (error) => {
      console.error('Error initializing inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize inventory. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Bulk update inventory for a property
 */
export function useBulkUpdateInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async ({
      propertyId,
      inventory,
    }: {
      propertyId: string;
      inventory: { category: KeyCategory; key_type: KeyType; quantity: number }[];
    }) => {
      const updates = inventory.map(item => ({
        property_id: propertyId,
        category: item.category,
        key_type: item.key_type,
        quantity: item.quantity,
      }));

      const { data, error } = await supabase
        .from('key_inventory')
        .upsert(updates, { onConflict: 'property_id,category,key_type' })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, { propertyId }) => {
      await queryClient.invalidateQueries({
        queryKey: keyControlKeys.all,
        refetchType: 'all',
      });

      logActivity('key_inventory_bulk_updated', {
        property_id: propertyId,
        items_updated: data.length,
      });

      toast({
        title: 'Inventory saved',
        description: 'Key inventory has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error bulk updating inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to save inventory. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// ==================== Key Borrowing Hooks ====================

/**
 * Fetch key borrowings with optional filters
 */
export function useKeyBorrowings(filters?: KeyBorrowingFilters) {
  return useQuery({
    queryKey: keyControlKeys.borrowingList(filters),
    staleTime: 0, // Always refetch when invalidated - operational data
    queryFn: async () => {
      let query = supabase
        .from('key_borrowings')
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .order('checked_out_at', { ascending: false });

      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id);
      }

      if (filters?.key_type) {
        query = query.eq('key_type', filters.key_type);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.borrower_type) {
        query = query.eq('borrower_type', filters.borrower_type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.borrower_name) {
        query = query.ilike('borrower_name', `%${filters.borrower_name}%`);
      }

      if (filters?.start_date) {
        query = query.gte('checked_out_at', filters.start_date);
      }

      if (filters?.end_date) {
        query = query.lte('checked_out_at', filters.end_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as KeyBorrowing[];
    },
  });
}

/**
 * Fetch outstanding (currently borrowed) keys
 */
export function useOutstandingBorrowings(propertyId?: string) {
  return useQuery({
    queryKey: [...keyControlKeys.outstandingBorrowings(), propertyId],
    staleTime: 0, // Always refetch when invalidated - operational data
    queryFn: async () => {
      let query = supabase
        .from('key_borrowings')
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .in('status', ['borrowed', 'overdue'])
        .order('checked_out_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as KeyBorrowing[];
    },
  });
}

/**
 * Check out a key (borrow)
 * Deducts from the specified category
 */
export function useCheckOutKey() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async ({
      propertyId,
      keyType,
      category,
      quantity,
      borrowerName,
      borrowerContact,
      borrowerType,
      expectedReturnDate,
      notes,
    }: {
      propertyId: string;
      keyType: KeyType;
      category: KeyCategory;
      quantity: number;
      borrowerName: string;
      borrowerContact?: string;
      borrowerType: BorrowerType;
      expectedReturnDate?: string;
      notes?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check available quantity in the category
      const { data: inventory } = await supabase
        .from('key_inventory')
        .select('quantity')
        .eq('property_id', propertyId)
        .eq('category', category)
        .eq('key_type', keyType)
        .single();

      const availableQty = inventory?.quantity || 0;

      if (availableQty < quantity) {
        throw new Error(`Not enough keys available. Only ${availableQty} ${keyType.replace('_', ' ')}(s) in ${category}.`);
      }

      // Create borrowing record
      const { data: borrowing, error: borrowingError } = await supabase
        .from('key_borrowings')
        .insert({
          property_id: propertyId,
          key_type: keyType,
          category,
          quantity,
          borrower_name: borrowerName,
          borrower_contact: borrowerContact,
          borrower_type: borrowerType,
          expected_return_date: expectedReturnDate,
          notes,
          checked_out_by: user.id,
          status: 'borrowed',
        })
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .single();

      if (borrowingError) throw borrowingError;

      // Deduct from inventory
      const { error: inventoryError } = await supabase
        .from('key_inventory')
        .upsert(
          {
            property_id: propertyId,
            category,
            key_type: keyType,
            quantity: availableQty - quantity,
          },
          { onConflict: 'property_id,category,key_type' }
        );

      if (inventoryError) throw inventoryError;

      return borrowing as KeyBorrowing;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: keyControlKeys.all,
        refetchType: 'all',
      });

      logActivity('key_checked_out', {
        property_id: data.property_id,
        key_type: data.key_type,
        category: data.category,
        quantity: data.quantity,
        borrower_name: data.borrower_name,
        borrower_type: data.borrower_type,
      });

      toast({
        title: 'Key checked out',
        description: `${data.quantity} key(s) checked out to ${data.borrower_name}.`,
      });
    },
    onError: (error: Error) => {
      console.error('Error checking out key:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to check out key. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Check in a key (return)
 * Returns to the original category
 */
export function useCheckInKey() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async ({
      borrowingId,
      notes,
    }: {
      borrowingId: string;
      notes?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get the borrowing record
      const { data: borrowing, error: borrowingFetchError } = await supabase
        .from('key_borrowings')
        .select('*')
        .eq('id', borrowingId)
        .single();

      if (borrowingFetchError) throw borrowingFetchError;
      if (!borrowing) throw new Error('Borrowing record not found');
      if (borrowing.status === 'returned') throw new Error('Key has already been returned');

      // Update borrowing record
      const { data: updatedBorrowing, error: updateError } = await supabase
        .from('key_borrowings')
        .update({
          status: 'returned',
          checked_in_at: new Date().toISOString(),
          checked_in_by: user.id,
          notes: notes ? `${borrowing.notes || ''}\nReturn note: ${notes}`.trim() : borrowing.notes,
        })
        .eq('id', borrowingId)
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .single();

      if (updateError) throw updateError;

      // Return to inventory
      const { data: inventory } = await supabase
        .from('key_inventory')
        .select('quantity')
        .eq('property_id', borrowing.property_id)
        .eq('category', borrowing.category)
        .eq('key_type', borrowing.key_type)
        .single();

      const currentQty = inventory?.quantity || 0;

      const { error: inventoryError } = await supabase
        .from('key_inventory')
        .upsert(
          {
            property_id: borrowing.property_id,
            category: borrowing.category,
            key_type: borrowing.key_type,
            quantity: currentQty + borrowing.quantity,
          },
          { onConflict: 'property_id,category,key_type' }
        );

      if (inventoryError) throw inventoryError;

      return updatedBorrowing as KeyBorrowing;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: keyControlKeys.all,
        refetchType: 'all',
      });

      logActivity('key_checked_in', {
        property_id: data.property_id,
        key_type: data.key_type,
        category: data.category,
        quantity: data.quantity,
        borrower_name: data.borrower_name,
      });

      toast({
        title: 'Key returned',
        description: `${data.quantity} key(s) returned from ${data.borrower_name}.`,
      });
    },
    onError: (error: Error) => {
      console.error('Error checking in key:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to check in key. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Get borrowing statistics
 */
export function useBorrowingStats() {
  return useQuery({
    queryKey: [...keyControlKeys.borrowings(), 'stats'],
    staleTime: 0, // Always refetch when invalidated - operational data
    queryFn: async () => {
      const { data: borrowings, error } = await supabase
        .from('key_borrowings')
        .select('status, quantity');

      if (error) throw error;

      const stats = {
        totalBorrowed: 0,
        totalReturned: 0,
        totalOverdue: 0,
        currentlyOut: 0,
      };

      (borrowings || []).forEach((b) => {
        if (b.status === 'borrowed') {
          stats.totalBorrowed += b.quantity;
          stats.currentlyOut += b.quantity;
        } else if (b.status === 'returned') {
          stats.totalReturned += b.quantity;
        } else if (b.status === 'overdue') {
          stats.totalOverdue += b.quantity;
          stats.currentlyOut += b.quantity;
        }
      });

      return stats;
    },
  });
}
