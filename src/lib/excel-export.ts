/**
 * Excel Export Utility
 * Uses xlsx (SheetJS) library for generating Excel files
 */

import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface ExcelExportOptions {
  filename: string;
  sheetName: string;
  title?: string;
  subtitle?: string;
  filters?: Record<string, string>;
  headers: string[];
  data: (string | number | null | undefined)[][];
  summaryRows?: (string | number | null | undefined)[][];
  columnWidths?: number[];
}

/**
 * Export data to Excel file with formatting
 */
export function exportToExcel(options: ExcelExportOptions): void {
  const {
    filename,
    sheetName,
    title,
    subtitle,
    filters,
    headers,
    data,
    summaryRows,
    columnWidths,
  } = options;

  // Build worksheet data array
  const wsData: (string | number | null | undefined)[][] = [];

  // Add title row
  if (title) {
    wsData.push([title]);
    if (subtitle) {
      wsData.push([subtitle]);
    }
    wsData.push([]); // Empty row
  }

  // Add filter criteria rows
  if (filters && Object.keys(filters).length > 0) {
    wsData.push(['Filter Criteria:']);
    Object.entries(filters).forEach(([key, value]) => {
      wsData.push([`  ${key}:`, value]);
    });
    wsData.push([]); // Empty row
  }

  // Add headers
  wsData.push(headers);

  // Add data rows
  data.forEach(row => wsData.push(row));

  // Add summary rows if provided
  if (summaryRows && summaryRows.length > 0) {
    wsData.push([]); // Empty row before summary
    summaryRows.forEach(row => wsData.push(row));
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  if (columnWidths && columnWidths.length > 0) {
    ws['!cols'] = columnWidths.map(w => ({ wch: w }));
  } else {
    // Auto-calculate column widths based on content
    const colWidths = headers.map((header, colIndex) => {
      let maxWidth = header.length;
      data.forEach(row => {
        const cellValue = row[colIndex];
        const cellLength = cellValue != null ? String(cellValue).length : 0;
        if (cellLength > maxWidth) {
          maxWidth = cellLength;
        }
      });
      return Math.min(Math.max(maxWidth + 2, 10), 50); // Min 10, max 50
    });
    ws['!cols'] = colWidths.map(w => ({ wch: w }));
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Excel sheet name max 31 chars

  // Generate filename with date
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Download file
  XLSX.writeFile(wb, `${safeFilename}_${dateStr}.xlsx`);
}

/**
 * Format currency value for Excel
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Format date for Excel
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  try {
    return format(new Date(date), 'MMM dd, yyyy');
  } catch {
    return date;
  }
}

/**
 * Export Current Balance Report to Excel
 */
export function exportCurrentBalanceToExcel(
  data: {
    guest_name: string;
    guest_email: string | null;
    total_invoiced: number;
    total_paid: number;
    balance_due: number;
  }[],
  filters: Record<string, string>
): void {
  const totalInvoiced = data.reduce((sum, d) => sum + d.total_invoiced, 0);
  const totalPaid = data.reduce((sum, d) => sum + d.total_paid, 0);
  const totalBalance = data.reduce((sum, d) => sum + d.balance_due, 0);

  exportToExcel({
    filename: 'Current_Balance_Report',
    sheetName: 'Current Balance',
    title: 'Current Balance Report',
    subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
    filters,
    headers: ['Guest Name', 'Email', 'Total Invoiced', 'Total Paid', 'Balance Due'],
    data: data.map(d => [
      d.guest_name,
      d.guest_email || '',
      formatCurrency(d.total_invoiced),
      formatCurrency(d.total_paid),
      formatCurrency(d.balance_due),
    ]),
    summaryRows: [
      ['TOTALS', '', formatCurrency(totalInvoiced), formatCurrency(totalPaid), formatCurrency(totalBalance)],
    ],
    columnWidths: [25, 30, 15, 15, 15],
  });
}

/**
 * Export Financial Entries Report to Excel
 */
export function exportFinancialEntriesToExcel(
  data: {
    date: string;
    property_name: string;
    entry_type: string;
    description: string;
    amount: number;
    running_balance: number;
  }[],
  filters: Record<string, string>
): void {
  const totalDebits = data.filter(d => d.entry_type === 'debit').reduce((sum, d) => sum + d.amount, 0);
  const totalCredits = data.filter(d => d.entry_type === 'credit').reduce((sum, d) => sum + d.amount, 0);

  exportToExcel({
    filename: 'Financial_Entries_Report',
    sheetName: 'Financial Entries',
    title: 'Financial Entries Report',
    subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
    filters,
    headers: ['Date', 'Property', 'Type', 'Description', 'Amount', 'Running Balance'],
    data: data.map(d => [
      formatDate(d.date),
      d.property_name,
      d.entry_type.charAt(0).toUpperCase() + d.entry_type.slice(1),
      d.description,
      formatCurrency(d.amount),
      formatCurrency(d.running_balance),
    ]),
    summaryRows: [
      ['Total Debits:', '', '', '', formatCurrency(totalDebits), ''],
      ['Total Credits:', '', '', '', formatCurrency(totalCredits), ''],
      ['Net:', '', '', '', formatCurrency(totalCredits - totalDebits), ''],
    ],
    columnWidths: [15, 25, 15, 35, 15, 15],
  });
}

/**
 * Export Active Clients Report to Excel
 */
export function exportActiveClientsToExcel(
  data: {
    guest_name: string;
    guest_email: string | null;
    guest_phone: string | null;
    last_booking: string | null;
    total_bookings: number;
    total_spent: number;
  }[],
  filters: Record<string, string>
): void {
  const totalBookings = data.reduce((sum, d) => sum + d.total_bookings, 0);
  const totalSpent = data.reduce((sum, d) => sum + d.total_spent, 0);

  exportToExcel({
    filename: 'Active_Clients_Report',
    sheetName: 'Active Clients',
    title: 'Active Clients Report',
    subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
    filters,
    headers: ['Guest Name', 'Email', 'Phone', 'Last Booking', 'Total Bookings', 'Total Spent'],
    data: data.map(d => [
      d.guest_name,
      d.guest_email || '',
      d.guest_phone || '',
      formatDate(d.last_booking),
      d.total_bookings,
      formatCurrency(d.total_spent),
    ]),
    summaryRows: [
      ['TOTALS', '', '', '', totalBookings, formatCurrency(totalSpent)],
      [`Total Clients: ${data.length}`],
    ],
    columnWidths: [25, 30, 18, 15, 15, 15],
  });
}

/**
 * Export Inactive Clients Report to Excel
 */
export function exportInactiveClientsToExcel(
  data: {
    guest_name: string;
    guest_email: string | null;
    guest_phone: string | null;
    last_booking_date: string | null;
    days_since_last_booking: number;
  }[],
  filters: Record<string, string>
): void {
  exportToExcel({
    filename: 'Inactive_Clients_Report',
    sheetName: 'Inactive Clients',
    title: 'Inactive Clients Report',
    subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
    filters,
    headers: ['Guest Name', 'Email', 'Phone', 'Last Booking Date', 'Days Since Last Booking'],
    data: data.map(d => [
      d.guest_name,
      d.guest_email || '',
      d.guest_phone || '',
      formatDate(d.last_booking_date),
      d.days_since_last_booking,
    ]),
    summaryRows: [
      [`Total Inactive Clients: ${data.length}`],
    ],
    columnWidths: [25, 30, 18, 18, 20],
  });
}

/**
 * Export Enhanced Bookings Report to Excel
 */
export function exportEnhancedBookingsToExcel(
  data: {
    booking_id: string;
    guest_name: string;
    property_name: string;
    check_in_date: string;
    check_out_date: string;
    booking_status: string;
    total_price: number;
    invoice_number?: string | null;
    invoice_paid?: number;
    invoice_balance?: number;
    tax_amount?: number;
  }[],
  filters: Record<string, string>,
  showFinancial: boolean,
  showTax: boolean
): void {
  const headers = ['Booking ID', 'Guest', 'Property', 'Check-In', 'Check-Out', 'Status', 'Amount'];
  if (showFinancial) {
    headers.push('Invoice #', 'Paid', 'Balance');
  }
  if (showTax) {
    headers.push('Tax Amount');
  }

  const totalAmount = data.reduce((sum, d) => sum + (d.total_price || 0), 0);
  const totalPaid = showFinancial ? data.reduce((sum, d) => sum + (d.invoice_paid || 0), 0) : 0;
  const totalBalance = showFinancial ? data.reduce((sum, d) => sum + (d.invoice_balance || 0), 0) : 0;
  const totalTax = showTax ? data.reduce((sum, d) => sum + (d.tax_amount || 0), 0) : 0;

  exportToExcel({
    filename: 'Bookings_Report',
    sheetName: 'Bookings',
    title: 'Bookings Report',
    subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
    filters,
    headers,
    data: data.map(d => {
      const row: (string | number | null | undefined)[] = [
        d.booking_id.substring(0, 8) + '...',
        d.guest_name,
        d.property_name,
        formatDate(d.check_in_date),
        formatDate(d.check_out_date),
        d.booking_status,
        formatCurrency(d.total_price),
      ];
      if (showFinancial) {
        row.push(d.invoice_number || 'N/A', formatCurrency(d.invoice_paid), formatCurrency(d.invoice_balance));
      }
      if (showTax) {
        row.push(formatCurrency(d.tax_amount));
      }
      return row;
    }),
    summaryRows: [
      [
        'TOTALS',
        '',
        '',
        '',
        '',
        `${data.length} bookings`,
        formatCurrency(totalAmount),
        ...(showFinancial ? ['', formatCurrency(totalPaid), formatCurrency(totalBalance)] : []),
        ...(showTax ? [formatCurrency(totalTax)] : []),
      ],
    ],
  });
}

/**
 * Export Rental Revenue Report to Excel
 */
export function exportRentalRevenueToExcel(
  data: {
    byProperty: {
      property_name: string;
      base_amount: number;
      extras: number;
      cleaning: number;
      deposits: number;
      total: number;
    }[];
    byChannel: {
      channel: string;
      revenue: number;
    }[];
    invoiceRevenue: number;
    totalBookingRevenue: number;
  },
  filters: Record<string, string>
): void {
  // Build multi-section data
  const wsData: (string | number | null | undefined)[][] = [];

  // Title
  wsData.push(['Rental Revenue Report']);
  wsData.push([`Generated on ${format(new Date(), 'MMMM dd, yyyy')}`]);
  wsData.push([]);

  // Filters
  if (Object.keys(filters).length > 0) {
    wsData.push(['Filter Criteria:']);
    Object.entries(filters).forEach(([key, value]) => {
      wsData.push([`  ${key}:`, value]);
    });
    wsData.push([]);
  }

  // Revenue by Property Section
  wsData.push(['REVENUE BY PROPERTY']);
  wsData.push(['Property', 'Base Amount', 'Extras', 'Cleaning', 'Deposits', 'Total']);
  data.byProperty.forEach(p => {
    wsData.push([
      p.property_name,
      formatCurrency(p.base_amount),
      formatCurrency(p.extras),
      formatCurrency(p.cleaning),
      formatCurrency(p.deposits),
      formatCurrency(p.total),
    ]);
  });
  wsData.push([]);

  // Revenue by Channel Section
  wsData.push(['REVENUE BY CHANNEL']);
  wsData.push(['Channel', 'Revenue']);
  data.byChannel.forEach(c => {
    wsData.push([c.channel.charAt(0).toUpperCase() + c.channel.slice(1), formatCurrency(c.revenue)]);
  });
  wsData.push([]);

  // Summary Section
  wsData.push(['SUMMARY']);
  wsData.push(['Total Booking Revenue:', formatCurrency(data.totalBookingRevenue)]);
  wsData.push(['Total Invoice Revenue:', formatCurrency(data.invoiceRevenue)]);
  wsData.push(['Grand Total:', formatCurrency(data.totalBookingRevenue + data.invoiceRevenue)]);

  // Create worksheet directly
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  // Create workbook and download
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rental Revenue');

  const dateStr = format(new Date(), 'yyyy-MM-dd');
  XLSX.writeFile(wb, `Rental_Revenue_Report_${dateStr}.xlsx`);
}
