/**
 * Booking Payment Summary Component
 * Displays invoice and payment information for a booking in a compact format
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BookingPaymentSummaryProps {
  booking: {
    booking_id: string;
    invoice_id?: string | null;
    payment_status?: string;
    total_amount?: number;
  };
}

export function BookingPaymentSummary({ booking }: BookingPaymentSummaryProps) {
  // Fetch invoice details if invoice exists
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice-summary', booking.invoice_id],
    queryFn: async () => {
      if (!booking.invoice_id) return null;

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          invoice_id,
          invoice_number,
          status,
          total_amount,
          amount_paid,
          balance_due,
          due_date,
          paid_date,
          invoice_payments (
            payment_id,
            amount,
            payment_date,
            payment_method,
            reference_number
          )
        `)
        .eq('invoice_id', booking.invoice_id)
        .single();

      if (error) {
        console.error('Error fetching invoice:', error);
        return null;
      }

      return data;
    },
    enabled: !!booking.invoice_id,
    staleTime: 30 * 1000, // 30 seconds
  });

  // If no invoice, show basic info
  if (!booking.invoice_id) {
    return (
      <Card className="border-dashed border-gray-300 bg-gray-50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" />
            <span>No invoice generated yet</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-blue-50/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading payment details...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invoice) {
    return null;
  }

  const paymentProgress = invoice.total_amount > 0
    ? (invoice.amount_paid / invoice.total_amount) * 100
    : 0;

  const isFullyPaid = invoice.status === 'paid' || paymentProgress >= 100;
  const isOverdue = invoice.status === 'overdue';
  const hasPartialPayment = invoice.amount_paid > 0 && invoice.amount_paid < invoice.total_amount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card className={`
      ${isFullyPaid ? 'bg-green-50/50 border-green-200' : ''}
      ${isOverdue ? 'bg-red-50/50 border-red-200' : ''}
      ${hasPartialPayment ? 'bg-yellow-50/50 border-yellow-200' : ''}
      ${!isFullyPaid && !isOverdue && !hasPartialPayment ? 'bg-blue-50/50 border-blue-200' : ''}
    `}>
      <CardContent className="p-3 space-y-2">
        {/* Invoice Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{invoice.invoice_number}</span>
          </div>
          {isFullyPaid && (
            <Badge variant="default" className="bg-green-600 text-white text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Paid
            </Badge>
          )}
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Overdue
            </Badge>
          )}
          {hasPartialPayment && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
              Partial
            </Badge>
          )}
        </div>

        {/* Payment Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Payment Progress</span>
            <span className="font-medium">{paymentProgress.toFixed(0)}%</span>
          </div>
          <Progress
            value={paymentProgress}
            className={`h-2 ${
              isFullyPaid ? '[&>div]:bg-green-500' :
              hasPartialPayment ? '[&>div]:bg-yellow-500' :
              '[&>div]:bg-blue-500'
            }`}
          />
        </div>

        {/* Amount Summary */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Total</div>
            <div className="font-semibold">{formatCurrency(invoice.total_amount)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Paid</div>
            <div className="font-semibold text-green-700">{formatCurrency(invoice.amount_paid)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Balance</div>
            <div className={`font-semibold ${invoice.balance_due > 0 ? 'text-orange-700' : 'text-green-700'}`}>
              {formatCurrency(invoice.balance_due)}
            </div>
          </div>
        </div>

        {/* Due Date or Paid Date */}
        {isFullyPaid && invoice.paid_date ? (
          <div className="flex items-center gap-1 text-xs text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            <span>Paid on {format(parseISO(invoice.paid_date), 'MMM d, yyyy')}</span>
          </div>
        ) : invoice.due_date ? (
          <div className={`flex items-center gap-1 text-xs ${
            isOverdue ? 'text-red-700' : 'text-muted-foreground'
          }`}>
            <Calendar className="h-3 w-3" />
            <span>
              Due: {format(parseISO(invoice.due_date), 'MMM d, yyyy')}
              {isOverdue && ' (Past Due)'}
            </span>
          </div>
        ) : null}

        {/* Payment History */}
        {invoice.invoice_payments && invoice.invoice_payments.length > 0 && (
          <div className="border-t pt-2 space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Recent Payments:</div>
            {invoice.invoice_payments.slice(0, 2).map((payment: any) => (
              <div key={payment.payment_id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3 text-muted-foreground" />
                  <span>{format(parseISO(payment.payment_date), 'MMM d')}</span>
                  {payment.payment_method && (
                    <Badge variant="outline" className="text-xs py-0 h-4">
                      {payment.payment_method.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <span className="font-medium">{formatCurrency(payment.amount)}</span>
              </div>
            ))}
            {invoice.invoice_payments.length > 2 && (
              <div className="text-xs text-muted-foreground text-center">
                +{invoice.invoice_payments.length - 2} more payment{invoice.invoice_payments.length - 2 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
