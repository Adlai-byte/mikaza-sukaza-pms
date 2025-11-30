import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { Booking } from '@/lib/schemas';
import { useCreateInvoiceFromBooking } from '@/hooks/useInvoices';
import { format, addDays } from 'date-fns';

interface InvoiceGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
}

export function InvoiceGenerationDialog({
  open,
  onOpenChange,
  booking,
}: InvoiceGenerationDialogProps) {
  const navigate = useNavigate();
  const createInvoiceFromBooking = useCreateInvoiceFromBooking();

  // Form state
  const [billingTiming, setBillingTiming] = useState<string>('on_confirmation');
  const [daysBeforeCheckIn, setDaysBeforeCheckIn] = useState<number>(7);
  const [customDueDate, setCustomDueDate] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>('full');
  const [depositPercentage, setDepositPercentage] = useState<number>(50);
  const [autoSend, setAutoSend] = useState<boolean>(false);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('Payment due upon receipt');

  if (!booking) return null;

  // Calculate due date based on billing timing
  const calculateDueDate = (): string => {
    if (billingTiming === 'custom' && customDueDate) {
      return customDueDate;
    }
    if (billingTiming === 'on_check_in') {
      return booking.check_in_date;
    }
    if (billingTiming === 'before_check_in') {
      const checkInDate = new Date(booking.check_in_date);
      const dueDate = addDays(checkInDate, -daysBeforeCheckIn);
      return format(dueDate, 'yyyy-MM-dd');
    }
    if (billingTiming === 'after_check_out') {
      const checkOutDate = new Date(booking.check_out_date);
      const dueDate = addDays(checkOutDate, 3); // 3 days after checkout
      return format(dueDate, 'yyyy-MM-dd');
    }
    // on_confirmation - due immediately
    return format(new Date(), 'yyyy-MM-dd');
  };

  // Calculate amounts based on payment type
  const calculateAmounts = () => {
    const totalAmount = booking.total_amount || 0;

    if (paymentType === 'deposit') {
      const depositAmount = (totalAmount * depositPercentage) / 100;
      return {
        invoiceAmount: depositAmount,
        isDeposit: true,
        depositPercent: depositPercentage,
      };
    }

    return {
      invoiceAmount: totalAmount,
      isDeposit: false,
    };
  };

  const handleGenerateInvoice = async () => {
    if (!booking.booking_id) return;

    try {
      const result = await createInvoiceFromBooking.mutateAsync(booking.booking_id);

      // Close dialog
      onOpenChange(false);

      // Navigate to the newly created invoice
      if (result?.invoice_id) {
        navigate(`/invoices/${result.invoice_id}`);
      } else {
        navigate('/invoices');
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const dueDate = calculateDueDate();
  const amounts = calculateAmounts();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Invoice from Booking
          </DialogTitle>
          <DialogDescription>
            Create an invoice for <strong>{booking.guest_name}</strong>'s booking at{' '}
            <strong>{booking.property_id}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Check-in:</span>
              <span className="font-medium">{format(new Date(booking.check_in_date), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Check-out:</span>
              <span className="font-medium">{format(new Date(booking.check_out_date), 'MMM d, yyyy')}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Booking Total:</span>
              <span className="text-lg font-bold">${(booking.total_amount || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Billing Timing */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Invoice Timing
            </Label>
            <Select value={billingTiming} onValueChange={setBillingTiming}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_confirmation">Immediate (Due Now)</SelectItem>
                <SelectItem value="before_check_in">Before Check-In</SelectItem>
                <SelectItem value="on_check_in">On Check-In Day</SelectItem>
                <SelectItem value="after_check_out">After Check-Out</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>

            {billingTiming === 'before_check_in' && (
              <div className="ml-4 space-y-2">
                <Label htmlFor="days_before">Days Before Check-In</Label>
                <Input
                  id="days_before"
                  type="number"
                  min="1"
                  max="90"
                  value={daysBeforeCheckIn}
                  onChange={(e) => setDaysBeforeCheckIn(parseInt(e.target.value) || 7)}
                />
              </div>
            )}

            {billingTiming === 'custom' && (
              <div className="ml-4 space-y-2">
                <Label htmlFor="custom_due_date">Due Date</Label>
                <Input
                  id="custom_due_date"
                  type="date"
                  value={customDueDate}
                  onChange={(e) => setCustomDueDate(e.target.value)}
                />
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Calculated Due Date:</strong> {format(new Date(dueDate), 'MMMM d, yyyy')}
              </div>
            </div>
          </div>

          {/* Payment Type */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Type
            </Label>
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Payment</SelectItem>
                <SelectItem value="deposit">Deposit Only</SelectItem>
              </SelectContent>
            </Select>

            {paymentType === 'deposit' && (
              <div className="ml-4 space-y-2">
                <Label htmlFor="deposit_percent">Deposit Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="deposit_percent"
                    type="number"
                    min="1"
                    max="100"
                    value={depositPercentage}
                    onChange={(e) => setDepositPercentage(parseInt(e.target.value) || 50)}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Deposit Amount: <strong>${amounts.invoiceAmount.toLocaleString()}</strong>
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Payment Terms */}
          <div className="space-y-2">
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Textarea
              id="payment_terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              rows={2}
              placeholder="e.g., Payment due upon receipt"
            />
          </div>

          {/* Custom Notes */}
          <div className="space-y-2">
            <Label htmlFor="custom_notes">Custom Notes (Optional)</Label>
            <Textarea
              id="custom_notes"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={3}
              placeholder="Add any special notes or instructions for the guest"
            />
          </div>

          {/* Auto-Send Option */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
            <div className="space-y-0.5">
              <Label htmlFor="auto_send" className="font-medium">Auto-Send Invoice</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send invoice to guest via email
              </p>
            </div>
            <Switch
              id="auto_send"
              checked={autoSend}
              onCheckedChange={setAutoSend}
            />
          </div>

          {/* Invoice Summary */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
            <h4 className="font-semibold text-green-900">Invoice Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Invoice Amount:</span>
                <span className="font-bold text-green-900">
                  ${amounts.invoiceAmount.toLocaleString()}
                  {amounts.isDeposit && (
                    <Badge variant="outline" className="ml-2">
                      {amounts.depositPercent}% Deposit
                    </Badge>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Due Date:</span>
                <span className="font-medium text-green-900">{format(new Date(dueDate), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Status:</span>
                <Badge>Draft</Badge>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerateInvoice}
            disabled={createInvoiceFromBooking.isPending}
          >
            {createInvoiceFromBooking.isPending ? 'Generating...' : 'Generate Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
