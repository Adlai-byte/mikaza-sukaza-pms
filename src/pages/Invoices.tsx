import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Eye,
  Trash2,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvoices, useDeleteInvoice, useMarkInvoiceAsSent, useMarkInvoiceAsPaid } from '@/hooks/useInvoices';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { usePaymentSummary } from '@/hooks/useInvoicePayments';
import { InvoicePaymentDialog } from '@/components/InvoicePaymentDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';

export default function Invoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentDialogInvoice, setPaymentDialogInvoice] = useState<any>(null);

  // Build filters
  const filters = {
    property_id: selectedProperty !== 'all' ? selectedProperty : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    guest_name: searchTerm || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const { invoices, loading } = useInvoices(filters);
  const { properties } = usePropertiesOptimized();
  const deleteInvoice = useDeleteInvoice();
  const markAsSent = useMarkInvoiceAsSent();
  const markAsPaid = useMarkInvoiceAsPaid();

  const handleDelete = (invoiceId: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoice.mutate(invoiceId);
    }
  };

  const handleMarkAsSent = (invoiceId: string) => {
    markAsSent.mutate(invoiceId);
  };

  const handleMarkAsPaid = (invoiceId: string) => {
    markAsPaid.mutate({ invoiceId });
  };

  const handleDownloadPDF = (invoice: any) => {
    try {
      generateInvoicePDF(invoice);

      toast({
        title: 'Success',
        description: 'Invoice PDF downloaded successfully',
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: React.ReactNode; label: string }> = {
      draft: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'Draft' },
      sent: { variant: 'default', icon: <Send className="h-3 w-3" />, label: 'Sent' },
      paid: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Paid' },
      overdue: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Overdue' },
      cancelled: { variant: 'outline', icon: <XCircle className="h-3 w-3" />, label: 'Cancelled' },
      refunded: { variant: 'outline', icon: <DollarSign className="h-3 w-3" />, label: 'Refunded' },
    };

    const config = variants[status] || variants.draft;

    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // Calculate summary stats
  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
    paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0),
    outstanding: invoices.filter(i => ['sent', 'overdue'].includes(i.status || '')).reduce((sum, i) => sum + (i.balance_due || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Invoices
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage guest invoices and billing
          </p>
        </div>
        <Button onClick={() => navigate('/invoices/new')} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Invoices</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</h3>
                <p className="text-xs text-blue-600 mt-1">All time</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Amount</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  ${stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-purple-600 mt-1">Combined total</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Paid</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  ${stats.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-green-600 mt-1">{stats.paid} paid invoices</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Outstanding</p>
                <h3 className="text-3xl font-bold text-amber-900 mt-1">
                  ${stats.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-amber-600 mt-1">Pending payment</p>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-md border-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guest name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Property Filter */}
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.property_id} value={property.property_id!}>
                    {property.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>

            {/* Date From */}
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Date from"
            />

            {/* Date To */}
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Date to"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FileText className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">No invoices found</p>
              <p className="text-sm">Create your first invoice to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.invoice_id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{invoice.invoice_number}</span>
                          {(invoice as any).booking_id && (
                            <span
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded flex items-center gap-1"
                              title="Linked to booking"
                            >
                              <Calendar className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.guest_name}</div>
                          {invoice.guest_email && (
                            <div className="text-xs text-muted-foreground">{invoice.guest_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{invoice.property?.property_name || 'N/A'}</TableCell>
                      <TableCell>{format(new Date(invoice.issue_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(invoice.due_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status || 'draft')}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${invoice.total_amount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${invoice.amount_paid?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-medium",
                          (invoice.balance_due || 0) > 0 ? "text-orange-600" : "text-green-600"
                        )}>
                          ${invoice.balance_due?.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/invoices/${invoice.invoice_id}`)}
                            title="View Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPDF(invoice)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {invoice.status !== 'paid' && (invoice.balance_due || 0) > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPaymentDialogInvoice(invoice)}
                              title="Record Payment"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}

                          {invoice.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsSent(invoice.invoice_id!)}
                              title="Mark as Sent"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}

                          {['sent', 'overdue'].includes(invoice.status || '') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsPaid(invoice.invoice_id!)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(invoice.invoice_id!)}
                            disabled={deleteInvoice.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      {paymentDialogInvoice && (
        <InvoicePaymentDialog
          invoice={paymentDialogInvoice}
          open={!!paymentDialogInvoice}
          onOpenChange={(open) => !open && setPaymentDialogInvoice(null)}
        />
      )}
    </div>
  );
}
