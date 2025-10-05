import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Calendar,
  DollarSign,
  CreditCard,
  PiggyBank,
  Banknote,
  User,
  Download,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FinancialEntry {
  entry_id: string;
  property_id: string;
  entry_date: string;
  description: string;
  credit: number;
  debit: number;
  balance: number;
  scheduled_balance: number;
  entry_type: string;
  created_at?: string;
  updated_at?: string;
}

interface FinancialTabOptimizedProps {
  propertyId: string;
}

// Query keys
const financialKeys = {
  all: (propertyId: string) => ['financial', propertyId] as const,
  monthly: (propertyId: string, month: string) => ['financial', propertyId, month] as const,
};

// Fetch financial entries
const fetchFinancialEntries = async (propertyId: string, month?: string): Promise<FinancialEntry[]> => {
  console.log('🔍 [FinancialTab] fetchFinancialEntries called:', { propertyId, month });

  let query = supabase
    .from('property_financial_entries')
    .select('*')
    .eq('property_id', propertyId)
    .order('entry_date', { ascending: true });

  if (month) {
    // Create proper date range for the month
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); // Last day of the month

    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    console.log('📅 [FinancialTab] Date range filter:', {
      month,
      startDate: startDateString,
      endDate: endDateString
    });

    query = query.gte('entry_date', startDateString).lte('entry_date', endDateString);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ [FinancialTab] fetchFinancialEntries error:', error);
    throw error;
  }

  console.log('✅ [FinancialTab] fetchFinancialEntries success:', {
    count: data?.length || 0,
    entries: data
  });

  return data || [];
};

// Batch Entry Modal Component
interface BatchEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  onSuccess: () => void;
}

function BatchEntryModal({ isOpen, onClose, propertyId, onSuccess }: BatchEntryModalProps) {
  const { toast } = useToast();
  const [batchData, setBatchData] = useState({
    description: '',
    value: 0,
    entryType: 'credit' as 'credit' | 'debit',
    scheduled: false,
    day: 1,
    year: new Date().getFullYear(),
    selectedMonths: [] as string[],
  });

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const createBatchEntries = useMutation({
    mutationFn: async () => {
      console.log('📦 [FinancialTab] Creating batch entries:', batchData);

      const entries = batchData.selectedMonths.map((monthIndex) => {
        const month = String(parseInt(monthIndex) + 1).padStart(2, '0');
        const day = String(batchData.day).padStart(2, '0');
        const entryDate = `${batchData.year}-${month}-${day}`;

        return {
          property_id: propertyId,
          entry_date: entryDate,
          description: batchData.description,
          credit: batchData.entryType === 'credit' ? batchData.value : 0,
          debit: batchData.entryType === 'debit' ? batchData.value : 0,
          balance: 0,
          scheduled_balance: 0,
          entry_type: batchData.entryType,
        };
      });

      console.log('📋 [FinancialTab] Batch entries to insert:', entries);

      const { data, error } = await supabase
        .from('property_financial_entries')
        .insert(entries)
        .select();

      if (error) {
        console.error('❌ [FinancialTab] Batch entries error:', error);
        throw error;
      }

      console.log('✅ [FinancialTab] Batch entries created:', data);
      return data;
    },
    onSuccess: () => {
      onSuccess();
      onClose();
      setBatchData({
        description: '',
        value: 0,
        entryType: 'credit',
        scheduled: false,
        day: 1,
        year: new Date().getFullYear(),
        selectedMonths: [],
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create batch entries',
        variant: 'destructive',
      });
    },
  });

  const handleMonthToggle = (monthIndex: string) => {
    setBatchData(prev => ({
      ...prev,
      selectedMonths: prev.selectedMonths.includes(monthIndex)
        ? prev.selectedMonths.filter(m => m !== monthIndex)
        : [...prev.selectedMonths, monthIndex]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Description is required',
        variant: 'destructive',
      });
      return;
    }
    if (batchData.value <= 0) {
      toast({
        title: 'Error',
        description: 'Value must be greater than 0',
        variant: 'destructive',
      });
      return;
    }
    if (batchData.selectedMonths.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one month',
        variant: 'destructive',
      });
      return;
    }
    (async () => {
      try {
        await createBatchEntries.mutateAsync();
      } catch (error) {
        console.error('❌ [FinancialTab] createBatchEntries failed:', error);
      }
    })();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Entry in batch</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch-description">Description</Label>
                <Input
                  id="batch-description"
                  value={batchData.description}
                  onChange={(e) => setBatchData({ ...batchData, description: e.target.value })}
                  placeholder="Enter description..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-value">Value</Label>
                <Input
                  id="batch-value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={batchData.value}
                  onChange={(e) => setBatchData({ ...batchData, value: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch-entry-type">Entry Type</Label>
                <Select
                  value={batchData.entryType}
                  onValueChange={(value: 'credit' | 'debit') => setBatchData({ ...batchData, entryType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="batch-scheduled"
                  checked={batchData.scheduled}
                  onChange={(e) => setBatchData({ ...batchData, scheduled: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="batch-scheduled">Scheduled</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Button type="button" className="bg-green-500 hover:bg-green-600 text-white" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch-day">Day</Label>
                <Input
                  id="batch-day"
                  type="number"
                  min="1"
                  max="31"
                  value={batchData.day}
                  onChange={(e) => setBatchData({ ...batchData, day: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-year">Year</Label>
                <Input
                  id="batch-year"
                  type="number"
                  min="2020"
                  max="2030"
                  value={batchData.year}
                  onChange={(e) => setBatchData({ ...batchData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Months</Label>
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                (The above amount will be released in the months checked below.)
              </div>
              <div className="grid grid-cols-6 gap-2">
                {months.map((month, index) => (
                  <div key={month} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`month-${index}`}
                      checked={batchData.selectedMonths.includes(String(index))}
                      onChange={() => handleMonthToggle(String(index))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`month-${index}`} className="text-sm">{month}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createBatchEntries.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            >
              {createBatchEntries.isPending ? 'Creating...' : 'Create Batch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Owner Payment Modal Component
interface OwnerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  onSuccess: () => void;
}

function OwnerPaymentModal({ isOpen, onClose, propertyId, onSuccess }: OwnerPaymentModalProps) {
  const { toast } = useToast();
  const [paymentData, setPaymentData] = useState({
    description: '',
    value: 0,
    date: new Date().toISOString().split('T')[0],
    scheduled: false,
    paymentType: 'credit' as 'credit' | 'debit' | 'owner',
  });

  const createOwnerPayment = useMutation({
    mutationFn: async () => {
      console.log('💰 [FinancialTab] Creating owner payment:', { paymentData, propertyId });

      const insertData = {
        property_id: propertyId,
        entry_date: paymentData.date,
        description: paymentData.description,
        credit: paymentData.paymentType === 'credit' ? paymentData.value : 0,
        debit: paymentData.paymentType === 'debit' ? paymentData.value : 0,
        balance: 0,
        scheduled_balance: 0,
        entry_type: paymentData.paymentType === 'owner' ? 'owner_payment' : paymentData.paymentType,
      };

      console.log('📋 [FinancialTab] Insert data:', insertData);

      const { data, error } = await supabase
        .from('property_financial_entries')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ [FinancialTab] Owner payment error:', error);
        throw error;
      }

      console.log('✅ [FinancialTab] Owner payment created:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('🔄 [FinancialTab] Owner payment success, calling onSuccess callback:', data);

      setPaymentData({
        description: '',
        value: 0,
        date: new Date().toISOString().split('T')[0],
        scheduled: false,
        paymentType: 'credit',
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error('❌ [FinancialTab] Owner payment mutation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create owner payment',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Description is required',
        variant: 'destructive',
      });
      return;
    }
    if (paymentData.value <= 0) {
      toast({
        title: 'Error',
        description: 'Value must be greater than 0',
        variant: 'destructive',
      });
      return;
    }
    (async () => {
      try {
        await createOwnerPayment.mutateAsync();
      } catch (error) {
        console.error('❌ [FinancialTab] createOwnerPayment failed:', error);
      }
    })();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Credits</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="owner-description">Description</Label>
              <Input
                id="owner-description"
                value={paymentData.description}
                onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                placeholder=""
                required
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-type">Type</Label>
                <Select
                  value={paymentData.paymentType}
                  onValueChange={(value: 'credit' | 'debit' | 'owner') => setPaymentData({ ...paymentData, paymentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-value">Value</Label>
                <Input
                  id="owner-value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentData.value}
                  onChange={(e) => setPaymentData({ ...paymentData, value: parseFloat(e.target.value) || 0 })}
                  placeholder=""
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-date">Date</Label>
                <Input
                  id="owner-date"
                  type="date"
                  value={paymentData.date}
                  onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="owner-scheduled"
                  checked={paymentData.scheduled}
                  onChange={(e) => setPaymentData({ ...paymentData, scheduled: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="owner-scheduled">Scheduled</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Button type="button" className="bg-green-500 hover:bg-green-600 text-white" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createOwnerPayment.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              {createOwnerPayment.isPending ? 'Saving...' : 'Save Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FinancialTabOptimized({ propertyId }: FinancialTabOptimizedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [entryType, setEntryType] = useState<'credit' | 'debit' | 'owner_payment' | 'batch_entry'>('credit');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showOwnerPaymentModal, setShowOwnerPaymentModal] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null);

  const emptyEntry = {
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    credit: 0,
    debit: 0,
    balance: 0,
    scheduled_balance: 0,
    entry_type: 'credit',
  };

  const [formData, setFormData] = useState(emptyEntry);

  // Fetch entries query
  const {
    data: entries = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: financialKeys.monthly(propertyId, selectedMonth),
    queryFn: () => {
      console.log('🔄 [FinancialTab] useQuery queryFn triggered:', { propertyId, selectedMonth });
      return fetchFinancialEntries(propertyId, selectedMonth);
    },
    enabled: !!propertyId && !!selectedMonth,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (entryData: Omit<FinancialEntry, 'entry_id' | 'created_at' | 'updated_at' | 'property_id'>) => {
      console.log('💾 [FinancialTab] Creating entry:', { entryData, propertyId });

      const { data, error } = await supabase
        .from('property_financial_entries')
        .insert([{ ...entryData, property_id: propertyId }])
        .select()
        .single();

      if (error) {
        console.error('❌ [FinancialTab] Create entry error:', error);
        throw error;
      }

      console.log('✅ [FinancialTab] Entry created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('🔄 [FinancialTab] Invalidating queries after create:', {
        queryKey: financialKeys.monthly(propertyId, selectedMonth),
        createdEntry: data
      });

      queryClient.invalidateQueries({ queryKey: financialKeys.monthly(propertyId, selectedMonth) });
      toast({
        title: '✅ Entry Created Successfully',
        description: `${data.entry_type === 'credit' ? 'Credit' : 'Debit'} entry of $${(data.credit || data.debit).toFixed(2)} has been added to ${data.description}`,
        className: 'border-green-200 bg-green-50 text-green-800',
      });
      resetForm();
    },
    onError: (error) => {
      console.error('❌ [FinancialTab] Create mutation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create entry',
        variant: 'destructive',
      });
    },
  });

  // Update entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async ({ entryId, updates }: { entryId: string; updates: Partial<FinancialEntry> }) => {
      const { data, error } = await supabase
        .from('property_financial_entries')
        .update(updates)
        .eq('entry_id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financialKeys.monthly(propertyId, selectedMonth) });
      toast({
        title: '✅ Entry Updated Successfully',
        description: `Financial entry "${data.description}" has been updated with your changes`,
        className: 'border-blue-200 bg-blue-50 text-blue-800',
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update entry',
        variant: 'destructive',
      });
    },
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('property_financial_entries')
        .delete()
        .eq('entry_id', entryId);

      if (error) throw error;
      return entryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialKeys.monthly(propertyId, selectedMonth) });
      toast({
        title: '🗑️ Entry Deleted Successfully',
        description: 'The financial entry has been permanently removed from your records',
        className: 'border-red-200 bg-red-50 text-red-800',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete entry',
        variant: 'destructive',
      });
    },
  });

  // Duplicate entry mutation
  const duplicateEntryMutation = useMutation({
    mutationFn: async (entry: FinancialEntry) => {
      const duplicateData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Copy of ${entry.description}`,
        credit: entry.credit,
        debit: entry.debit,
        balance: entry.balance,
        scheduled_balance: entry.scheduled_balance,
        entry_type: entry.entry_type,
      };

      const { data, error } = await supabase
        .from('property_financial_entries')
        .insert([{ ...duplicateData, property_id: propertyId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financialKeys.monthly(propertyId, selectedMonth) });
      toast({
        title: '📋 Entry Duplicated Successfully',
        description: `A copy of "${data.description}" has been created with today's date`,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate entry',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Description is required',
        variant: 'destructive',
      });
      return;
    }

    const amount = formData.credit > 0 ? formData.credit : formData.debit;
    if (amount <= 0) {
      toast({
        title: 'Error',
        description: 'Amount must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    if (editingEntry) {
      // Show confirmation dialog for updates
      setShowUpdateConfirm(true);
    } else {
      (async () => {
        try {
          await createEntryMutation.mutateAsync(formData as Omit<FinancialEntry, 'entry_id' | 'created_at' | 'updated_at'>);
        } catch (error) {
          console.error('❌ [FinancialTab] createEntry failed:', error);
        }
      })();
    }
  };

  const confirmUpdate = () => {
    if (editingEntry) {
      (async () => {
        try {
          await updateEntryMutation.mutateAsync({ entryId: editingEntry.entry_id, updates: formData } as { entryId: string; updates: Partial<FinancialEntry> });
        } catch (error) {
          console.error('❌ [FinancialTab] updateEntry failed:', error);
        }
      })();
    }
    setShowUpdateConfirm(false);
  };

  const handleDelete = (entry: FinancialEntry) => {
    setEntryToDelete(entry);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      (async () => {
        try {
          await deleteEntryMutation.mutateAsync(entryToDelete.entry_id);
        } catch (error) {
          console.error('❌ [FinancialTab] deleteEntry failed:', error);
        }
      })();
    }
    setShowDeleteConfirm(false);
    setEntryToDelete(null);
  };

  const startEdit = (entry: FinancialEntry) => {
    setEditingEntry(entry);
    setFormData({
      entry_date: entry.entry_date,
      description: entry.description,
      credit: entry.credit,
      debit: entry.debit,
      balance: entry.balance,
      scheduled_balance: entry.scheduled_balance,
      entry_type: entry.entry_type,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData(emptyEntry);
    setEditingEntry(null);
    setShowForm(false);
  };

  const openFormWithType = (type: 'credit' | 'debit' | 'owner_payment' | 'batch_entry') => {
    setEntryType(type);

    if (type === 'batch_entry') {
      setShowBatchModal(true);
    } else if (type === 'owner_payment') {
      setShowOwnerPaymentModal(true);
    } else {
      setFormData({
        ...emptyEntry,
        entry_type: type,
        description: getDefaultDescription(type),
      });
      setShowForm(true);
    }
  };

  const getDefaultDescription = (type: string) => {
    switch (type) {
      case 'credit': return 'Income entry';
      case 'debit': return 'Expense entry';
      case 'owner_payment': return 'Owner payment';
      case 'batch_entry': return 'Batch entry';
      default: return '';
    }
  };

  const loadMonthData = () => {
    queryClient.invalidateQueries({ queryKey: financialKeys.monthly(propertyId, selectedMonth) });
  };

  // Calculate balances
  const calculateBalances = () => {
    let runningBalance = 0;
    const entriesWithBalance = (entries as FinancialEntry[]).map(entry => {
      runningBalance += entry.credit - entry.debit;
      return { ...entry, calculatedBalance: runningBalance };
    });

    const initialBalance = (entries as FinancialEntry[]).length > 0 ? (entries as FinancialEntry[])[0].balance - ((entries as FinancialEntry[])[0].credit - (entries as FinancialEntry[])[0].debit) : 0;
    const finalBalance = runningBalance;

    return { entriesWithBalance, initialBalance, finalBalance };
  };

  const { entriesWithBalance, initialBalance, finalBalance } = calculateBalances();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Action Buttons */}
      <Card className="border-l-4 border-l-blue-500 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-blue-600" />
                Financial Entries
              </CardTitle>
              <p className="text-slate-600 mt-1">Manage property financial transactions and records</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => openFormWithType('owner_payment')}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Payment
              </Button>
              <Button
                onClick={() => openFormWithType('batch_entry')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                size="sm"
              >
                <Banknote className="mr-2 h-4 w-4" />
                Batch Entry
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Monthly Filter */}
      <Card className="shadow-md">
        <CardContent className="p-6 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-slate-600" />
              <Label htmlFor="month-select" className="font-semibold text-slate-700">Filter by Month:</Label>
              <Input
                id="month-select"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <Button
                onClick={loadMonthData}
                disabled={isFetching}
                className="bg-slate-600 hover:bg-slate-700 text-white shadow-md"
              >
                {isFetching ? 'Loading...' : 'Apply Filter'}
              </Button>
            </div>
            <div className="text-sm text-slate-600">
              Showing entries for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100 border-b-2 border-slate-200">
                <TableHead className="font-bold text-slate-700 py-4">Date</TableHead>
                <TableHead className="font-bold text-slate-700">Description</TableHead>
                <TableHead className="font-bold text-slate-700 text-right">Credit</TableHead>
                <TableHead className="font-bold text-slate-700 text-right">Debit</TableHead>
                <TableHead className="font-bold text-slate-700 text-right">Balance</TableHead>
                <TableHead className="font-bold text-slate-700 text-right">Scheduled Balance</TableHead>
                <TableHead className="font-bold text-slate-700 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Initial Balance Row */}
              <TableRow className="bg-blue-50">
                <TableCell className="font-medium">-</TableCell>
                <TableCell className="font-medium">Initial Balance</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-bold text-red-600">
                  {initialBalance.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-bold text-red-600">
                  {initialBalance.toFixed(2)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>

              {/* Entry Rows */}
              {entriesWithBalance.map((entry, index) => (
                <TableRow key={entry.entry_id} className="hover:bg-gray-50">
                  <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-right">
                    {entry.credit > 0 ? entry.credit.toFixed(2) : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.debit > 0 ? entry.debit.toFixed(2) : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={entry.calculatedBalance < 0 ? 'text-red-600' : 'text-green-600'}>
                      {entry.calculatedBalance.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={entry.scheduled_balance < 0 ? 'text-red-600' : 'text-green-600'}>
                      {entry.scheduled_balance.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(entry)}
                        className="h-8 w-8 p-0 border-blue-300 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                        title="Edit"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await duplicateEntryMutation.mutateAsync(entry as FinancialEntry);
                          } catch (error) {
                            console.error('❌ [FinancialTab] duplicateEntry failed:', error);
                          }
                        }}
                        className="h-8 w-8 p-0 border-emerald-300 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
                        title="Duplicate"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(entry)}
                        className="h-8 w-8 p-0 border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Final Balance Row */}
              <TableRow className="bg-gray-100 font-bold">
                <TableCell className="font-bold">-</TableCell>
                <TableCell className="font-bold">Final Balance</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-bold text-red-600">
                  {finalBalance.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-bold text-red-600">
                  {finalBalance.toFixed(2)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {entriesWithBalance.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No financial entries found</h3>
              <p className="text-gray-600 mb-4">No entries found for {selectedMonth}. Try selecting a different month or add a new entry.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? 'Edit Financial Entry' : `Add ${entryType.replace('_', ' ').toUpperCase()} Entry`}
              </DialogTitle>
              <DialogDescription>
                {editingEntry
                  ? 'Update the financial entry information below.'
                  : `Add a new ${entryType.replace('_', ' ')} entry for this property.`}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entry_date">Date *</Label>
                  <Input
                    id="entry_date"
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry_type">Type *</Label>
                  <Select
                    value={formData.entry_type}
                    onValueChange={(value) => setFormData({ ...formData, entry_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="debit">Debit</SelectItem>
                      <SelectItem value="owner_payment">Owner Payment</SelectItem>
                      <SelectItem value="batch_entry">Batch Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credit">Credit Amount</Label>
                  <Input
                    id="credit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.credit}
                    onChange={(e) => setFormData({ ...formData, credit: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debit">Debit Amount</Label>
                  <Input
                    id="debit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.debit}
                    onChange={(e) => setFormData({ ...formData, debit: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="balance">Balance</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_balance">Scheduled Balance</Label>
                  <Input
                    id="scheduled_balance"
                    type="number"
                    step="0.01"
                    value={formData.scheduled_balance}
                    onChange={(e) => setFormData({ ...formData, scheduled_balance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEntryMutation.isPending || updateEntryMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createEntryMutation.isPending || updateEntryMutation.isPending
                  ? 'Saving...'
                  : editingEntry
                  ? 'Update Entry'
                  : 'Add Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Batch Entry Modal */}
      <BatchEntryModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        propertyId={propertyId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: financialKeys.monthly(propertyId, selectedMonth) });
          toast({
            title: '📦 Batch Entries Created Successfully',
            description: 'All selected entries have been created and added to your financial records',
            className: 'border-indigo-200 bg-indigo-50 text-indigo-800',
          });
        }}
      />

      {/* Owner Payment Modal */}
      <OwnerPaymentModal
        isOpen={showOwnerPaymentModal}
        onClose={() => setShowOwnerPaymentModal(false)}
        propertyId={propertyId}
        onSuccess={() => {
          console.log('🎉 [FinancialTab] Payment success callback triggered');
          console.log('🔄 [FinancialTab] Invalidating and refetching queries:', {
            allKey: financialKeys.all(propertyId),
            monthlyKey: financialKeys.monthly(propertyId, selectedMonth),
            selectedMonth
          });

          queryClient.invalidateQueries({ queryKey: financialKeys.all(propertyId) });
          queryClient.invalidateQueries({ queryKey: financialKeys.monthly(propertyId, selectedMonth) });
          queryClient.refetchQueries({ queryKey: financialKeys.monthly(propertyId, selectedMonth) });

          toast({
            title: '💰 Payment Created Successfully',
            description: 'Your payment has been recorded and will appear in the financial entries table',
            className: 'border-blue-200 bg-blue-50 text-blue-800',
          });
        }}
      />

      {/* Update Confirmation Dialog */}
      <AlertDialog open={showUpdateConfirm} onOpenChange={setShowUpdateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Confirm Update
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update this financial entry? This action will modify the existing record with the new information you've entered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-4">
            <div className="text-sm text-blue-800">
              <strong>Entry Details:</strong>
              <div className="mt-1">
                <div>Description: {formData.description}</div>
                <div>Date: {new Date(formData.entry_date).toLocaleDateString()}</div>
                <div>
                  Amount: {formData.credit > 0 ? `$${formData.credit.toFixed(2)} (Credit)` : `$${formData.debit.toFixed(2)} (Debit)`}
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setShowUpdateConfirm(false)}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUpdate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Yes, Update Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this financial entry? This action cannot be undone and will permanently remove the record from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {entryToDelete && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 my-4">
              <div className="text-sm text-red-800">
                <strong>Entry to Delete:</strong>
                <div className="mt-1">
                  <div>Description: {entryToDelete.description}</div>
                  <div>Date: {new Date(entryToDelete.entry_date).toLocaleDateString()}</div>
                  <div>
                    Amount: {entryToDelete.credit > 0 ? `$${entryToDelete.credit.toFixed(2)} (Credit)` : `$${entryToDelete.debit.toFixed(2)} (Debit)`}
                  </div>
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteConfirm(false);
                setEntryToDelete(null);
              }}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Delete Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}