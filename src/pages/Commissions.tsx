import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
  Building,
  FileText,
  ExternalLink,
  RefreshCw,
  Download,
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Charts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Hooks
import {
  useCommissions,
  useCommissionSummary,
  useCommissionsByProperty,
  useCommissionsByMonth,
  CommissionFilters,
  InvoiceCommission,
} from '@/hooks/useCommissions';
import { useProperties } from '@/hooks/useProperties';

// Chart colors
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Invoice status badge styles
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
    case 'sent':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent</Badge>;
    case 'draft':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
    case 'overdue':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
    case 'cancelled':
      return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function Commissions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Date filters - default to current year
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Build filters object
  const filters: CommissionFilters = useMemo(() => {
    const f: CommissionFilters = {};
    if (propertyFilter && propertyFilter !== 'all') {
      f.property_id = propertyFilter;
    }
    if (statusFilter && statusFilter !== 'all') {
      f.invoice_status = statusFilter;
    }
    if (dateFrom) {
      f.date_from = dateFrom;
    }
    if (dateTo) {
      f.date_to = dateTo;
    }
    return f;
  }, [propertyFilter, statusFilter, dateFrom, dateTo]);

  // Fetch data
  const { commissions, loading: commissionsLoading, refetch } = useCommissions(filters);
  const { summary, loading: summaryLoading } = useCommissionSummary(dateFrom, dateTo);
  const { commissionsByProperty, loading: byPropertyLoading } = useCommissionsByProperty(dateFrom, dateTo);
  const { commissionsByMonth, loading: byMonthLoading } = useCommissionsByMonth(dateFrom, dateTo);
  const { properties } = useProperties();

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Navigate to invoice
  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}`);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (commissions.length === 0) return;

    // Prepare data for export
    const exportData = commissions.map((commission: InvoiceCommission) => ({
      [t('commissions.table.invoiceNumber', 'Invoice #')]: commission.invoice?.invoice_number || 'N/A',
      [t('commissions.table.property', 'Property')]: commission.invoice?.property?.property_name || 'N/A',
      [t('commissions.table.guest', 'Guest')]: commission.invoice?.guest_name || 'N/A',
      [t('commissions.export.guestEmail', 'Guest Email')]: commission.invoice?.guest_email || '',
      [t('commissions.table.issueDate', 'Issue Date')]: commission.invoice?.issue_date
        ? format(new Date(commission.invoice.issue_date), 'yyyy-MM-dd')
        : 'N/A',
      [t('commissions.table.invoiceTotal', 'Invoice Total')]: commission.invoice?.total_amount || 0,
      [t('commissions.table.commission', 'Commission')]: commission.commission_amount,
      [t('commissions.table.invoiceStatus', 'Status')]: commission.invoice?.status || 'draft',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Invoice #
      { wch: 25 }, // Property
      { wch: 20 }, // Guest
      { wch: 30 }, // Guest Email
      { wch: 12 }, // Issue Date
      { wch: 15 }, // Invoice Total
      { wch: 15 }, // Commission
      { wch: 12 }, // Status
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, t('commissions.export.sheetName', 'Commissions'));

    // Add summary sheet
    const summaryData = [
      { [t('commissions.export.metric', 'Metric')]: t('commissions.stats.totalCommissions', 'Total Commissions'), [t('commissions.export.value', 'Value')]: summary?.total_commissions || 0 },
      { [t('commissions.export.metric', 'Metric')]: t('commissions.stats.paidCommissions', 'Paid (Collected)'), [t('commissions.export.value', 'Value')]: summary?.paid_commissions || 0 },
      { [t('commissions.export.metric', 'Metric')]: t('commissions.stats.pendingCommissions', 'Pending (Unpaid)'), [t('commissions.export.value', 'Value')]: summary?.pending_commissions || 0 },
      { [t('commissions.export.metric', 'Metric')]: t('commissions.stats.averageCommission', 'Average Commission'), [t('commissions.export.value', 'Value')]: summary?.average_commission || 0 },
      { [t('commissions.export.metric', 'Metric')]: t('commissions.export.totalInvoices', 'Total Invoices'), [t('commissions.export.value', 'Value')]: summary?.commission_count || 0 },
      { [t('commissions.export.metric', 'Metric')]: t('commissions.export.paidInvoices', 'Paid Invoices'), [t('commissions.export.value', 'Value')]: summary?.paid_count || 0 },
      { [t('commissions.export.metric', 'Metric')]: t('commissions.export.pendingInvoices', 'Pending Invoices'), [t('commissions.export.value', 'Value')]: summary?.pending_count || 0 },
      { [t('commissions.export.metric', 'Metric')]: t('commissions.export.dateRange', 'Date Range'), [t('commissions.export.value', 'Value')]: `${dateFrom} to ${dateTo}` },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, t('commissions.export.summarySheet', 'Summary'));

    // Generate filename with date
    const fileName = `commissions_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('commissions.title', 'Commissions')}</h1>
          <p className="text-muted-foreground">
            {t('commissions.subtitle', 'Track commissions from invoice line items')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportExcel}
            variant="outline"
            size="sm"
            disabled={commissions.length === 0 || commissionsLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('commissions.export.button', 'Export Excel')}
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {t('commissions.stats.totalCommissions', 'Total Commissions')}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-semibold">{formatCurrency(summary?.total_commissions || 0)}</h3>
                    <span className="text-xs text-muted-foreground">{summary?.commission_count || 0} {t('commissions.stats.invoices', 'invoices')}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {t('commissions.stats.paidCommissions', 'Paid (Collected)')}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-semibold">{formatCurrency(summary?.paid_commissions || 0)}</h3>
                    <span className="text-xs text-muted-foreground">{summary?.paid_count || 0} {t('commissions.stats.paidInvoices', 'paid invoices')}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {t('commissions.stats.pendingCommissions', 'Pending (Unpaid)')}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-semibold">{formatCurrency(summary?.pending_commissions || 0)}</h3>
                    <span className="text-xs text-muted-foreground">{summary?.pending_count || 0} {t('commissions.stats.pendingInvoices', 'pending invoices')}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {t('commissions.stats.averageCommission', 'Average Commission')}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-semibold">{formatCurrency(summary?.average_commission || 0)}</h3>
                    <span className="text-xs text-muted-foreground">{t('commissions.stats.perInvoice', 'per invoice')}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('commissions.filters.title', 'Filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('commissions.filters.from', 'From')}</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('commissions.filters.to', 'To')}</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('commissions.filters.property', 'Property')}</label>
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('commissions.filters.allProperties', 'All Properties')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('commissions.filters.allProperties', 'All Properties')}</SelectItem>
                  {properties?.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id}>
                      {property.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('commissions.filters.invoiceStatus', 'Invoice Status')}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('commissions.filters.allStatuses', 'All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('commissions.filters.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="paid">{t('invoices.status.paid', 'Paid')}</SelectItem>
                  <SelectItem value="sent">{t('invoices.status.sent', 'Sent')}</SelectItem>
                  <SelectItem value="draft">{t('invoices.status.draft', 'Draft')}</SelectItem>
                  <SelectItem value="overdue">{t('invoices.status.overdue', 'Overdue')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">
            <FileText className="h-4 w-4 mr-2" />
            {t('commissions.tabs.records', 'Commission Records')}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            {t('commissions.tabs.analytics', 'Analytics')}
          </TabsTrigger>
          <TabsTrigger value="byProperty">
            <Building className="h-4 w-4 mr-2" />
            {t('commissions.tabs.byProperty', 'By Property')}
          </TabsTrigger>
        </TabsList>

        {/* Commission Records Tab */}
        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>{t('commissions.table.title', 'Commission Records')}</CardTitle>
              <CardDescription>
                {t('commissions.table.description', 'All invoices with commission line items')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commissionsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : commissions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  {t('commissions.table.noRecords', 'No commission records found')}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('commissions.table.invoiceNumber', 'Invoice #')}</TableHead>
                        <TableHead>{t('commissions.table.property', 'Property')}</TableHead>
                        <TableHead>{t('commissions.table.guest', 'Guest')}</TableHead>
                        <TableHead>{t('commissions.table.issueDate', 'Issue Date')}</TableHead>
                        <TableHead>{t('commissions.table.invoiceTotal', 'Invoice Total')}</TableHead>
                        <TableHead>{t('commissions.table.commission', 'Commission')}</TableHead>
                        <TableHead>{t('commissions.table.invoiceStatus', 'Status')}</TableHead>
                        <TableHead className="text-right">{t('commissions.table.actions', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((commission: InvoiceCommission) => (
                        <TableRow key={commission.line_item_id}>
                          <TableCell className="font-medium">
                            {commission.invoice?.invoice_number || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {commission.invoice?.property?.property_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{commission.invoice?.guest_name || 'N/A'}</div>
                              {commission.invoice?.guest_email && (
                                <div className="text-xs text-muted-foreground">
                                  {commission.invoice.guest_email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {commission.invoice?.issue_date
                              ? format(new Date(commission.invoice.issue_date), 'MMM d, yyyy')
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(commission.invoice?.total_amount || 0)}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(commission.commission_amount)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(commission.invoice?.status || 'draft')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewInvoice(commission.invoice?.invoice_id)}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              {t('common.view', 'View')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>{t('commissions.charts.monthlyTrend', 'Monthly Commission Trend')}</CardTitle>
                <CardDescription>
                  {t('commissions.charts.monthlyDescription', 'Commission amounts over time')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {byMonthLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : commissionsByMonth.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    {t('commissions.charts.noData', 'No data available')}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={commissionsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tickFormatter={(value) => {
                          const [year, month] = value.split('-');
                          return format(new Date(parseInt(year), parseInt(month) - 1), 'MMM');
                        }}
                      />
                      <YAxis tickFormatter={(value) => `$${value}`} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Commission']}
                        labelFormatter={(label) => {
                          const [year, month] = label.split('-');
                          return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy');
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_commissions"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* By Property Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t('commissions.charts.byProperty', 'Commissions by Property')}</CardTitle>
                <CardDescription>
                  {t('commissions.charts.propertyDistribution', 'Distribution across properties')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {byPropertyLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : commissionsByProperty.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    {t('commissions.charts.noData', 'No data available')}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={commissionsByProperty}
                        dataKey="total_commissions"
                        nameKey="property_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ property_name, percent }) =>
                          `${property_name.substring(0, 15)}${property_name.length > 15 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {commissionsByProperty.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* By Property Tab */}
        <TabsContent value="byProperty">
          <Card>
            <CardHeader>
              <CardTitle>{t('commissions.byProperty.title', 'Commission by Property')}</CardTitle>
              <CardDescription>
                {t('commissions.byProperty.description', 'Total commissions earned per property')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {byPropertyLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : commissionsByProperty.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  {t('commissions.byProperty.noData', 'No property commission data available')}
                </div>
              ) : (
                <>
                  {/* Bar Chart */}
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={commissionsByProperty} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                      <YAxis
                        type="category"
                        dataKey="property_name"
                        width={150}
                        tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                      />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Commission']} />
                      <Bar dataKey="total_commissions" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Property Table */}
                  <div className="mt-6 rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('commissions.byProperty.property', 'Property')}</TableHead>
                          <TableHead className="text-right">{t('commissions.byProperty.totalCommission', 'Total Commission')}</TableHead>
                          <TableHead className="text-right">{t('commissions.byProperty.invoiceCount', 'Invoice Count')}</TableHead>
                          <TableHead className="text-right">{t('commissions.byProperty.average', 'Average')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissionsByProperty.map((item) => (
                          <TableRow key={item.property_id}>
                            <TableCell className="font-medium">{item.property_name}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {formatCurrency(item.total_commissions)}
                            </TableCell>
                            <TableCell className="text-right">{item.commission_count}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.total_commissions / item.commission_count)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total Row */}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>{t('common.total', 'Total')}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(
                              commissionsByProperty.reduce((sum, item) => sum + item.total_commissions, 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {commissionsByProperty.reduce((sum, item) => sum + item.commission_count, 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              commissionsByProperty.reduce((sum, item) => sum + item.total_commissions, 0) /
                              commissionsByProperty.reduce((sum, item) => sum + item.commission_count, 0) || 0
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
