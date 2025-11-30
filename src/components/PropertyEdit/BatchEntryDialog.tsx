import React, { useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Layers, Upload, X, AlertCircle } from 'lucide-react';
import { ExpenseInsert } from '@/lib/schemas';

interface BatchEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entries: ExpenseInsert[]) => void;
  propertyId: string;
  isSubmitting: boolean;
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

export function BatchEntryDialog({
  open,
  onOpenChange,
  onSubmit,
  propertyId,
  isSubmitting,
}: BatchEntryDialogProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [entryType, setEntryType] = useState<'credit' | 'debit'>('debit');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDay, setScheduledDay] = useState('1');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [category, setCategory] = useState<string>('other');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    );
  };

  const selectAllMonths = () => {
    setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  };

  const clearAllMonths = () => {
    setSelectedMonths([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMonths.length === 0) {
      return;
    }

    const parsedYear = parseInt(year);
    const parsedDay = parseInt(scheduledDay);
    const parsedAmount = parseFloat(amount) || 0;

    // Create an entry for each selected month
    const entries: ExpenseInsert[] = selectedMonths.map((month) => {
      // Calculate the date for this entry
      const lastDayOfMonth = new Date(parsedYear, month, 0).getDate();
      const day = Math.min(parsedDay, lastDayOfMonth);
      const expenseDate = `${parsedYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      return {
        property_id: propertyId,
        description,
        amount: parsedAmount,
        expense_date: expenseDate,
        entry_type: entryType,
        is_scheduled: isScheduled,
        scheduled_day: isScheduled ? parsedDay : null,
        scheduled_months: isScheduled ? [month] : null,
        category: category as any,
        tax_amount: 0,
      };
    });

    onSubmit(entries);
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setEntryType('debit');
    setIsScheduled(false);
    setScheduledDay('1');
    setYear(new Date().getFullYear().toString());
    setSelectedMonths([]);
    setCategory('other');
  };

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Batch Entry
          </DialogTitle>
          <DialogDescription>
            Create multiple entries at once for different months
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batchDescription">Description *</Label>
            <Input
              id="batchDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Monthly Rent, HOA Fee, Utility Bill..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchAmount">Value *</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-muted-foreground">$</span>
                <Input
                  id="batchAmount"
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
              <Label htmlFor="batchEntryType">Entry Type *</Label>
              <Select value={entryType} onValueChange={(v) => setEntryType(v as 'credit' | 'debit')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batchCategory">Category</Label>
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
              id="batchIsScheduled"
              checked={isScheduled}
              onCheckedChange={(checked) => setIsScheduled(!!checked)}
            />
            <Label htmlFor="batchIsScheduled" className="cursor-pointer">
              Mark as scheduled entries
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchDay">Day of Month</Label>
              <Select value={scheduledDay} onValueChange={setScheduledDay}>
                <SelectTrigger>
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
              <Label htmlFor="batchYear">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Months *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllMonths}
                  className="h-7 text-xs"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllMonths}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((month) => (
                <div
                  key={month.value}
                  className={`flex items-center justify-center p-2 rounded cursor-pointer border transition-colors ${
                    selectedMonths.includes(month.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent'
                  }`}
                  onClick={() => toggleMonth(month.value)}
                >
                  <span className="text-sm font-medium">{month.label.slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedMonths.length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select at least one month
              </AlertDescription>
            </Alert>
          )}

          {selectedMonths.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will create <strong>{selectedMonths.length}</strong> entries for{' '}
                {year}, each with amount <strong>${parseFloat(amount || '0').toFixed(2)}</strong>
              </AlertDescription>
            </Alert>
          )}

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
            <Button
              type="submit"
              disabled={isSubmitting || selectedMonths.length === 0}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isSubmitting
                ? 'Creating...'
                : `Upload ${selectedMonths.length} ${selectedMonths.length === 1 ? 'Entry' : 'Entries'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
