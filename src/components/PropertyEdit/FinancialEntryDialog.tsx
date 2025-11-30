import React, { useEffect, useState, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Minus, Users, Save, X, Upload, FileText, Trash2, ExternalLink } from 'lucide-react';
import { Expense, ExpenseInsert } from '@/lib/schemas';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FinancialEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExpenseInsert) => void;
  entryType: 'credit' | 'debit' | 'owner_payment';
  editingEntry: Expense | null;
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
  isSubmitting,
}: FinancialEntryDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDay, setScheduledDay] = useState('1');
  const [scheduledMonths, setScheduledMonths] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

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
        setNotes(editingEntry.notes || '');
        setCategory(editingEntry.category || 'other');
        setReceiptUrl(editingEntry.receipt_url || '');
        // Extract filename from URL if exists
        if (editingEntry.receipt_url) {
          const parts = editingEntry.receipt_url.split('/');
          setReceiptFileName(decodeURIComponent(parts[parts.length - 1] || 'Receipt'));
        } else {
          setReceiptFileName('');
        }
      } else {
        // Reset to defaults for new entry
        setDescription('');
        setAmount('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setIsScheduled(false);
        setScheduledDay('1');
        setScheduledMonths([]);
        setNotes('');
        setCategory('other');
        setReceiptUrl('');
        setReceiptFileName('');
      }
    }
  }, [open, editingEntry]);

  // Handle receipt file upload
  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Receipt file must be less than 10MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image (JPG, PNG, GIF) or PDF file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingReceipt(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `receipt_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('property-documents')
        .getPublicUrl(filePath);

      setReceiptUrl(urlData.publicUrl);
      setReceiptFileName(file.name);

      toast({
        title: 'Receipt uploaded',
        description: 'Your receipt has been uploaded successfully',
      });
    } catch (error: any) {
      console.error('Receipt upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload receipt',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingReceipt(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove receipt
  const handleRemoveReceipt = () => {
    setReceiptUrl('');
    setReceiptFileName('');
  };

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
      notes,
      category: category as any,
      tax_amount: 0,
      receipt_url: receiptUrl || undefined,
    };

    onSubmit(data);
  };

  const toggleMonth = (month: number) => {
    setScheduledMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    );
  };

  const getDialogTitle = () => {
    const action = editingEntry ? 'Edit' : 'Add';
    switch (entryType) {
      case 'credit':
        return `${action} Credit Entry`;
      case 'debit':
        return `${action} Debit Entry`;
      case 'owner_payment':
        return `${action} Owner Payment`;
      default:
        return `${action} Entry`;
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {entryType === 'credit' && 'Add income or payment received for this property'}
            {entryType === 'debit' && 'Add expense or payment made for this property'}
            {entryType === 'owner_payment' && 'Add payment to the property owner'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
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
              <Label htmlFor="expenseDate">Date *</Label>
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
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="property_tax">Property Tax</SelectItem>
                <SelectItem value="hoa_fees">HOA Fees</SelectItem>
                <SelectItem value="professional_services">Professional Services</SelectItem>
                <SelectItem value="repairs">Repairs</SelectItem>
                <SelectItem value="landscaping">Landscaping</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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
              This is a scheduled/recurring entry
            </Label>
          </div>

          {isScheduled && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="scheduledDay">Day of Month</Label>
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
                <Label>Months</Label>
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          {/* Receipt Attachment */}
          <div className="space-y-2">
            <Label>Receipt Attachment (Optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleReceiptUpload}
              className="hidden"
              id="receipt-upload"
            />

            {receiptUrl ? (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm truncate flex-1" title={receiptFileName}>
                  {receiptFileName || 'Receipt'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(receiptUrl, '_blank')}
                  title="View receipt"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={handleRemoveReceipt}
                  title="Remove receipt"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingReceipt}
              >
                {isUploadingReceipt ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-pulse" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Receipt (Image or PDF)
                  </>
                )}
              </Button>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Saving...' : editingEntry ? 'Update' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
