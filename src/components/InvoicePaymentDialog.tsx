import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { invoicePaymentSchema, InvoicePaymentInsert, Invoice } from '@/lib/schemas';
import { useRecordPayment, useInvoicePayments, PaymentSummary } from '@/hooks/useInvoicePayments';
import { DollarSign, Calendar, CreditCard, FileText, History } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface InvoicePaymentDialogProps {
  invoice: Invoice;
  summary?: PaymentSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_METHODS = [
  'cash',
  'check',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'stripe',
  'paypal',
  'venmo',
  'zelle',
  'other',
];

export function InvoicePaymentDialog({ invoice, summary, open, onOpenChange }: InvoicePaymentDialogProps) {
  const recordPayment = useRecordPayment();
  const { payments } = useInvoicePayments(invoice.invoice_id);

  const form = useForm<InvoicePaymentInsert>({
    resolver: zodResolver(invoicePaymentSchema),
    defaultValues: {
      invoice_id: invoice.invoice_id,
      payment_date: new Date().toISOString().split('T')[0],
      amount: summary?.remaining_balance || invoice.total_amount,
      payment_method: 'credit_card',
      reference_number: '',
      notes: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await recordPayment.mutateAsync(data);
    form.reset({
      invoice_id: invoice.invoice_id,
      payment_date: new Date().toISOString().split('T')[0],
      amount: 0,
      payment_method: 'credit_card',
      reference_number: '',
      notes: '',
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment - {invoice.invoice_number}
          </DialogTitle>
          <DialogDescription>
            Record a payment received for this invoice
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guest:</span>
              <span className="font-medium">{invoice.guest_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Total:</span>
              <span className="font-semibold">${invoice.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="text-green-600 font-medium">${(invoice.amount_paid || 0).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base">
              <span className="font-medium">Remaining Balance:</span>
              <span className="font-bold text-primary">
                ${summary?.remaining_balance.toFixed(2) || invoice.balance_due?.toFixed(2) || '0.00'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Payment Date
              </Label>
              <Input
                id="payment_date"
                type="date"
                {...form.register('payment_date')}
              />
              {form.formState.errors.payment_date && (
                <p className="text-sm text-destructive">{form.formState.errors.payment_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...form.register('amount', { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_method" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Method
              </Label>
              <Select
                value={form.watch('payment_method')}
                onValueChange={(value) => form.setValue('payment_method', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.payment_method && (
                <p className="text-sm text-destructive">{form.formState.errors.payment_method.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Reference Number
              </Label>
              <Input
                id="reference_number"
                placeholder="Check #, Transaction ID, etc."
                {...form.register('reference_number')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional payment notes..."
              rows={2}
              {...form.register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>

        {/* Payment History */}
        {payments.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Payment History ({payments.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {payments.map((payment) => (
                  <Card key={payment.payment_id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start text-sm">
                        <div>
                          <p className="font-medium">${payment.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.payment_date), 'MMM dd, yyyy')} • {' '}
                            {payment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          {payment.reference_number && (
                            <p className="text-xs text-muted-foreground">Ref: {payment.reference_number}</p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          {payment.created_at && format(new Date(payment.created_at), 'MMM dd, h:mm a')}
                        </div>
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
