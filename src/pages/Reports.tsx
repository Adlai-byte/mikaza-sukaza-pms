import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { CasaSpinner } from '@/components/ui/casa-loader';
import {
  FileText,
  Download,
  RefreshCw,
  BarChart3,
  Calendar,
  DollarSign,
  Home,
  Users,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useBookings } from '@/hooks/useBookings';
import { useExpenses } from '@/hooks/useExpenses';
import { useInvoices } from '@/hooks/useInvoices';
import { cn } from '@/lib/utils';

type ReportType = 'properties' | 'bookings' | 'financial' | 'occupancy';
type DatePreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'custom';

export default function Reports() {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<ReportType>('properties');
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');

  // Fetch data
  const { properties, loading: loadingProperties } = usePropertiesOptimized();
  const { bookings, loading: loadingBookings } = useBookings();
  const { expenses, loading: loadingExpenses } = useExpenses();
  const { invoices, loading: loadingInvoices } = useInvoices();

  const isLoading = loadingProperties || loadingBookings || loadingExpenses || loadingInvoices;

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'thisQuarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);
        const quarterEnd = new Date(now.getFullYear(), quarterMonth + 3, 0);
        return { start: quarterStart, end: quarterEnd };
      case 'thisYear':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        return {
          start: customStartDate ? parseISO(customStartDate) : startOfMonth(now),
          end: customEndDate ? parseISO(customEndDate) : endOfMonth(now),
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [datePreset, customStartDate, customEndDate]);

  // Filter data by date range and property
  const filteredBookings = useMemo(() => {
    return (bookings || []).filter((booking) => {
      const checkIn = booking.check_in_date ? parseISO(booking.check_in_date) : null;
      if (!checkIn) return false;
      if (checkIn < dateRange.start || checkIn > dateRange.end) return false;
      if (selectedProperty !== 'all' && booking.property_id !== selectedProperty) return false;
      return true;
    });
  }, [bookings, dateRange, selectedProperty]);

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter((expense) => {
      const date = expense.expense_date ? parseISO(expense.expense_date) : null;
      if (!date) return false;
      if (date < dateRange.start || date > dateRange.end) return false;
      if (selectedProperty !== 'all' && expense.property_id !== selectedProperty) return false;
      return true;
    });
  }, [expenses, dateRange, selectedProperty]);

  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter((invoice) => {
      const date = invoice.invoice_date ? parseISO(invoice.invoice_date) : null;
      if (!date) return false;
      if (date < dateRange.start || date > dateRange.end) return false;
      if (selectedProperty !== 'all' && invoice.property_id !== selectedProperty) return false;
      return true;
    });
  }, [invoices, dateRange, selectedProperty]);

  // Calculate report data
  const propertiesReport = useMemo(() => {
    const filtered = selectedProperty === 'all'
      ? (properties || [])
      : (properties || []).filter((p) => p.property_id === selectedProperty);

    return {
      total: filtered.length,
      active: filtered.filter((p) => p.is_active).length,
      inactive: filtered.filter((p) => !p.is_active).length,
      byType: filtered.reduce((acc, p) => {
        const type = p.property_type || 'Other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      properties: filtered,
    };
  }, [properties, selectedProperty]);

  const bookingsReport = useMemo(() => {
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const avgStay = filteredBookings.length > 0
      ? filteredBookings.reduce((sum, b) => {
          const checkIn = b.check_in_date ? parseISO(b.check_in_date) : null;
          const checkOut = b.check_out_date ? parseISO(b.check_out_date) : null;
          if (checkIn && checkOut) {
            const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }
          return sum;
        }, 0) / filteredBookings.length
      : 0;

    return {
      total: filteredBookings.length,
      confirmed: filteredBookings.filter((b) => b.booking_status === 'confirmed').length,
      pending: filteredBookings.filter((b) => b.booking_status === 'pending').length,
      cancelled: filteredBookings.filter((b) => b.booking_status === 'cancelled').length,
      completed: filteredBookings.filter((b) => b.booking_status === 'completed').length,
      totalRevenue,
      avgStay: Math.round(avgStay * 10) / 10,
      byPlatform: filteredBookings.reduce((acc, b) => {
        const platform = b.booking_platform || 'Direct';
        acc[platform] = (acc[platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bookings: filteredBookings,
    };
  }, [filteredBookings]);

  const financialReport = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalIncome = filteredInvoices
      .filter((i) => i.payment_status === 'paid')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0);

    const expensesByCategory = filteredExpenses.reduce((acc, e) => {
      const category = e.category || 'other';
      acc[category] = (acc[category] || 0) + (e.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      invoiceCount: filteredInvoices.length,
      expenseCount: filteredExpenses.length,
      paidInvoices: filteredInvoices.filter((i) => i.payment_status === 'paid').length,
      unpaidInvoices: filteredInvoices.filter((i) => i.payment_status !== 'paid').length,
      expensesByCategory,
    };
  }, [filteredExpenses, filteredInvoices]);

  const occupancyReport = useMemo(() => {
    const daysInRange = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const totalPropertyDays = (selectedProperty === 'all' ? (properties || []).length : 1) * daysInRange;

    let bookedDays = 0;
    filteredBookings.forEach((b) => {
      const checkIn = b.check_in_date ? parseISO(b.check_in_date) : null;
      const checkOut = b.check_out_date ? parseISO(b.check_out_date) : null;
      if (checkIn && checkOut) {
        const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        bookedDays += days;
      }
    });

    const occupancyRate = totalPropertyDays > 0 ? (bookedDays / totalPropertyDays) * 100 : 0;
    const avgDailyRate = bookedDays > 0
      ? filteredBookings.reduce((sum, b) => sum + (b.total_price || 0), 0) / bookedDays
      : 0;

    return {
      daysInRange,
      totalPropertyDays,
      bookedDays,
      availableDays: totalPropertyDays - bookedDays,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      avgDailyRate: Math.round(avgDailyRate * 100) / 100,
      revPAR: Math.round((occupancyRate / 100) * avgDailyRate * 100) / 100,
    };
  }, [properties, filteredBookings, dateRange, selectedProperty]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleExportCSV = () => {
    let csvContent = '';
    let filename = '';

    switch (reportType) {
      case 'properties':
        csvContent = 'Property Name,Type,Bedrooms,Bathrooms,Status\n';
        propertiesReport.properties.forEach((p) => {
          csvContent += `"${p.property_name}","${p.property_type}",${p.num_bedrooms},${p.num_bathrooms},${p.is_active ? 'Active' : 'Inactive'}\n`;
        });
        filename = 'properties_report.csv';
        break;

      case 'bookings':
        csvContent = 'Property,Guest,Check In,Check Out,Status,Total\n';
        bookingsReport.bookings.forEach((b) => {
          csvContent += `"${b.property?.property_name || ''}","${b.guest_name || ''}","${b.check_in_date}","${b.check_out_date}","${b.booking_status}",${b.total_price}\n`;
        });
        filename = 'bookings_report.csv';
        break;

      case 'financial':
        csvContent = 'Type,Description,Amount,Date\n';
        filteredExpenses.forEach((e) => {
          csvContent += `"Expense","${e.description}",${e.amount},"${e.expense_date}"\n`;
        });
        filteredInvoices.forEach((i) => {
          csvContent += `"Income","Invoice #${i.invoice_number}",${i.total_amount},"${i.invoice_date}"\n`;
        });
        filename = 'financial_report.csv';
        break;

      case 'occupancy':
        csvContent = 'Metric,Value\n';
        csvContent += `"Occupancy Rate",${occupancyReport.occupancyRate}%\n`;
        csvContent += `"Booked Days",${occupancyReport.bookedDays}\n`;
        csvContent += `"Available Days",${occupancyReport.availableDays}\n`;
        csvContent += `"Average Daily Rate",${formatCurrency(occupancyReport.avgDailyRate)}\n`;
        csvContent += `"RevPAR",${formatCurrency(occupancyReport.revPAR)}\n`;
        filename = 'occupancy_report.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={FileText}
        title={t('reports.title', 'Reports')}
        subtitle={t('reports.subtitle', 'Generate and export custom reports')}
        action={
          <Button onClick={handleExportCSV} disabled={isLoading}>
            <Download className="mr-2 h-4 w-4" />
            {t('reports.exportCSV', 'Export CSV')}
          </Button>
        }
      />

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('reports.reportType', 'Report Type')}</Label>
              <Select value={reportType} onValueChange={(v: ReportType) => setReportType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="properties">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      {t('reports.propertiesReport', 'Properties')}
                    </div>
                  </SelectItem>
                  <SelectItem value="bookings">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('reports.bookingsReport', 'Bookings')}
                    </div>
                  </SelectItem>
                  <SelectItem value="financial">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t('reports.financialReport', 'Financial')}
                    </div>
                  </SelectItem>
                  <SelectItem value="occupancy">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {t('reports.occupancyReport', 'Occupancy')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('reports.dateRange', 'Date Range')}</Label>
              <Select value={datePreset} onValueChange={(v: DatePreset) => setDatePreset(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thisMonth">{t('reports.thisMonth', 'This Month')}</SelectItem>
                  <SelectItem value="lastMonth">{t('reports.lastMonth', 'Last Month')}</SelectItem>
                  <SelectItem value="thisQuarter">{t('reports.thisQuarter', 'This Quarter')}</SelectItem>
                  <SelectItem value="thisYear">{t('reports.thisYear', 'This Year')}</SelectItem>
                  <SelectItem value="custom">{t('reports.custom', 'Custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {datePreset === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>{t('reports.startDate', 'Start Date')}</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('reports.endDate', 'End Date')}</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>{t('reports.property', 'Property')}</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reports.allProperties', 'All Properties')}</SelectItem>
                  {(properties || []).map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id}>
                      {property.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {t('reports.dateRangeLabel', 'Showing data from')}: {format(dateRange.start, 'MMM dd, yyyy')} -{' '}
            {format(dateRange.end, 'MMM dd, yyyy')}
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <CasaSpinner />
        </div>
      ) : (
        <>
          {/* Properties Report */}
          {reportType === 'properties' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{propertiesReport.total}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.totalProperties', 'Total Properties')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{propertiesReport.active}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.activeProperties', 'Active')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-gray-500">{propertiesReport.inactive}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.inactiveProperties', 'Inactive')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{Object.keys(propertiesReport.byType).length}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.propertyTypes', 'Property Types')}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.propertyList', 'Property List')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports.propertyName', 'Name')}</TableHead>
                        <TableHead>{t('reports.type', 'Type')}</TableHead>
                        <TableHead>{t('reports.bedrooms', 'Beds')}</TableHead>
                        <TableHead>{t('reports.bathrooms', 'Baths')}</TableHead>
                        <TableHead>{t('reports.status', 'Status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {propertiesReport.properties.map((property) => (
                        <TableRow key={property.property_id}>
                          <TableCell className="font-medium">{property.property_name}</TableCell>
                          <TableCell>{property.property_type}</TableCell>
                          <TableCell>{property.num_bedrooms}</TableCell>
                          <TableCell>{property.num_bathrooms}</TableCell>
                          <TableCell>
                            <Badge variant={property.is_active ? 'default' : 'secondary'}>
                              {property.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Bookings Report */}
          {reportType === 'bookings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{bookingsReport.total}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.totalBookings', 'Total Bookings')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(bookingsReport.totalRevenue)}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.totalRevenue', 'Total Revenue')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{bookingsReport.avgStay}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.avgStay', 'Avg. Stay (days)')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">{bookingsReport.confirmed}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.confirmedBookings', 'Confirmed')}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.bookingList', 'Booking List')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports.property', 'Property')}</TableHead>
                        <TableHead>{t('reports.guest', 'Guest')}</TableHead>
                        <TableHead>{t('reports.checkIn', 'Check In')}</TableHead>
                        <TableHead>{t('reports.checkOut', 'Check Out')}</TableHead>
                        <TableHead>{t('reports.status', 'Status')}</TableHead>
                        <TableHead className="text-right">{t('reports.total', 'Total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingsReport.bookings.slice(0, 20).map((booking) => (
                        <TableRow key={booking.booking_id}>
                          <TableCell className="font-medium">{booking.property?.property_name}</TableCell>
                          <TableCell>{booking.guest_name}</TableCell>
                          <TableCell>{booking.check_in_date && format(parseISO(booking.check_in_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{booking.check_out_date && format(parseISO(booking.check_out_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={booking.booking_status === 'confirmed' ? 'default' : 'secondary'}>
                              {booking.booking_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(booking.total_price || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Financial Report */}
          {reportType === 'financial' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(financialReport.totalIncome)}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.totalIncome', 'Total Income')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(financialReport.totalExpenses)}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.totalExpenses', 'Total Expenses')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className={cn('text-2xl font-bold', financialReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatCurrency(financialReport.netProfit)}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('reports.netProfit', 'Net Profit')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{financialReport.invoiceCount}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.invoices', 'Invoices')}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('reports.expensesByCategory', 'Expenses by Category')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(financialReport.expensesByCategory).map(([category, amount]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="capitalize">{category.replace('_', ' ')}</span>
                          <span className="font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                      {Object.keys(financialReport.expensesByCategory).length === 0 && (
                        <p className="text-muted-foreground text-center py-4">No expenses in this period</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('reports.invoiceStatus', 'Invoice Status')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          {t('reports.paid', 'Paid')}
                        </span>
                        <span className="font-medium">{financialReport.paidInvoices}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          {t('reports.unpaid', 'Unpaid')}
                        </span>
                        <span className="font-medium">{financialReport.unpaidInvoices}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Occupancy Report */}
          {reportType === 'occupancy' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">{occupancyReport.occupancyRate}%</div>
                    <p className="text-sm text-muted-foreground">{t('reports.occupancyRate', 'Occupancy Rate')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(occupancyReport.avgDailyRate)}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.avgDailyRate', 'Avg. Daily Rate')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-purple-600">{formatCurrency(occupancyReport.revPAR)}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.revPAR', 'RevPAR')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{occupancyReport.bookedDays}</div>
                    <p className="text-sm text-muted-foreground">{t('reports.bookedDays', 'Booked Days')}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.occupancyDetails', 'Occupancy Details')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <span>{t('reports.daysInPeriod', 'Days in Period')}</span>
                      <span className="font-bold">{occupancyReport.daysInRange}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <span>{t('reports.totalPropertyDays', 'Total Property Days')}</span>
                      <span className="font-bold">{occupancyReport.totalPropertyDays}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <span className="text-green-700">{t('reports.bookedDays', 'Booked Days')}</span>
                      <span className="font-bold text-green-700">{occupancyReport.bookedDays}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">{t('reports.availableDays', 'Available Days')}</span>
                      <span className="font-bold text-gray-700">{occupancyReport.availableDays}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
