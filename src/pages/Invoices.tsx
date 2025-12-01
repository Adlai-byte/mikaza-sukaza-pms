import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Search,
  Filter,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Eye,
  Calendar,
  CreditCard,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
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
import { useInvoices, useMarkInvoiceAsSent, useMarkInvoiceAsPaid } from '@/hooks/useInvoices';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { usePaymentSummary } from '@/hooks/useInvoicePayments';
import { InvoicePaymentDialog } from '@/components/InvoicePaymentDialog';
import { SendInvoiceEmailDialog } from '@/components/SendInvoiceEmailDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';

export default function Invoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentDialogInvoice, setPaymentDialogInvoice] = useState<any>(null);
  const [emailDialogInvoice, setEmailDialogInvoice] = useState<any>(null);

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
  const markAsSent = useMarkInvoiceAsSent();
  const markAsPaid = useMarkInvoiceAsPaid();

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
        title: t('common.success'),
        description: t('invoices.pdfDownloaded'),
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: t('common.error'),
        description: t('invoices.pdfError'),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: React.ReactNode }> = {
      draft: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      sent: { variant: 'default', icon: <Send className="h-3 w-3" /> },
      paid: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      overdue: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      cancelled: { variant: 'outline', icon: <XCircle className="h-3 w-3" /> },
      refunded: { variant: 'outline', icon: <DollarSign className="h-3 w-3" /> },
    };

    const config = variants[status] || variants.draft;

    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {t(`invoices.status.${status}`)}
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
      <PageHeader
        title={t('invoices.title')}
        subtitle={t('invoices.subtitle')}
        icon={FileText}
        actions={
          <>
            <Button
              onClick={() => navigate('/bill-templates')}
              size="lg"
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              {t('invoices.manageTemplates')}
            </Button>
          </>
        }
      />

      {/* Stats Cards - Violet & Lime Green Theme */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-violet-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-700">{t('invoices.totalInvoices')}</p>
                <h3 className="text-3xl font-bold text-violet-900 mt-1">{stats.total}</h3>
                <p className="text-xs text-violet-600 mt-1">{t('invoices.allTime')}</p>
              </div>
              <div className="w-12 h-12 bg-violet-500 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-violet-100 to-violet-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-700">{t('invoices.totalAmount')}</p>
                <h3 className="text-3xl font-bold text-violet-900 mt-1">
                  ${stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-violet-600 mt-1">{t('invoices.combinedTotal')}</p>
              </div>
              <div className="w-12 h-12 bg-violet-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-lime-50 to-lime-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-lime-700">{t('invoices.paidInvoices')}</p>
                <h3 className="text-3xl font-bold text-lime-900 mt-1">
                  ${stats.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-lime-600 mt-1">{t('invoices.paidInvoicesDesc', { count: stats.paid })}</p>
              </div>
              <div className="w-12 h-12 bg-lime-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-lime-50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-700">{t('invoices.outstanding')}</p>
                <h3 className="text-3xl font-bold text-violet-900 mt-1">
                  ${stats.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-violet-600 mt-1">{t('invoices.pendingPayment')}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-lime-500 rounded-lg flex items-center justify-center">
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
            {t('invoices.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('invoices.searchGuestPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Property Filter */}
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue placeholder={t('invoices.allProperties')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('invoices.allProperties')}</SelectItem>
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
                <SelectValue placeholder={t('invoices.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('invoices.allStatuses')}</SelectItem>
                <SelectItem value="draft">{t('invoices.status.draft')}</SelectItem>
                <SelectItem value="sent">{t('invoices.status.sent')}</SelectItem>
                <SelectItem value="paid">{t('invoices.status.paid')}</SelectItem>
                <SelectItem value="overdue">{t('invoices.status.overdue')}</SelectItem>
                <SelectItem value="cancelled">{t('invoices.status.cancelled')}</SelectItem>
                <SelectItem value="refunded">{t('invoices.status.refunded')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Date From */}
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder={t('invoices.dateFrom')}
            />

            {/* Date To */}
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder={t('invoices.dateTo')}
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
              <p className="text-lg font-medium">{t('invoices.noInvoicesFound')}</p>
              <p className="text-sm">{t('invoices.createFirstInvoice')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoices.invoiceHash')}</TableHead>
                    <TableHead>{t('invoices.guest')}</TableHead>
                    <TableHead>{t('invoices.property')}</TableHead>
                    <TableHead>{t('invoices.issueDate')}</TableHead>
                    <TableHead>{t('invoices.dueDate')}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">{t('invoices.amount')}</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">{t('invoices.balance')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
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
                              title={t('invoices.linkedToBooking')}
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
                            title={t('invoices.viewInvoice')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPDF(invoice)}
                            title={t('invoices.downloadPDF')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {invoice.status !== 'paid' && (invoice.balance_due || 0) > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPaymentDialogInvoice(invoice)}
                              title={t('invoices.recordPayment')}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}

                          {invoice.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEmailDialogInvoice(invoice)}
                              title={t('invoices.sendViaEmail')}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}

                          {['sent', 'overdue'].includes(invoice.status || '') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsPaid(invoice.invoice_id!)}
                              title="Mark as Paid"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Send Email Dialog */}
      <SendInvoiceEmailDialog
        invoice={emailDialogInvoice}
        open={!!emailDialogInvoice}
        onOpenChange={(open) => !open && setEmailDialogInvoice(null)}
      />
    </div>
  );
}
