import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
  Building,
  FileText,
  ExternalLink,
  RefreshCw,
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
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    {t('commissions.stats.totalCommissions', 'Total Commissions')}
                  </p>
                  <h3 className="text-2xl font-bold text-blue-900 mt-1">
                    {formatCurrency(summary?.total_commissions || 0)}
                  </h3>
                  <p className="text-xs text-blue-600 mt-1">
                    {summary?.commission_count || 0} {t('commissions.stats.invoices', 'invoices')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">
                    {t('commissions.stats.paidCommissions', 'Paid (Collected)')}
                  </p>
                  <h3 className="text-2xl font-bold text-green-900 mt-1">
                    {formatCurrency(summary?.paid_commissions || 0)}
                  </h3>
                  <p className="text-xs text-green-600 mt-1">
                    {summary?.paid_count || 0} {t('commissions.stats.paidInvoices', 'paid invoices')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">
                    {t('commissions.stats.pendingCommissions', 'Pending (Unpaid)')}
                  </p>
                  <h3 className="text-2xl font-bold text-yellow-900 mt-1">
                    {formatCurrency(summary?.pending_commissions || 0)}
                  </h3>
                  <p className="text-xs text-yellow-600 mt-1">
                    {summary?.pending_count || 0} {t('commissions.stats.pendingInvoices', 'pending invoices')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">
                    {t('commissions.stats.averageCommission', 'Average Commission')}
                  </p>
                  <h3 className="text-2xl font-bold text-purple-900 mt-1">
                    {formatCurrency(summary?.average_commission || 0)}
                  </h3>
                  <p className="text-xs text-purple-600 mt-1">
                    {t('commissions.stats.perInvoice', 'per invoice')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
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
