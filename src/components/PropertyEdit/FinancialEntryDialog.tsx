import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Minus, Users, Save, X } from 'lucide-react';
import { Expense, ExpenseInsert, ExpenseAttachment, ExpenseNote } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { AttachmentUploadSection, PendingAttachment } from './AttachmentUploadSection';
import { NotesManagementSection, PendingNote } from './NotesManagementSection';

interface FinancialEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExpenseInsert, pendingAttachments: PendingAttachment[], pendingNotes: PendingNote[]) => void;
  entryType: 'credit' | 'debit' | 'owner_payment';
  editingEntry: Expense | null;
  existingAttachments?: ExpenseAttachment[];
  existingNotes?: ExpenseNote[];
  onDeleteAttachment?: (attachmentId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  isSubmitting: boolean;
}

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

export function FinancialEntryDialog({
  open,
  onOpenChange,
  onSubmit,
  entryType,
  editingEntry,
  existingAttachments = [],
  existingNotes = [],
  onDeleteAttachment,
  onDeleteNote,
  isSubmitting,
}: FinancialEntryDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDay, setScheduledDay] = useState('1');
  const [scheduledMonths, setScheduledMonths] = useState<number[]>([]);
  const [category, setCategory] = useState<string>('other');

  // Multi-attachment state
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  // Multi-notes state
  const [pendingNotes, setPendingNotes] = useState<PendingNote[]>([]);

  // Get current user display name
  const currentUserName = user?.user_metadata?.first_name && user?.user_metadata?.last_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
    : user?.email?.split('@')[0] || 'Unknown';

  // Reset form when dialog opens/closes or editing entry changes
  useEffect(() => {
    if (open) {
      if (editingEntry) {
        setDescription(editingEntry.description || '');
        setAmount(editingEntry.amount?.toString() || '');
        setExpenseDate(editingEntry.expense_date || '');
        setIsScheduled(editingEntry.is_scheduled || false);
        setScheduledDay(editingEntry.scheduled_day?.toString() || '1');
        setScheduledMonths(editingEntry.scheduled_months || []);
        setCategory(editingEntry.category || 'other');
      } else {
        // Reset to defaults for new entry
        setDescription('');
        setAmount('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setIsScheduled(false);
        setScheduledDay('1');
        setScheduledMonths([]);
        setCategory('other');
      }
      // Always reset pending items
      setPendingAttachments([]);
      setPendingNotes([]);
    }
  }, [open, editingEntry]);

  // Attachment handlers
  const handleAddFiles = useCallback((files: File[]) => {
    const newAttachments: PendingAttachment[] = files.map((file, index) => ({
      id: `pending-${Date.now()}-${index}`,
      file,
      caption: '',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const handleRemovePendingAttachment = useCallback((id: string) => {
    setPendingAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const handleCaptionChange = useCallback((id: string, caption: string) => {
    setPendingAttachments(prev =>
      prev.map(a => a.id === id ? { ...a, caption } : a)
    );
  }, []);

  // Note handlers
  const handleAddNote = useCallback((text: string) => {
    const newNote: PendingNote = {
      id: `pending-note-${Date.now()}`,
      text,
      timestamp: new Date().toISOString(),
      authorName: currentUserName,
    };
    setPendingNotes(prev => [...prev, newNote]);
  }, [currentUserName]);

  const handleRemovePendingNote = useCallback((id: string) => {
    setPendingNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: ExpenseInsert = {
      property_id: editingEntry?.property_id || '', // Will be set by parent
      description,
      amount: parseFloat(amount) || 0,
      expense_date: expenseDate,
      entry_type: entryType,
      is_scheduled: isScheduled,
      scheduled_day: isScheduled ? parseInt(scheduledDay) : null,
      scheduled_months: isScheduled ? scheduledMonths : null,
      notes: '', // Legacy field - kept for compatibility
      category: category as any,
      tax_amount: 0,
    };

    onSubmit(data, pendingAttachments, pendingNotes);
  };

  const toggleMonth = (month: number) => {
    setScheduledMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    );
  };

  const getDialogTitle = () => {
    const action = editingEntry ? t('common.edit', 'Edit') : t('common.add', 'Add');
    switch (entryType) {
      case 'credit':
        return `${action} ${t('financialEntries.creditEntry', 'Credit Entry')}`;
      case 'debit':
        return `${action} ${t('financialEntries.debitEntry', 'Debit Entry')}`;
      case 'owner_payment':
        return `${action} ${t('financialEntries.ownerPayment', 'Owner Payment')}`;
      default:
        return `${action} ${t('financialEntries.entry', 'Entry')}`;
    }
  };

  const getIcon = () => {
    switch (entryType) {
      case 'credit':
        return <Plus className="h-5 w-5 text-green-600" />;
      case 'debit':
        return <Minus className="h-5 w-5 text-red-600" />;
      case 'owner_payment':
        return <Users className="h-5 w-5 text-purple-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {entryType === 'credit' && t('financialEntries.creditDescription', 'Add income or payment received for this property')}
            {entryType === 'debit' && t('financialEntries.debitDescription', 'Add expense or payment made for this property')}
            {entryType === 'owner_payment' && t('financialEntries.ownerPaymentDescription', 'Add payment to the property owner')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="space-y-2">
            <Label htmlFor="description">{t('common.description', 'Description')} *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('financialEntries.descriptionPlaceholder', 'Enter description...')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('common.amount', 'Amount')} *</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseDate">{t('common.date', 'Date')} *</Label>
              <Input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t('common.category', 'Category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.selectCategory', 'Select category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance">{t('categories.maintenance', 'Maintenance')}</SelectItem>
                <SelectItem value="utilities">{t('categories.utilities', 'Utilities')}</SelectItem>
                <SelectItem value="cleaning">{t('categories.cleaning', 'Cleaning')}</SelectItem>
                <SelectItem value="supplies">{t('categories.supplies', 'Supplies')}</SelectItem>
                <SelectItem value="marketing">{t('categories.marketing', 'Marketing')}</SelectItem>
                <SelectItem value="insurance">{t('categories.insurance', 'Insurance')}</SelectItem>
                <SelectItem value="property_tax">{t('categories.propertyTax', 'Property Tax')}</SelectItem>
                <SelectItem value="hoa_fees">{t('categories.hoaFees', 'HOA Fees')}</SelectItem>
                <SelectItem value="professional_services">{t('categories.professionalServices', 'Professional Services')}</SelectItem>
                <SelectItem value="repairs">{t('categories.repairs', 'Repairs')}</SelectItem>
                <SelectItem value="landscaping">{t('categories.landscaping', 'Landscaping')}</SelectItem>
                <SelectItem value="other">{t('categories.other', 'Other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isScheduled"
              checked={isScheduled}
              onCheckedChange={(checked) => setIsScheduled(!!checked)}
            />
            <Label htmlFor="isScheduled" className="cursor-pointer">
              {t('financialEntries.scheduledEntry', 'This is a scheduled/recurring entry')}
            </Label>
          </div>

          {isScheduled && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="scheduledDay">{t('financialEntries.dayOfMonth', 'Day of Month')}</Label>
                <Select value={scheduledDay} onValueChange={setScheduledDay}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('common.months', 'Months')}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {MONTHS.map((month) => (
                    <div
                      key={month.value}
                      className={`flex items-center justify-center p-2 rounded cursor-pointer border transition-colors ${
                        scheduledMonths.includes(month.value)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-input hover:bg-accent'
                      }`}
                      onClick={() => toggleMonth(month.value)}
                    >
                      <span className="text-sm font-medium">{month.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Multi-file Attachments Section */}
          <AttachmentUploadSection
            existingAttachments={existingAttachments}
            pendingAttachments={pendingAttachments}
            onAddFiles={handleAddFiles}
            onRemovePending={handleRemovePendingAttachment}
            onCaptionChange={handleCaptionChange}
            onDeleteExisting={onDeleteAttachment}
            disabled={isSubmitting}
          />

          {/* Multi-notes Section */}
          <NotesManagementSection
            existingNotes={existingNotes}
            pendingNotes={pendingNotes}
            currentUserName={currentUserName}
            onAddNote={handleAddNote}
            onRemovePending={handleRemovePendingNote}
            onDeleteExisting={onDeleteNote}
            disabled={isSubmitting}
          />
        </form>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            <X className="mr-2 h-4 w-4" />
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting
              ? t('common.saving', 'Saving...')
              : editingEntry
                ? t('common.update', 'Update')
                : t('common.addEntry', 'Add Entry')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
