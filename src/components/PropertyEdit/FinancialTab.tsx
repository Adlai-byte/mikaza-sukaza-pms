import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  DollarSign,
  Plus,
  Minus,
  Users,
  Layers,
  RefreshCw,
  Edit,
  Trash2,
  Check,
  CheckCircle,
  AlertCircle,
  Download,
  Paperclip,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Wrench,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  usePropertyFinancialEntries,
  usePropertyInitialBalance,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useMarkEntryAsDone,
  useApproveEntry,
} from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { useBulkCreateExpenseAttachments } from '@/hooks/useExpenseAttachments';
import { useBulkCreateExpenseNotes, useExpenseNotes } from '@/hooks/useExpenseNotes';
import { useExpenseAttachments, useDeleteExpenseAttachment } from '@/hooks/useExpenseAttachments';
import { useDeleteExpenseNote } from '@/hooks/useExpenseNotes';
import { Expense, ExpenseInsert } from '@/lib/schemas';
import { FinancialEntryDialog } from './FinancialEntryDialog';
import { BatchEntryDialog } from './BatchEntryDialog';
import { ExpandedEntryContent } from './ExpandedEntryContent';
import { PendingAttachment } from './AttachmentUploadSection';
import { PendingNote } from './NotesManagementSection';
import { useTranslation } from 'react-i18next';

interface FinancialTabProps {
  propertyId: string;
  propertyName: string;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

export function FinancialTab({ propertyId, propertyName }: FinancialTabProps) {
  const { t } = useTranslation();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Dialog states
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [entryType, setEntryType] = useState<'credit' | 'debit' | 'owner_payment' | 'service_cost'>('debit');
  const [editingEntry, setEditingEntry] = useState<Expense | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<Expense | null>(null);

  // Auth for approval
  const { user } = useAuth();

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch financial entries
  const { entries, loading, refetch, scheduleBalance } = usePropertyFinancialEntries(
    propertyId,
    selectedMonth,
    selectedYear
  );

  // Fetch initial balance (balance from previous months)
  const { initialBalance, loading: loadingInitialBalance } = usePropertyInitialBalance(
    propertyId,
    selectedMonth,
    selectedYear
  );

  // Mutations
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const markAsDone = useMarkEntryAsDone();
  const approveEntry = useApproveEntry();
  const bulkCreateAttachments = useBulkCreateExpenseAttachments();
  const bulkCreateNotes = useBulkCreateExpenseNotes();
  const deleteAttachment = useDeleteExpenseAttachment();
  const deleteNote = useDeleteExpenseNote();

  // Fetch attachments/notes for editing entry
  const { data: editingAttachments = [] } = useExpenseAttachments(editingEntry?.expense_id || null);
  const { data: editingNotes = [] } = useExpenseNotes(editingEntry?.expense_id || null);

  // Toggle row expansion
  const toggleRowExpansion = useCallback((expenseId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(expenseId)) {
        next.delete(expenseId);
      } else {
        next.add(expenseId);
      }
      return next;
    });
  }, []);

  // Calculate totals (service_cost is a deduction like debit)
  const totals = entries.reduce(
    (acc, entry) => {
      const amount = entry.amount || 0;
      if (entry.entry_type === 'credit') {
        acc.totalCredit += amount;
      } else {
        // debit, owner_payment, and service_cost are all deductions
        acc.totalDebit += amount;
      }
      return acc;
    },
    { totalCredit: 0, totalDebit: 0 }
  );

  // Calculate final balance (initial + credits - debits for current month)
  const finalBalance = initialBalance + totals.totalCredit - totals.totalDebit;

  const handleOpenEntryDialog = (type: 'credit' | 'debit' | 'owner_payment' | 'service_cost', entry?: Expense) => {
    setEntryType(type);
    setEditingEntry(entry || null);
    setShowEntryDialog(true);
  };

  const handleApproveEntry = async (entry: Expense) => {
    if (!entry.expense_id || !user?.id) return;
    try {
      await approveEntry.mutateAsync({
        expenseId: entry.expense_id,
        approvedBy: user.id,
      });
      // No need for refetch() - mutation already handles cache invalidation
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEntrySubmit = async (
    data: ExpenseInsert,
    pendingAttachments: PendingAttachment[],
    pendingNotes: PendingNote[]
  ) => {
    try {
      let expenseId: string;

      if (editingEntry?.expense_id) {
        await updateExpense.mutateAsync({
          expenseId: editingEntry.expense_id,
          updates: data,
        });
        expenseId = editingEntry.expense_id;
      } else {
        const created = await createExpense.mutateAsync({
          ...data,
          property_id: propertyId,
          entry_type: entryType,
        });
        expenseId = created.expense_id!;
      }

      // Upload pending attachments
      if (pendingAttachments.length > 0) {
        await bulkCreateAttachments.mutateAsync({
          expenseId,
          files: pendingAttachments.map(a => ({ file: a.file, caption: a.caption })),
        });
      }

      // Create pending notes
      if (pendingNotes.length > 0) {
        await bulkCreateNotes.mutateAsync({
          expenseId,
          notes: pendingNotes.map(n => ({ text: n.text })),
        });
      }

      setShowEntryDialog(false);
      setEditingEntry(null);
      // No need for refetch() - mutations already handle cache invalidation
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleBatchSubmit = async (entries: ExpenseInsert[]) => {
    try {
      for (const entry of entries) {
        await createExpense.mutateAsync({
          ...entry,
          property_id: propertyId,
        });
      }
      setShowBatchDialog(false);
      // No need for refetch() - mutations already handle cache invalidation
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete?.expense_id) return;
    try {
      await deleteExpense.mutateAsync(entryToDelete.expense_id);
      setEntryToDelete(null);
      // No need for refetch() - mutation already handles cache invalidation
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleMarkAsDone = async (entry: Expense) => {
    if (!entry.expense_id) return;
    try {
      await markAsDone.mutateAsync(entry.expense_id);
      // No need for refetch() - mutation already handles cache invalidation
    } catch (error) {
      // Error handled by mutation
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getEntryTypeBadge = (type: string | undefined) => {
    switch (type) {
      case 'credit':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Credit</Badge>;
      case 'debit':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Debit</Badge>;
      case 'service_cost':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Service Cost</Badge>;
      case 'owner_payment':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Owner Payment</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Financial Entries
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage financial entries for {propertyName}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <Card className="shadow-sm border-0 bg-card/60">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => handleOpenEntryDialog('credit')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Credit
            </Button>
            <Button
              type="button"
              onClick={() => handleOpenEntryDialog('debit')}
              className="bg-red-600 hover:bg-red-700"
            >
              <Minus className="mr-2 h-4 w-4" />
              Debit
            </Button>
            <Button
              type="button"
              onClick={() => handleOpenEntryDialog('service_cost')}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Wrench className="mr-2 h-4 w-4" />
              Service Cost
            </Button>
            <Button
              type="button"
              onClick={() => handleOpenEntryDialog('owner_payment')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Users className="mr-2 h-4 w-4" />
              Owner Payment
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBatchDialog(true)}
            >
              <Layers className="mr-2 h-4 w-4" />
              Batch Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Month/Year Filter */}
      <Card className="shadow-sm border-0 bg-card/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Monthly Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading && (
              <div className="flex items-center text-muted-foreground">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600">Initial Balance</p>
              <p className={`text-xl font-bold ${initialBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                {loadingInitialBalance ? '...' : formatCurrency(initialBalance)}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">Total Credit</p>
              <p className="text-xl font-bold text-green-900">{formatCurrency(totals.totalCredit)}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">Total Debit</p>
              <p className="text-xl font-bold text-red-900">{formatCurrency(totals.totalDebit)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">Month Balance</p>
              <p className={`text-xl font-bold ${totals.totalCredit - totals.totalDebit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                {formatCurrency(totals.totalCredit - totals.totalDebit)}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700">Schedule Balance</p>
              <p className={`text-xl font-bold ${scheduleBalance >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                {formatCurrency(scheduleBalance)}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
              <p className="text-sm text-emerald-700 font-medium">Final Balance</p>
              <p className={`text-xl font-bold ${finalBalance >= 0 ? 'text-emerald-900' : 'text-red-600'}`}>
                {loadingInitialBalance ? '...' : formatCurrency(finalBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card className="shadow-sm border-0 bg-card/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No financial entries for {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => handleOpenEntryDialog('debit')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add First Entry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-center">Files</TableHead>
                    <TableHead className="text-center">Notes</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Approved</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Initial Balance Row */}
                  <TableRow className="bg-slate-100/70 border-b-2 border-slate-300">
                    <TableCell></TableCell>
                    <TableCell className="font-semibold text-slate-600">
                      {format(new Date(selectedYear, selectedMonth - 1, 1), 'MMM 01, yyyy')}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700" colSpan={2}>
                      Initial Balance (from previous periods)
                    </TableCell>
                    <TableCell className="text-right font-medium">-</TableCell>
                    <TableCell className="text-right font-medium">-</TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={initialBalance >= 0 ? 'text-slate-700' : 'text-red-600'}>
                        {loadingInitialBalance ? '...' : formatCurrency(initialBalance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                  </TableRow>

                  {entries.map((entry, index) => {
                    // Adjust running balance to include initial balance
                    const adjustedRunningBalance = initialBalance + (entry.running_balance || 0);
                    const isExpanded = expandedRows.has(entry.expense_id!);
                    const attachmentCount = entry.attachment_count || 0;
                    const noteCount = entry.note_count || 0;
                    return (
                    <React.Fragment key={entry.expense_id}>
                      <TableRow
                        className={`${entry.is_paid ? 'bg-green-50/50' : ''} ${isExpanded ? 'border-b-0' : ''} cursor-pointer hover:bg-muted/50`}
                        onClick={() => entry.expense_id && toggleRowExpansion(entry.expense_id)}
                      >
                        <TableCell className="w-10">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              entry.expense_id && toggleRowExpansion(entry.expense_id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {entry.expense_date
                            ? format(parseISO(entry.expense_date), 'MMM dd, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.description}</p>
                            {entry.is_scheduled && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Scheduled
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getEntryTypeBadge(entry.entry_type)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {entry.entry_type === 'credit' ? formatCurrency(entry.amount) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {entry.entry_type !== 'credit' ? formatCurrency(entry.amount) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={adjustedRunningBalance >= 0 ? 'text-blue-600' : 'text-red-600'}>
                            {formatCurrency(adjustedRunningBalance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {attachmentCount > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              <Paperclip className="h-3 w-3 mr-1" />
                              {attachmentCount}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {noteCount > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {noteCount}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.is_paid ? (
                            <Badge className="bg-green-100 text-green-700">Paid</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {entry.is_approved ? (
                            <Badge className="bg-blue-100 text-blue-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleApproveEntry(entry)}
                              disabled={approveEntry.isPending}
                              title="Approve entry for reports"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEntryDialog(entry.entry_type as any, entry)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setEntryToDelete(entry)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            {!entry.is_paid && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMarkAsDone(entry)}
                                title="Mark as Paid"
                              >
                                <DollarSign className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Expanded Content */}
                      {isExpanded && entry.expense_id && (
                        <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                          <TableCell colSpan={12} className="p-0">
                            <ExpandedEntryContent expenseId={entry.expense_id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                  })}

                  {/* Final Balance Row */}
                  <TableRow className="bg-emerald-100/70 border-t-2 border-emerald-300">
                    <TableCell></TableCell>
                    <TableCell className="font-semibold text-emerald-700">
                      {format(new Date(selectedYear, selectedMonth, 0), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-800" colSpan={2}>
                      Final Balance (end of period)
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-700">
                      {formatCurrency(totals.totalCredit)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-700">
                      {formatCurrency(totals.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      <span className={finalBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                        {loadingInitialBalance ? '...' : formatCurrency(finalBalance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry Dialog */}
      <FinancialEntryDialog
        open={showEntryDialog}
        onOpenChange={setShowEntryDialog}
        onSubmit={handleEntrySubmit}
        entryType={entryType}
        editingEntry={editingEntry}
        existingAttachments={editingAttachments}
        existingNotes={editingNotes}
        onDeleteAttachment={(attachmentId) => deleteAttachment.mutate(attachmentId)}
        onDeleteNote={(noteId) => deleteNote.mutate(noteId)}
        isSubmitting={createExpense.isPending || updateExpense.isPending}
      />

      {/* Batch Entry Dialog */}
      <BatchEntryDialog
        open={showBatchDialog}
        onOpenChange={setShowBatchDialog}
        onSubmit={handleBatchSubmit}
        propertyId={propertyId}
        isSubmitting={createExpense.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this financial entry? This action cannot be undone.
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="font-medium">{entryToDelete?.description}</p>
                <p className="text-sm text-muted-foreground">
                  Amount: {formatCurrency(entryToDelete?.amount)}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
