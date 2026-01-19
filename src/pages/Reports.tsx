import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { PageHeader } from '@/components/ui/page-header';
import { CasaSpinner } from '@/components/ui/casa-loader';
import {
  FileText,
  Download,
  BarChart3,
  Calendar,
  DollarSign,
  Home,
  Users,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Wallet,
  UserCheck,
  UserX,
  Receipt,
  PieChart,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Paperclip,
  Layers,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useBookings } from '@/hooks/useBookings';
import { useExpenses } from '@/hooks/useExpenses';
import { useInvoices } from '@/hooks/useInvoices';
import {
  useClientsList,
  useCurrentBalanceReport,
  useFinancialEntriesReport,
  useActiveClientsReport,
  useInactiveClientsReport,
  useEnhancedBookingsReport,
  useRentalRevenueReport,
} from '@/hooks/useReportData';
import {
  exportCurrentBalanceToExcel,
  exportFinancialEntriesToExcel,
  exportActiveClientsToExcel,
  exportInactiveClientsToExcel,
  exportEnhancedBookingsToExcel,
  exportRentalRevenueToExcel,
} from '@/lib/excel-export';
import {
  generateCurrentBalancePDF,
  generateFinancialEntriesPDF,
  generateActiveClientsPDF,
  generateInactiveClientsPDF,
  generateEnhancedBookingsPDF,
  generateRentalRevenuePDF,
} from '@/lib/pdf-generator';
import { cn } from '@/lib/utils';
import { ExpandedEntryContent } from '@/components/PropertyEdit/ExpandedEntryContent';

type ReportType =
  | 'properties'
  | 'bookings'
  | 'financial'
  | 'occupancy'
  | 'currentBalance'
  | 'financialEntries'
  | 'activeClients'
  | 'inactiveClients'
  | 'bookingsEnhanced'
  | 'rentalRevenue';

type DatePreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'custom';

export default function Reports() {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<ReportType>('properties');
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');

  // New filter states
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [includeInactiveClients, setIncludeInactiveClients] = useState(false);
  const [showDebit, setShowDebit] = useState(true);
  const [showCredit, setShowCredit] = useState(true);
  const [showOwnerTransactions, setShowOwnerTransactions] = useState(false);
  const [showServiceCost, setShowServiceCost] = useState(true);
  const [withFinancial, setWithFinancial] = useState(false);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Expandable rows state for financial entries
  const [expandedFinancialRows, setExpandedFinancialRows] = useState<Set<string>>(new Set());

  // Expandable rows state for properties (to show units)
  const [expandedPropertyRows, setExpandedPropertyRows] = useState<Set<string>>(new Set());

  // Toggle financial entry row expansion
  const toggleFinancialRowExpansion = useCallback((expenseId: string) => {
    setExpandedFinancialRows(prev => {
      const next = new Set(prev);
      if (next.has(expenseId)) {
        next.delete(expenseId);
      } else {
        next.add(expenseId);
      }
      return next;
    });
  }, []);

  // Toggle property row expansion (to show units)
  const togglePropertyRowExpansion = useCallback((propertyId: string) => {
    setExpandedPropertyRows(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  }, []);

  // Fetch base data
  const { properties, loading: loadingProperties } = usePropertiesOptimized();
  const { bookings, loading: loadingBookings } = useBookings();
  const { expenses, loading: loadingExpenses } = useExpenses();
  const { invoices, loading: loadingInvoices } = useInvoices();
  const { data: clientsList, isLoading: loadingClients } = useClientsList();

  const isLoading = loadingProperties || loadingBookings || loadingExpenses || loadingInvoices || loadingClients;

  // Get units for the selected property
  const selectedPropertyUnits = useMemo(() => {
    if (selectedProperty === 'all') return [];
    const property = (properties || []).find(p => p.property_id === selectedProperty);
    return property?.units || [];
  }, [properties, selectedProperty]);

  // Reset unit selection when property changes
  const handlePropertyChange = useCallback((propertyId: string) => {
    setSelectedProperty(propertyId);
    setSelectedUnit('all'); // Reset unit selection when property changes
  }, []);

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

  const dateFromStr = format(dateRange.start, 'yyyy-MM-dd');
  const dateToStr = format(dateRange.end, 'yyyy-MM-dd');

  // New report hooks - only run when report type is selected
  const { data: currentBalanceData, isLoading: loadingCurrentBalance, refetch: refetchCurrentBalance } = useCurrentBalanceReport({
    clientId: selectedClient,
    includeInactive: includeInactiveClients,
    dateFrom: dateFromStr,
    dateTo: dateToStr,
    enabled: reportType === 'currentBalance',
  });

  const { data: financialEntriesData, isLoading: loadingFinancialEntries, refetch: refetchFinancialEntries } = useFinancialEntriesReport({
    clientId: selectedClient,
    includeInactive: includeInactiveClients,
    propertyId: selectedProperty,
    dateFrom: dateFromStr,
    dateTo: dateToStr,
    showDebit,
    showCredit,
    showOwnerTransactions,
    showServiceCost,
    enabled: reportType === 'financialEntries',
  });

  const { data: activeClientsData, isLoading: loadingActiveClients, refetch: refetchActiveClients } = useActiveClientsReport({
    dateFrom: dateFromStr,
    dateTo: dateToStr,
    enabled: reportType === 'activeClients',
  });

  const { data: inactiveClientsData, isLoading: loadingInactiveClients, refetch: refetchInactiveClients } = useInactiveClientsReport({
    dateFrom: dateFromStr,
    dateTo: dateToStr,
    inactivityDays: 90,
    enabled: reportType === 'inactiveClients',
  });

  const { data: bookingsEnhancedData, isLoading: loadingBookingsEnhanced, refetch: refetchBookingsEnhanced } = useEnhancedBookingsReport({
    clientId: selectedClient,
    includeInactive: includeInactiveClients,
    propertyId: selectedProperty,
    unitId: selectedUnit,
    dateFrom: dateFromStr,
    dateTo: dateToStr,
    withFinancial,
    showTaxDetails,
    enabled: reportType === 'bookingsEnhanced',
  });

  const { data: rentalRevenueData, isLoading: loadingRentalRevenue, refetch: refetchRentalRevenue } = useRentalRevenueReport({
    dateFrom: dateFromStr,
    dateTo: dateToStr,
    propertyId: selectedProperty,
    unitId: selectedUnit,
    enabled: reportType === 'rentalRevenue',
  });

  // Filter data by date range and property (for existing reports)
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

  // Calculate report data (existing reports)
  const propertiesReport = useMemo(() => {
    const filtered =
      selectedProperty === 'all'
        ? properties || []
        : (properties || []).filter((p) => p.property_id === selectedProperty);

    return {
      total: filtered.length,
      active: filtered.filter((p) => p.is_active).length,
      inactive: filtered.filter((p) => !p.is_active).length,
      byType: filtered.reduce(
        (acc, p) => {
          const type = p.property_type || 'Other';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      properties: filtered,
    };
  }, [properties, selectedProperty]);

  const bookingsReport = useMemo(() => {
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const avgStay =
      filteredBookings.length > 0
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
      byPlatform: filteredBookings.reduce(
        (acc, b) => {
          const platform = b.booking_platform || 'Direct';
          acc[platform] = (acc[platform] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      bookings: filteredBookings,
    };
  }, [filteredBookings]);

  const financialReport = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalIncome = filteredInvoices
      .filter((i) => i.payment_status === 'paid')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0);

    const expensesByCategory = filteredExpenses.reduce(
      (acc, e) => {
        const category = e.category || 'other';
        acc[category] = (acc[category] || 0) + (e.amount || 0);
        return acc;
      },
      {} as Record<string, number>
    );

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
    const avgDailyRate =
      bookedDays > 0 ? filteredBookings.reduce((sum, b) => sum + (b.total_price || 0), 0) / bookedDays : 0;

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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Build filter description for exports
  const getFilterDescription = () => {
    const filters: Record<string, string> = {
      'Date Range': `${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`,
    };

    if (selectedProperty !== 'all') {
      const prop = (properties || []).find((p) => p.property_id === selectedProperty);
      filters['Property'] = prop?.property_name || selectedProperty;
    }

    if (selectedUnit !== 'all' && selectedPropertyUnits.length > 0) {
      if (selectedUnit === 'entire') {
        filters['Unit'] = 'Entire Property Only';
      } else {
        const unit = selectedPropertyUnits.find((u: any) => u.unit_id === selectedUnit);
        filters['Unit'] = unit?.property_name || selectedUnit;
      }
    }

    if (selectedClient !== 'all') {
      const client = (clientsList || []).find((c) => c.id === selectedClient);
      filters['Client'] = client?.name || selectedClient;
    }

    if (includeInactiveClients) {
      filters['Include Inactive'] = 'Yes';
    }

    return filters;
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

      default:
        return; // New reports use Excel/PDF export
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleExportExcel = () => {
    const filters = getFilterDescription();

    switch (reportType) {
      case 'currentBalance':
        if (currentBalanceData) {
          exportCurrentBalanceToExcel(currentBalanceData, filters);
        }
        break;
      case 'financialEntries':
        if (financialEntriesData) {
          exportFinancialEntriesToExcel(financialEntriesData, filters);
        }
        break;
      case 'activeClients':
        if (activeClientsData) {
          exportActiveClientsToExcel(activeClientsData, filters);
        }
        break;
      case 'inactiveClients':
        if (inactiveClientsData) {
          exportInactiveClientsToExcel(inactiveClientsData, filters);
        }
        break;
      case 'bookingsEnhanced':
        if (bookingsEnhancedData) {
          exportEnhancedBookingsToExcel(bookingsEnhancedData, filters, withFinancial, showTaxDetails);
        }
        break;
      case 'rentalRevenue':
        if (rentalRevenueData) {
          exportRentalRevenueToExcel(rentalRevenueData, filters);
        }
        break;
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    const filters = getFilterDescription();

    try {
      switch (reportType) {
        case 'currentBalance':
          if (currentBalanceData) {
            await generateCurrentBalancePDF(currentBalanceData, filters);
          }
          break;
        case 'financialEntries':
          if (financialEntriesData) {
            await generateFinancialEntriesPDF(financialEntriesData, filters);
          }
          break;
        case 'activeClients':
          if (activeClientsData) {
            await generateActiveClientsPDF(activeClientsData, filters);
          }
          break;
        case 'inactiveClients':
          if (inactiveClientsData) {
            await generateInactiveClientsPDF(inactiveClientsData, filters);
          }
          break;
        case 'bookingsEnhanced':
          if (bookingsEnhancedData) {
            await generateEnhancedBookingsPDF(bookingsEnhancedData, filters, withFinancial, showTaxDetails);
          }
          break;
        case 'rentalRevenue':
          if (rentalRevenueData) {
            await generateRentalRevenuePDF(rentalRevenueData, filters);
          }
          break;
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Check if current report type is one of the new reports
  const isNewReport = ['currentBalance', 'financialEntries', 'activeClients', 'inactiveClients', 'bookingsEnhanced', 'rentalRevenue'].includes(reportType);

  // Check if current report type needs client filter
  const needsClientFilter = ['currentBalance', 'financialEntries', 'bookingsEnhanced'].includes(reportType);

  // Check if current report type needs movement type filters
  const needsMovementFilter = reportType === 'financialEntries';

  // Check if current report type needs enhanced booking options
  const needsBookingOptions = reportType === 'bookingsEnhanced';

  // Handle refresh for current report type
  const handleRefresh = () => {
    switch (reportType) {
      case 'currentBalance':
        refetchCurrentBalance();
        break;
      case 'financialEntries':
        refetchFinancialEntries();
        break;
      case 'activeClients':
        refetchActiveClients();
        break;
      case 'inactiveClients':
        refetchInactiveClients();
        break;
      case 'bookingsEnhanced':
        refetchBookingsEnhanced();
        break;
      case 'rentalRevenue':
        refetchRentalRevenue();
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={FileText}
        title={t('reports.title', 'Reports')}
        subtitle={t('reports.subtitle', 'Generate and export custom reports')}
        actions={
          <div className="flex gap-2">
            <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            {!isNewReport && (
              <Button onClick={handleExportCSV} disabled={isLoading} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {t('reports.exportCSV', 'CSV')}
              </Button>
            )}
            {isNewReport && (
              <>
                <Button onClick={handleExportExcel} disabled={isLoading} variant="outline">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {t('reports.exportExcel', 'Excel')}
                </Button>
                <Button onClick={handleExportPDF} disabled={isLoading || isExporting}>
                  <FileText className="mr-2 h-4 w-4" />
                  {isExporting ? t('reports.exporting', 'Exporting...') : t('reports.exportPDF', 'PDF')}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Report Type Selector */}
            <div className="space-y-2 md:col-span-2">
              <Label>{t('reports.reportType', 'Report Type')}</Label>
              <Select value={reportType} onValueChange={(v: ReportType) => setReportType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Original Reports */}
                  <SelectItem value="properties">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      {t('reports.propertiesReport', 'Properties')}
                    </div>
                  </SelectItem>
                  <SelectItem value="financial">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t('reports.financialReport', 'Financial Summary')}
                    </div>
                  </SelectItem>
                  <SelectItem value="occupancy">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {t('reports.occupancyReport', 'Occupancy')}
                    </div>
                  </SelectItem>

                  {/* New Reports */}
                  <SelectItem value="currentBalance">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      {t('reports.currentBalance', 'Current Balance')}
                    </div>
                  </SelectItem>
                  <SelectItem value="financialEntries">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      {t('reports.financialEntries', 'Financial Entries')}
                    </div>
                  </SelectItem>
                  <SelectItem value="activeClients">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      {t('reports.activeClients', 'Active Clients')}
                    </div>
                  </SelectItem>
                  <SelectItem value="inactiveClients">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4" />
                      {t('reports.inactiveClients', 'Inactive Clients')}
                    </div>
                  </SelectItem>
                  <SelectItem value="bookingsEnhanced">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('reports.bookingsEnhanced', 'Bookings (Enhanced)')}
                    </div>
                  </SelectItem>
                  <SelectItem value="rentalRevenue">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      {t('reports.rentalRevenue', 'Rental Revenue')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
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

            {/* Property Filter */}
            <div className="space-y-2">
              <Label>{t('reports.property', 'Property')}</Label>
              <Select value={selectedProperty} onValueChange={handlePropertyChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reports.allProperties', 'All Properties')}</SelectItem>
                  {(properties || []).map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id}>
                      {property.property_name}
                      {property.units && property.units.length > 0 && (
                        <span className="text-muted-foreground ml-1">({property.units.length} units)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unit Filter - only show when a property with units is selected */}
          {selectedProperty !== 'all' && selectedPropertyUnits.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="space-y-2">
                <Label>{t('reports.unit', 'Unit')}</Label>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('reports.allUnits', 'All Units')}</SelectItem>
                    <SelectItem value="entire">{t('reports.entireProperty', 'Entire Property Only')}</SelectItem>
                    {selectedPropertyUnits.map((unit: any) => (
                      <SelectItem key={unit.unit_id} value={unit.unit_id}>
                        {unit.property_name || `Unit ${unit.unit_id.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Custom Date Range */}
          {datePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>{t('reports.startDate', 'Start Date')}</Label>
                <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('reports.endDate', 'End Date')}</Label>
                <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
              </div>
            </div>
          )}

          {/* Client Filter (for new reports) */}
          {needsClientFilter && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label>{t('reports.client', 'Client')}</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('reports.allClients', 'All Clients')}</SelectItem>
                    {(clientsList || []).map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.email ? `(${client.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="includeInactive"
                  checked={includeInactiveClients}
                  onCheckedChange={(checked) => setIncludeInactiveClients(checked as boolean)}
                />
                <Label htmlFor="includeInactive" className="cursor-pointer">
                  {t('reports.includeInactiveClients', 'Include Inactive Clients')}
                </Label>
              </div>
            </div>
          )}

          {/* Movement Type Filters (for Financial Entries) */}
          {needsMovementFilter && (
            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showDebit"
                  checked={showDebit}
                  onCheckedChange={(checked) => setShowDebit(checked as boolean)}
                />
                <Label htmlFor="showDebit" className="cursor-pointer">
                  {t('reports.showDebit', 'Debit')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showCredit"
                  checked={showCredit}
                  onCheckedChange={(checked) => setShowCredit(checked as boolean)}
                />
                <Label htmlFor="showCredit" className="cursor-pointer">
                  {t('reports.showCredit', 'Credit')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showOwner"
                  checked={showOwnerTransactions}
                  onCheckedChange={(checked) => setShowOwnerTransactions(checked as boolean)}
                />
                <Label htmlFor="showOwner" className="cursor-pointer">
                  {t('reports.showOwnerTransactions', 'Owner Transactions')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showServiceCost"
                  checked={showServiceCost}
                  onCheckedChange={(checked) => setShowServiceCost(checked as boolean)}
                />
                <Label htmlFor="showServiceCost" className="cursor-pointer">
                  {t('reports.showServiceCost', 'Service Cost')}
                </Label>
              </div>
            </div>
          )}

          {/* Enhanced Booking Options */}
          {needsBookingOptions && (
            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="withFinancial"
                  checked={withFinancial}
                  onCheckedChange={(checked) => setWithFinancial(checked as boolean)}
                />
                <Label htmlFor="withFinancial" className="cursor-pointer">
                  {t('reports.withFinancial', 'With Financial Details')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showTax"
                  checked={showTaxDetails}
                  onCheckedChange={(checked) => setShowTaxDetails(checked as boolean)}
                />
                <Label htmlFor="showTax" className="cursor-pointer">
                  {t('reports.showTaxDetails', 'Show Tax Details')}
                </Label>
              </div>
            </div>
          )}

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
          {/* ==================== ORIGINAL REPORTS ==================== */}

          {/* Properties Report */}
          {reportType === 'properties' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <Home className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">
                          {t('reports.totalProperties', 'Total Properties')}
                        </p>
                        <div className="text-2xl font-semibold">{propertiesReport.total}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">{t('reports.activeProperties', 'Active')}</p>
                        <div className="text-2xl font-semibold">{propertiesReport.active}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">
                          {t('reports.inactiveProperties', 'Inactive')}
                        </p>
                        <div className="text-2xl font-semibold">{propertiesReport.inactive}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">
                          {t('reports.propertyTypes', 'Property Types')}
                        </p>
                        <div className="text-2xl font-semibold">
                          {Object.keys(propertiesReport.byType).length}
                        </div>
                      </div>
                    </div>
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
                        <TableHead className="w-10"></TableHead>
                        <TableHead>{t('reports.propertyName', 'Name')}</TableHead>
                        <TableHead>{t('reports.type', 'Type')}</TableHead>
                        <TableHead>{t('reports.units', 'Units')}</TableHead>
                        <TableHead>{t('reports.bedrooms', 'Beds')}</TableHead>
                        <TableHead>{t('reports.bathrooms', 'Baths')}</TableHead>
                        <TableHead>{t('reports.status', 'Status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {propertiesReport.properties.map((property) => {
                        const hasUnits = property.units && property.units.length > 0;
                        const isExpanded = expandedPropertyRows.has(property.property_id!);
                        return (
                          <React.Fragment key={property.property_id}>
                            <TableRow className={`${hasUnits ? 'cursor-pointer hover:bg-muted/50' : ''} ${isExpanded ? 'bg-purple-50' : ''}`}>
                              <TableCell>
                                {hasUnits && (
                                  <button
                                    onClick={() => togglePropertyRowExpansion(property.property_id!)}
                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-purple-600" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-gray-600" />
                                    )}
                                  </button>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{property.property_name}</TableCell>
                              <TableCell>{property.property_type}</TableCell>
                              <TableCell>
                                {hasUnits ? (
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    <Layers className="h-3 w-3 mr-1" />
                                    {property.units!.length} {property.units!.length === 1 ? 'unit' : 'units'}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>{property.num_bedrooms}</TableCell>
                              <TableCell>{property.num_bathrooms}</TableCell>
                              <TableCell>
                                <Badge variant={property.is_active ? 'default' : 'secondary'}>
                                  {property.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                            {/* Unit rows */}
                            {isExpanded && hasUnits && property.units!.map((unit: any, index: number) => (
                              <TableRow
                                key={unit.unit_id || index}
                                className={`bg-gradient-to-r from-purple-50 to-white ${index === property.units!.length - 1 ? 'border-b-2 border-b-purple-200' : ''}`}
                              >
                                <TableCell>
                                  <div className="pl-4">
                                    <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
                                      <Layers className="h-3 w-3 text-purple-600" />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium text-purple-800">
                                  <div>{unit.property_name || `Unit ${index + 1}`}</div>
                                  {(unit.num_bedrooms !== null || unit.num_bathrooms !== null) && (
                                    <div className="text-xs text-purple-500 font-normal">
                                      {unit.num_bedrooms !== null && `${unit.num_bedrooms} bed`}
                                      {unit.num_bedrooms !== null && unit.num_bathrooms !== null && ' • '}
                                      {unit.num_bathrooms !== null && `${unit.num_bathrooms} bath`}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-purple-600 text-sm">
                                  {unit.license_number && `License: ${unit.license_number}`}
                                </TableCell>
                                <TableCell className="text-purple-600 text-sm">
                                  {unit.folio && `Folio: ${unit.folio}`}
                                </TableCell>
                                <TableCell colSpan={2}>
                                  {unit.owner ? (
                                    <span className="text-sm text-purple-700">
                                      {unit.owner.first_name} {unit.owner.last_name}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">Inherits owner</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                                    Unit
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })}
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
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">{t('reports.totalIncome', 'Total Income')}</p>
                        <div className="text-2xl font-semibold">
                          {formatCurrency(financialReport.totalIncome)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">
                          {t('reports.totalExpenses', 'Total Expenses')}
                        </p>
                        <div className="text-2xl font-semibold">
                          {formatCurrency(financialReport.totalExpenses)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">
                          {t('reports.netProfit', 'Net Profit')}
                        </p>
                        <div
                          className={cn(
                            'text-2xl font-semibold',
                            financialReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {formatCurrency(financialReport.netProfit)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">{t('reports.invoices', 'Invoices')}</p>
                        <div className="text-2xl font-semibold">{financialReport.invoiceCount}</div>
                      </div>
                    </div>
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
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">
                          {t('reports.occupancyRate', 'Occupancy Rate')}
                        </p>
                        <div className="text-2xl font-semibold">{occupancyReport.occupancyRate}%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">
                          {t('reports.avgDailyRate', 'Avg. Daily Rate')}
                        </p>
                        <div className="text-2xl font-semibold">
                          {formatCurrency(occupancyReport.avgDailyRate)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">{t('reports.revPAR', 'RevPAR')}</p>
                        <div className="text-2xl font-semibold">
                          {formatCurrency(occupancyReport.revPAR)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">{t('reports.bookedDays', 'Booked Days')}</p>
                        <div className="text-2xl font-semibold">{occupancyReport.bookedDays}</div>
                      </div>
                    </div>
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

          {/* ==================== NEW REPORTS ==================== */}

          {/* Current Balance Report */}
          {reportType === 'currentBalance' && (
            <div className="space-y-6">
              {loadingCurrentBalance ? (
                <div className="flex justify-center py-12">
                  <CasaSpinner />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.totalClients', 'Total Clients')}</p>
                            <div className="text-2xl font-semibold">{currentBalanceData?.length || 0}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.totalInvoiced', 'Total Invoiced')}</p>
                            <div className="text-2xl font-semibold">
                              {formatCurrency((currentBalanceData || []).reduce((sum, d) => sum + d.total_invoiced, 0))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.totalBalanceDue', 'Balance Due')}</p>
                            <div className="text-2xl font-semibold">
                              {formatCurrency((currentBalanceData || []).reduce((sum, d) => sum + d.balance_due, 0))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('reports.currentBalanceList', 'Current Balance by Client')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('reports.guestName', 'Guest Name')}</TableHead>
                            <TableHead>{t('reports.email', 'Email')}</TableHead>
                            <TableHead className="text-right">{t('reports.totalInvoiced', 'Total Invoiced')}</TableHead>
                            <TableHead className="text-right">{t('reports.totalPaid', 'Total Paid')}</TableHead>
                            <TableHead className="text-right">{t('reports.balanceDue', 'Balance Due')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(currentBalanceData || []).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{row.guest_name}</TableCell>
                              <TableCell>{row.guest_email || '-'}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.total_invoiced)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.total_paid)}</TableCell>
                              <TableCell className={cn('text-right font-medium', row.balance_due > 0 ? 'text-orange-600' : 'text-green-600')}>
                                {formatCurrency(row.balance_due)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!currentBalanceData || currentBalanceData.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                {t('reports.noData', 'No data available')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Financial Entries Report */}
          {reportType === 'financialEntries' && (
            <div className="space-y-6">
              {loadingFinancialEntries ? (
                <div className="flex justify-center py-12">
                  <CasaSpinner />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.totalEntries', 'Total Entries')}</p>
                            <div className="text-2xl font-semibold">{financialEntriesData?.length || 0}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-muted-foreground rotate-180" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.totalDebits', 'Total Debits')}</p>
                            <div className="text-2xl font-semibold text-red-600">
                              {formatCurrency((financialEntriesData || []).filter(e => e.entry_type === 'debit').reduce((sum, e) => sum + e.amount, 0))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.totalCredits', 'Total Credits')}</p>
                            <div className="text-2xl font-semibold text-green-600">
                              {formatCurrency((financialEntriesData || []).filter(e => e.entry_type === 'credit').reduce((sum, e) => sum + e.amount, 0))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.runningBalance', 'Running Balance')}</p>
                            <div className="text-2xl font-semibold">
                              {formatCurrency((financialEntriesData || []).slice(-1)[0]?.running_balance || 0)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('reports.financialEntriesList', 'Financial Entries')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>{t('reports.date', 'Date')}</TableHead>
                            <TableHead>{t('reports.property', 'Property')}</TableHead>
                            <TableHead>{t('reports.type', 'Type')}</TableHead>
                            <TableHead>{t('reports.description', 'Description')}</TableHead>
                            <TableHead className="text-right">{t('reports.amount', 'Amount')}</TableHead>
                            <TableHead className="text-right">{t('reports.runningBalance', 'Balance')}</TableHead>
                            <TableHead className="text-center">{t('financialEntries.files', 'Files')}</TableHead>
                            <TableHead className="text-center">{t('financialEntries.notes', 'Notes')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(financialEntriesData || []).map((row) => {
                            const isExpanded = expandedFinancialRows.has(row.expense_id);
                            return (
                              <React.Fragment key={row.expense_id}>
                                <TableRow
                                  className={cn(
                                    'cursor-pointer hover:bg-muted/50',
                                    isExpanded && 'border-b-0'
                                  )}
                                  onClick={() => toggleFinancialRowExpansion(row.expense_id)}
                                >
                                  <TableCell className="w-10">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFinancialRowExpansion(row.expense_id);
                                      }}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TableCell>
                                  <TableCell>{formatDate(row.date)}</TableCell>
                                  <TableCell>{row.property_name}</TableCell>
                                  <TableCell>
                                    <Badge variant={row.entry_type === 'credit' ? 'default' : row.entry_type === 'debit' ? 'destructive' : 'secondary'}>
                                      {row.entry_type.charAt(0).toUpperCase() + row.entry_type.slice(1)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="max-w-[200px] truncate">{row.description}</TableCell>
                                  <TableCell className={cn('text-right', row.entry_type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                                    {row.entry_type === 'credit' ? '+' : '-'}{formatCurrency(row.amount)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(row.running_balance)}</TableCell>
                                  <TableCell className="text-center">
                                    {row.attachment_count > 0 ? (
                                      <Badge variant="secondary" className="text-xs">
                                        <Paperclip className="h-3 w-3 mr-1" />
                                        {row.attachment_count}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">0</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {row.note_count > 0 ? (
                                      <Badge variant="secondary" className="text-xs">
                                        <MessageSquare className="h-3 w-3 mr-1" />
                                        {row.note_count}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">0</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                                {/* Expanded Content */}
                                {isExpanded && (
                                  <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                    <TableCell colSpan={9} className="p-0">
                                      <ExpandedEntryContent expenseId={row.expense_id} readOnly />
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                          {(!financialEntriesData || financialEntriesData.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                {t('reports.noData', 'No data available')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Active Clients Report */}
          {reportType === 'activeClients' && (
            <div className="space-y-6">
              {loadingActiveClients ? (
                <div className="flex justify-center py-12">
                  <CasaSpinner />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <UserCheck className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.activeClientsCount', 'Active Clients')}</p>
                            <div className="text-2xl font-semibold">{activeClientsData?.length || 0}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.totalBookingsCount', 'Total Bookings')}</p>
                            <div className="text-2xl font-semibold">
                              {(activeClientsData || []).reduce((sum, c) => sum + c.total_bookings, 0)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.totalSpent', 'Total Spent')}</p>
                            <div className="text-2xl font-semibold">
                              {formatCurrency((activeClientsData || []).reduce((sum, c) => sum + c.total_spent, 0))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('reports.activeClientsList', 'Active Clients')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('reports.guestName', 'Guest Name')}</TableHead>
                            <TableHead>{t('reports.email', 'Email')}</TableHead>
                            <TableHead>{t('reports.phone', 'Phone')}</TableHead>
                            <TableHead>{t('reports.lastBooking', 'Last Booking')}</TableHead>
                            <TableHead className="text-right">{t('reports.totalBookings', 'Bookings')}</TableHead>
                            <TableHead className="text-right">{t('reports.totalSpent', 'Total Spent')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(activeClientsData || []).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{row.guest_name}</TableCell>
                              <TableCell>{row.guest_email || '-'}</TableCell>
                              <TableCell>{row.guest_phone || '-'}</TableCell>
                              <TableCell>{formatDate(row.last_booking)}</TableCell>
                              <TableCell className="text-right">{row.total_bookings}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.total_spent)}</TableCell>
                            </TableRow>
                          ))}
                          {(!activeClientsData || activeClientsData.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                {t('reports.noData', 'No data available')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Inactive Clients Report */}
          {reportType === 'inactiveClients' && (
            <div className="space-y-6">
              {loadingInactiveClients ? (
                <div className="flex justify-center py-12">
                  <CasaSpinner />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <UserX className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.inactiveClientsCount', 'Inactive Clients')}</p>
                            <div className="text-2xl font-semibold">{inactiveClientsData?.length || 0}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.avgDaysInactive', 'Avg. Days Inactive')}</p>
                            <div className="text-2xl font-semibold">
                              {inactiveClientsData && inactiveClientsData.length > 0
                                ? Math.round(inactiveClientsData.reduce((sum, c) => sum + c.days_since_last_booking, 0) / inactiveClientsData.length)
                                : 0}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('reports.inactiveClientsList', 'Inactive Clients')}</CardTitle>
                      <CardDescription>{t('reports.inactiveClientsDesc', 'Clients with no bookings in the last 90 days')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('reports.guestName', 'Guest Name')}</TableHead>
                            <TableHead>{t('reports.email', 'Email')}</TableHead>
                            <TableHead>{t('reports.phone', 'Phone')}</TableHead>
                            <TableHead>{t('reports.lastBookingDate', 'Last Booking Date')}</TableHead>
                            <TableHead className="text-right">{t('reports.daysSinceLastBooking', 'Days Inactive')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(inactiveClientsData || []).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{row.guest_name}</TableCell>
                              <TableCell>{row.guest_email || '-'}</TableCell>
                              <TableCell>{row.guest_phone || '-'}</TableCell>
                              <TableCell>{formatDate(row.last_booking_date)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={row.days_since_last_booking > 180 ? 'destructive' : 'secondary'}>
                                  {row.days_since_last_booking} days
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!inactiveClientsData || inactiveClientsData.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                {t('reports.noData', 'No data available')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Enhanced Bookings Report */}
          {reportType === 'bookingsEnhanced' && (
            <div className="space-y-6">
              {loadingBookingsEnhanced ? (
                <div className="flex justify-center py-12">
                  <CasaSpinner />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.totalBookings', 'Total Bookings')}</p>
                            <div className="text-2xl font-semibold">{bookingsEnhancedData?.length || 0}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.totalAmount', 'Total Amount')}</p>
                            <div className="text-2xl font-semibold">
                              {formatCurrency((bookingsEnhancedData || []).reduce((sum, b) => sum + b.total_price, 0))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {withFinancial && (
                      <>
                        <Card className="transition-colors hover:bg-accent/50">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground">{t('reports.totalPaid', 'Total Paid')}</p>
                                <div className="text-2xl font-semibold text-green-600">
                                  {formatCurrency((bookingsEnhancedData || []).reduce((sum, b) => sum + (b.invoice_paid || 0), 0))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="transition-colors hover:bg-accent/50">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                                <Wallet className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground">{t('reports.totalBalance', 'Total Balance')}</p>
                                <div className="text-2xl font-semibold">
                                  {formatCurrency((bookingsEnhancedData || []).reduce((sum, b) => sum + (b.invoice_balance || 0), 0))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                    {showTaxDetails && (
                      <Card className="transition-colors hover:bg-accent/50">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                              <Receipt className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-muted-foreground">{t('reports.totalTax', 'Total Tax')}</p>
                              <div className="text-2xl font-semibold">
                                {formatCurrency((bookingsEnhancedData || []).reduce((sum, b) => sum + (b.tax_amount || 0), 0))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('reports.bookingsEnhancedList', 'Bookings')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('reports.bookingId', 'ID')}</TableHead>
                            <TableHead>{t('reports.guest', 'Guest')}</TableHead>
                            <TableHead>{t('reports.property', 'Property')}</TableHead>
                            <TableHead>{t('reports.unit', 'Unit')}</TableHead>
                            <TableHead>{t('reports.checkIn', 'Check In')}</TableHead>
                            <TableHead>{t('reports.checkOut', 'Check Out')}</TableHead>
                            <TableHead>{t('reports.status', 'Status')}</TableHead>
                            <TableHead className="text-right">{t('reports.amount', 'Amount')}</TableHead>
                            {withFinancial && (
                              <>
                                <TableHead>{t('reports.invoiceNumber', 'Invoice #')}</TableHead>
                                <TableHead className="text-right">{t('reports.paid', 'Paid')}</TableHead>
                                <TableHead className="text-right">{t('reports.balance', 'Balance')}</TableHead>
                              </>
                            )}
                            {showTaxDetails && (
                              <TableHead className="text-right">{t('reports.tax', 'Tax')}</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(bookingsEnhancedData || []).slice(0, 50).map((row) => (
                            <TableRow key={row.booking_id}>
                              <TableCell className="font-mono text-xs">{row.booking_id.substring(0, 8)}...</TableCell>
                              <TableCell>{row.guest_name}</TableCell>
                              <TableCell>{row.property_name}</TableCell>
                              <TableCell>
                                <span className={row.unit_id === null ? 'text-muted-foreground' : ''}>
                                  {row.unit_name || 'N/A'}
                                </span>
                              </TableCell>
                              <TableCell>{formatDate(row.check_in_date)}</TableCell>
                              <TableCell>{formatDate(row.check_out_date)}</TableCell>
                              <TableCell>
                                <Badge variant={row.booking_status === 'confirmed' ? 'default' : row.booking_status === 'cancelled' ? 'destructive' : 'secondary'}>
                                  {row.booking_status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(row.total_price)}</TableCell>
                              {withFinancial && (
                                <>
                                  <TableCell>{row.invoice_number || 'N/A'}</TableCell>
                                  <TableCell className="text-right text-green-600">{formatCurrency(row.invoice_paid || 0)}</TableCell>
                                  <TableCell className={cn('text-right', (row.invoice_balance || 0) > 0 ? 'text-orange-600' : 'text-green-600')}>
                                    {formatCurrency(row.invoice_balance || 0)}
                                  </TableCell>
                                </>
                              )}
                              {showTaxDetails && (
                                <TableCell className="text-right">{formatCurrency(row.tax_amount || 0)}</TableCell>
                              )}
                            </TableRow>
                          ))}
                          {(!bookingsEnhancedData || bookingsEnhancedData.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={withFinancial ? (showTaxDetails ? 12 : 11) : (showTaxDetails ? 9 : 8)} className="text-center text-muted-foreground py-8">
                                {t('reports.noData', 'No data available')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Rental Revenue Report */}
          {reportType === 'rentalRevenue' && (
            <div className="space-y-6">
              {loadingRentalRevenue ? (
                <div className="flex justify-center py-12">
                  <CasaSpinner />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.bookingRevenue', 'Booking Revenue')}</p>
                            <div className="text-2xl font-semibold">
                              {formatCurrency(rentalRevenueData?.totalBookingRevenue || 0)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.invoiceRevenue', 'Invoice Revenue')}</p>
                            <div className="text-2xl font-semibold">
                              {formatCurrency(rentalRevenueData?.invoiceRevenue || 0)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">{t('reports.grandTotal', 'Grand Total')}</p>
                            <div className="text-2xl font-semibold">
                              {formatCurrency((rentalRevenueData?.totalBookingRevenue || 0) + (rentalRevenueData?.invoiceRevenue || 0))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('reports.revenueByProperty', 'Revenue by Property')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('reports.property', 'Property')}</TableHead>
                              <TableHead className="text-right">{t('reports.baseAmount', 'Base')}</TableHead>
                              <TableHead className="text-right">{t('reports.extras', 'Extras')}</TableHead>
                              <TableHead className="text-right">{t('reports.cleaning', 'Cleaning')}</TableHead>
                              <TableHead className="text-right">{t('reports.total', 'Total')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(rentalRevenueData?.byProperty || []).map((row) => (
                              <TableRow key={row.property_id}>
                                <TableCell className="font-medium">{row.property_name}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.base_amount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.extras)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.cleaning)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(row.total)}</TableCell>
                              </TableRow>
                            ))}
                            {(!rentalRevenueData?.byProperty || rentalRevenueData.byProperty.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                  {t('reports.noData', 'No data available')}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t('reports.revenueByUnit', 'Revenue by Unit')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('reports.unit', 'Unit')}</TableHead>
                              <TableHead>{t('reports.property', 'Property')}</TableHead>
                              <TableHead className="text-right">{t('reports.total', 'Total')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(rentalRevenueData?.byUnit || []).map((row) => (
                              <TableRow key={row.unit_id || 'entire'}>
                                <TableCell className={row.unit_id === null ? 'text-muted-foreground' : 'font-medium'}>
                                  {row.unit_name}
                                </TableCell>
                                <TableCell>{row.property_name}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(row.total)}</TableCell>
                              </TableRow>
                            ))}
                            {(!rentalRevenueData?.byUnit || rentalRevenueData.byUnit.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                  {t('reports.noData', 'No data available')}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('reports.revenueByChannel', 'Revenue by Channel')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(rentalRevenueData?.byChannel || []).map((channel) => (
                            <div key={channel.channel} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-violet-500" />
                                <span className="capitalize">{channel.channel}</span>
                              </div>
                              <span className="font-bold">{formatCurrency(channel.revenue)}</span>
                            </div>
                          ))}
                          {(!rentalRevenueData?.byChannel || rentalRevenueData.byChannel.length === 0) && (
                            <p className="text-center text-muted-foreground py-8">
                              {t('reports.noData', 'No data available')}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
