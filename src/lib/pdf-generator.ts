import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, InvoiceLineItem, AccessAuthorization } from './schemas';
import { format } from 'date-fns';
import QRCode from 'qrcode';

interface InvoiceWithDetails extends Invoice {
  property?: {
    property_name: string;
    property_id: string;
  };
  line_items?: InvoiceLineItem[];
}

/**
 * Generate and download a PDF invoice
 * @param invoice - Invoice data with property and line items
 */
export function generateInvoicePDF(invoice: InvoiceWithDetails) {
  const doc = new jsPDF();

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors - Violet & Lime Green Theme
  const primaryColor: [number, number, number] = [139, 92, 246]; // Violet (#8b5cf6)
  const accentColor: [number, number, number] = [132, 204, 22]; // Lime (#84cc16)
  const textColor: [number, number, number] = [60, 60, 60];
  const lightGray: [number, number, number] = [245, 243, 255]; // Light violet

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  // ===== HEADER =====
  // Company logo/name
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPos, 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('C&C', margin + 5, yPos + 7);

  doc.setTextColor(...textColor);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Casa & Concierge', margin + 45, yPos + 7);

  // Company tagline
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Property Management Services', margin + 45, yPos + 12);

  yPos += 25;

  // ===== INVOICE TITLE =====
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('INVOICE', margin, yPos);

  // Invoice number on the right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  const invoiceNumText = `Invoice #${invoice.invoice_number || 'DRAFT'}`;
  doc.text(invoiceNumText, pageWidth - margin, yPos, { align: 'right' });

  yPos += 15;

  // ===== INVOICE INFO BOX (LEFT) & BILL TO (RIGHT) =====
  const boxWidth = (pageWidth - 3 * margin) / 2;

  // Left box - Invoice details
  doc.setFillColor(...lightGray);
  doc.rect(margin, yPos, boxWidth, 40, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Invoice Date:', margin + 5, yPos + 8);
  doc.text('Due Date:', margin + 5, yPos + 16);
  doc.text('Property:', margin + 5, yPos + 24);
  doc.text('Status:', margin + 5, yPos + 32);

  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.issue_date), margin + 35, yPos + 8);
  doc.text(formatDate(invoice.due_date), margin + 35, yPos + 16);
  doc.text(invoice.property?.property_name || 'N/A', margin + 35, yPos + 24);

  // Status with color
  const statusText = invoice.status.toUpperCase();
  if (invoice.status === 'paid') {
    doc.setTextColor(0, 128, 0);
  } else if (invoice.status === 'overdue') {
    doc.setTextColor(220, 53, 69);
  } else if (invoice.status === 'cancelled') {
    doc.setTextColor(128, 128, 128);
  } else {
    doc.setTextColor(...textColor);
  }
  doc.text(statusText, margin + 35, yPos + 32);

  // Right box - Bill to
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', pageWidth - margin - boxWidth, yPos + 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.guest_name, pageWidth - margin - boxWidth, yPos + 13);

  if (invoice.guest_email) {
    doc.text(invoice.guest_email, pageWidth - margin - boxWidth, yPos + 19);
  }

  if (invoice.guest_phone) {
    doc.text(invoice.guest_phone, pageWidth - margin - boxWidth, yPos + 25);
  }

  if (invoice.guest_address) {
    const addressLines = doc.splitTextToSize(invoice.guest_address, boxWidth - 10);
    doc.text(addressLines, pageWidth - margin - boxWidth, yPos + 31);
  }

  yPos += 50;

  // ===== LINE ITEMS TABLE =====
  const lineItems = invoice.line_items || [];

  const tableData = lineItems.map((item) => {
    const subtotal = (item.quantity || 0) * (item.unit_price || 0);
    const total = subtotal + (item.tax_amount || 0);

    return [
      item.line_number?.toString() || '',
      item.description || '',
      item.quantity?.toString() || '0',
      formatCurrency(item.unit_price || 0),
      formatCurrency(item.tax_amount || 0),
      formatCurrency(total),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Tax', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  // Get final Y position after table
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ===== TOTALS SECTION =====
  const totalsX = pageWidth - margin - 60;
  const totalsStartY = yPos;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);

  // Subtotal
  doc.text('Subtotal:', totalsX, totalsStartY);
  doc.text(formatCurrency(invoice.subtotal || 0), pageWidth - margin, totalsStartY, { align: 'right' });

  // Tax
  doc.text('Tax:', totalsX, totalsStartY + 6);
  doc.text(formatCurrency(invoice.tax_amount || 0), pageWidth - margin, totalsStartY + 6, { align: 'right' });

  // Line separator
  doc.setLineWidth(0.5);
  doc.setDrawColor(...primaryColor);
  doc.line(totalsX, totalsStartY + 10, pageWidth - margin, totalsStartY + 10);

  // Total
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', totalsX, totalsStartY + 18);
  doc.text(formatCurrency(invoice.total_amount || 0), pageWidth - margin, totalsStartY + 18, { align: 'right' });

  // Amount Paid
  if (invoice.amount_paid && invoice.amount_paid > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...accentColor); // Lime green
    doc.text('Amount Paid:', totalsX, totalsStartY + 25);
    doc.text(formatCurrency(invoice.amount_paid), pageWidth - margin, totalsStartY + 25, { align: 'right' });
  }

  // Balance Due
  const balanceDue = (invoice.total_amount || 0) - (invoice.amount_paid || 0);
  if (balanceDue > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69);
    doc.text('Balance Due:', totalsX, totalsStartY + 33);
    doc.text(formatCurrency(balanceDue), pageWidth - margin, totalsStartY + 33, { align: 'right' });
  }

  yPos = totalsStartY + 45;

  // ===== NOTES & TERMS =====
  if (invoice.notes || invoice.terms) {
    // Check if we need a new page
    if (yPos + 40 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }

    if (invoice.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('Notes:', margin, yPos);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
      doc.text(notesLines, margin, yPos + 6);
      yPos += 6 + (notesLines.length * 4) + 5;
    }

    if (invoice.terms) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('Payment Terms:', margin, yPos);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const termsLines = doc.splitTextToSize(invoice.terms, pageWidth - 2 * margin);
      doc.text(termsLines, margin, yPos + 6);
      yPos += 6 + (termsLines.length * 4) + 5;
    }
  }

  // ===== FOOTER =====
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // ===== SAVE PDF =====
  const fileName = `Invoice_${invoice.invoice_number || 'DRAFT'}_${invoice.guest_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

/**
 * Generate PDF and return as Blob (for email attachments, etc.)
 */
export function generateInvoicePDFBlob(invoice: InvoiceWithDetails): Blob {
  const doc = new jsPDF();

  // ... (same PDF generation code as above, but instead of save():
  // This is a simplified version - you would copy the same logic as above

  return doc.output('blob');
}

/**
 * Owner Statement data interface
 */
export interface OwnerStatementData {
  property_id: string;
  property_name: string;
  period_start: string;
  period_end: string;
  revenue: {
    total: number;
    by_invoice: Array<{
      invoice_number: string;
      guest_name: string;
      issue_date: string;
      amount: number;
    }>;
  };
  expenses: {
    total: number;
    by_category: Array<{
      category: string;
      amount: number;
      count: number;
    }>;
    by_expense: Array<{
      date: string;
      vendor: string;
      category: string;
      description: string;
      amount: number;
    }>;
  };
  net_income: number;
}

/**
 * Generate and download an Owner Statement PDF
 * @param statement - Owner statement data with revenue and expenses
 */
export function generateOwnerStatementPDF(statement: OwnerStatementData) {
  const doc = new jsPDF();

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors - Violet & Lime Green Theme
  const primaryColor: [number, number, number] = [139, 92, 246]; // Violet (#8b5cf6)
  const textColor: [number, number, number] = [60, 60, 60];
  const lightGray: [number, number, number] = [245, 243, 255]; // Light violet
  const greenColor: [number, number, number] = [132, 204, 22]; // Lime (#84cc16)
  const redColor: [number, number, number] = [139, 92, 246]; // Violet for expenses

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  // ===== HEADER =====
  // Company logo/name
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPos, 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('C&C', margin + 5, yPos + 7);

  doc.setTextColor(...textColor);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Casa & Concierge', margin + 45, yPos + 7);

  // Company tagline
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Property Management Services', margin + 45, yPos + 12);

  yPos += 25;

  // ===== DOCUMENT TITLE =====
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('OWNER STATEMENT', margin, yPos);

  // Generated date on the right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy')}`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 15;

  // ===== PROPERTY & PERIOD INFO BOX =====
  doc.setFillColor(...lightGray);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 25, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Property:', margin + 5, yPos + 8);
  doc.text('Period:', margin + 5, yPos + 16);

  doc.setFont('helvetica', 'normal');
  doc.text(statement.property_name, margin + 30, yPos + 8);
  doc.text(
    `${formatDate(statement.period_start)} - ${formatDate(statement.period_end)}`,
    margin + 30,
    yPos + 16
  );

  yPos += 35;

  // ===== SUMMARY BOXES - Violet & Lime Green Theme =====
  const boxWidth = (pageWidth - 4 * margin) / 3;

  // Revenue box - Lime green theme
  doc.setFillColor(236, 252, 203); // Light lime (#ecfccb)
  doc.rect(margin, yPos, boxWidth, 25, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(63, 98, 18); // Lime-900
  doc.text('Total Revenue', margin + boxWidth / 2, yPos + 8, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...greenColor);
  doc.text(formatCurrency(statement.revenue.total), margin + boxWidth / 2, yPos + 18, { align: 'center' });

  // Expenses box - Violet theme
  doc.setFillColor(245, 243, 255); // Light violet (#f5f3ff)
  doc.rect(margin + boxWidth + 5, yPos, boxWidth, 25, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(91, 33, 182); // Violet-800
  doc.text('Total Expenses', margin + boxWidth + 5 + boxWidth / 2, yPos + 8, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 92, 246); // Violet
  doc.text(formatCurrency(statement.expenses.total), margin + boxWidth + 5 + boxWidth / 2, yPos + 18, { align: 'center' });

  // Net Income box
  const isProfit = statement.net_income >= 0;
  doc.setFillColor(...(isProfit ? [236, 252, 203] : [254, 226, 226])); // Light lime or light red
  doc.rect(margin + 2 * (boxWidth + 5), yPos, boxWidth, 25, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...(isProfit ? [63, 98, 18] : [153, 27, 27])); // Lime-900 or Red-800
  doc.text('Net Income', margin + 2 * (boxWidth + 5) + boxWidth / 2, yPos + 8, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(isProfit ? [132, 204, 22] : [220, 53, 69])); // Lime or Red
  doc.text(
    `${isProfit ? '+' : ''}${formatCurrency(statement.net_income)}`,
    margin + 2 * (boxWidth + 5) + boxWidth / 2,
    yPos + 18,
    { align: 'center' }
  );

  yPos += 35;

  // ===== REVENUE DETAILS TABLE =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Revenue Details', margin, yPos);
  yPos += 8;

  if (statement.revenue.by_invoice.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('No revenue in this period', margin, yPos);
    yPos += 15;
  } else {
    const revenueTableData = statement.revenue.by_invoice.map((invoice) => [
      invoice.invoice_number,
      invoice.guest_name,
      formatDate(invoice.issue_date),
      formatCurrency(invoice.amount),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Invoice #', 'Guest', 'Date', 'Amount']],
      body: revenueTableData,
      foot: [['', '', 'Total Revenue', formatCurrency(statement.revenue.total)]],
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: textColor,
      },
      footStyles: {
        fillColor: [236, 252, 203], // Light lime
        textColor: greenColor, // Lime
        fontSize: 9,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35 },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // Check if we need a new page
  if (yPos + 50 > pageHeight - margin) {
    doc.addPage();
    yPos = margin;
  }

  // ===== EXPENSES BY CATEGORY TABLE =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Expenses by Category', margin, yPos);
  yPos += 8;

  if (statement.expenses.by_category.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('No expenses in this period', margin, yPos);
    yPos += 15;
  } else {
    const categoryTableData = statement.expenses.by_category.map((cat) => [
      cat.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      cat.count.toString(),
      formatCurrency(cat.amount),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Count', 'Amount']],
      body: categoryTableData,
      foot: [['Total Expenses', '', formatCurrency(statement.expenses.total)]],
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: textColor,
      },
      footStyles: {
        fillColor: [245, 243, 255], // Light violet
        textColor: [139, 92, 246], // Violet
        fontSize: 9,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // Check if we need a new page for expense details
  if (yPos + 50 > pageHeight - margin) {
    doc.addPage();
    yPos = margin;
  }

  // ===== EXPENSE DETAILS TABLE =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Expense Details', margin, yPos);
  yPos += 8;

  if (statement.expenses.by_expense.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('No expenses in this period', margin, yPos);
    yPos += 15;
  } else {
    const expenseTableData = statement.expenses.by_expense.map((exp) => [
      formatDate(exp.date),
      exp.vendor,
      exp.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      exp.description.length > 30 ? exp.description.substring(0, 30) + '...' : exp.description,
      formatCurrency(exp.amount),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Vendor', 'Category', 'Description', 'Amount']],
      body: expenseTableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: textColor,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 28 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // ===== SUMMARY FOOTER =====
  // Check if we need a new page
  if (yPos + 35 > pageHeight - margin) {
    doc.addPage();
    yPos = margin;
  }

  const summaryX = pageWidth - margin - 70;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text('Total Revenue:', summaryX, yPos);
  doc.setTextColor(...greenColor);
  doc.text(formatCurrency(statement.revenue.total), pageWidth - margin, yPos, { align: 'right' });

  yPos += 7;
  doc.setTextColor(...textColor);
  doc.text('Total Expenses:', summaryX, yPos);
  doc.setTextColor(...redColor);
  doc.text(`-${formatCurrency(statement.expenses.total)}`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 3;
  doc.setLineWidth(0.5);
  doc.setDrawColor(...primaryColor);
  doc.line(summaryX, yPos, pageWidth - margin, yPos);

  yPos += 7;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Net Income:', summaryX, yPos);
  doc.setTextColor(...(isProfit ? [0, 128, 0] : [220, 53, 69]));
  doc.text(
    `${isProfit ? '+' : ''}${formatCurrency(statement.net_income)}`,
    pageWidth - margin,
    yPos,
    { align: 'right' }
  );

  // ===== FOOTER =====
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('This statement is for informational purposes only.', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // ===== SAVE PDF =====
  const fileName = `Owner_Statement_${statement.property_name.replace(/\s+/g, '_')}_${formatDate(statement.period_start)}_to_${formatDate(statement.period_end)}.pdf`;
  doc.save(fileName);
}

/**
 * Access Authorization data interface with full details
 */
export interface AccessAuthorizationData extends AccessAuthorization {
  vendor?: {
    provider_id: string;
    provider_name: string;
    contact_person?: string;
    phone_primary?: string;
    email?: string;
  };
  property?: {
    property_id: string;
    property_name?: string;
    property_type?: string;
  };
  unit?: {
    unit_id: string;
    property_name?: string;
  };
}

/**
 * Generate and download an Access Authorization PDF with QR code
 * @param authorization - Access authorization data with vendor and property info
 */
export async function generateAccessAuthorizationPDF(authorization: AccessAuthorizationData) {
  const doc = new jsPDF();

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors - Violet & Lime Green Theme
  const primaryColor: [number, number, number] = [139, 92, 246]; // Violet (#8b5cf6)
  const textColor: [number, number, number] = [60, 60, 60];
  const lightGray: [number, number, number] = [245, 243, 255]; // Light violet
  const statusColors: Record<string, [number, number, number]> = {
    requested: [139, 92, 246], // Violet
    approved: [132, 204, 22], // Lime
    in_progress: [124, 58, 237], // Violet-600
    completed: [107, 114, 128],
    cancelled: [239, 68, 68],
    expired: [156, 163, 175],
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  // Helper to format time
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  // ===== HEADER =====
  // Company logo/name
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPos, 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('C&C', margin + 5, yPos + 7);

  doc.setTextColor(...textColor);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Casa & Concierge', margin + 45, yPos + 7);

  // Company tagline
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Property Management Services', margin + 45, yPos + 12);

  yPos += 25;

  // ===== DOCUMENT TITLE =====
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('ACCESS AUTHORIZATION', margin, yPos);

  // Authorization ID on the right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  const authIdText = `Auth #${authorization.access_auth_id?.substring(0, 8).toUpperCase()}`;
  doc.text(authIdText, pageWidth - margin, yPos, { align: 'right' });

  yPos += 15;

  // ===== STATUS BADGE =====
  const status = authorization.status || 'requested';
  const statusColor = statusColors[status] || statusColors.requested;
  const statusText = status.toUpperCase().replace('_', ' ');

  doc.setFillColor(...statusColor);
  doc.roundedRect(margin, yPos, 35, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, margin + 17.5, yPos + 5.5, { align: 'center' });

  yPos += 15;

  // ===== MAIN INFO BOX =====
  const boxWidth = (pageWidth - 3 * margin) / 2;

  // Left box - Vendor & Property Info
  doc.setFillColor(...lightGray);
  doc.rect(margin, yPos, boxWidth, 55, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Vendor:', margin + 5, yPos + 8);
  doc.text('Property:', margin + 5, yPos + 16);
  doc.text('Unit:', margin + 5, yPos + 24);
  doc.text('Access Date:', margin + 5, yPos + 32);
  doc.text('Time Window:', margin + 5, yPos + 40);

  doc.setFont('helvetica', 'normal');
  doc.text(authorization.vendor?.provider_name || 'N/A', margin + 35, yPos + 8);
  doc.text(
    authorization.property?.property_name || authorization.property?.property_type || 'N/A',
    margin + 35,
    yPos + 16
  );
  doc.text(authorization.unit?.property_name || 'All Areas', margin + 35, yPos + 24);
  doc.text(formatDate(authorization.access_date), margin + 35, yPos + 32);

  const timeWindow =
    authorization.access_time_start && authorization.access_time_end
      ? `${formatTime(authorization.access_time_start)} - ${formatTime(authorization.access_time_end)}`
      : 'All Day';
  doc.text(timeWindow, margin + 35, yPos + 40);

  // Contact info
  if (authorization.vendor_contact_name || authorization.vendor_contact_phone) {
    doc.setFont('helvetica', 'bold');
    doc.text('Contact:', margin + 5, yPos + 48);
    doc.setFont('helvetica', 'normal');
    const contactText = [
      authorization.vendor_contact_name,
      authorization.vendor_contact_phone,
    ]
      .filter(Boolean)
      .join(', ');
    doc.text(contactText || 'N/A', margin + 35, yPos + 48);
  }

  // Right box - QR Code
  // Generate QR code data
  const qrData = JSON.stringify({
    auth_id: authorization.access_auth_id,
    vendor: authorization.vendor?.provider_name,
    property: authorization.property?.property_name || authorization.property?.property_type,
    date: authorization.access_date,
    status: authorization.status,
  });

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Add QR code to PDF
    const qrSize = 50;
    const qrX = pageWidth - margin - boxWidth + (boxWidth - qrSize) / 2;
    const qrY = yPos + 2.5;

    doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // QR code label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Scan to verify', pageWidth - margin - boxWidth / 2, yPos + 54, { align: 'center' });
  } catch (error) {
    console.error('Error generating QR code:', error);
  }

  yPos += 65;

  // ===== ACCESS DETAILS SECTION =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Access Details', margin, yPos);
  yPos += 8;

  // Access details table
  const accessDetails: Array<[string, string]> = [];

  if (authorization.authorized_areas && authorization.authorized_areas.length > 0) {
    accessDetails.push(['Authorized Areas', authorization.authorized_areas.join(', ')]);
  }

  if (authorization.number_of_personnel) {
    accessDetails.push(['Personnel Count', authorization.number_of_personnel.toString()]);
  }

  if (authorization.vehicle_info) {
    accessDetails.push(['Vehicle Information', authorization.vehicle_info]);
  }

  if (authorization.access_code) {
    accessDetails.push(['Access Code', authorization.access_code]);
  }

  if (authorization.key_pickup_location) {
    accessDetails.push(['Key Pickup', authorization.key_pickup_location]);
  }

  if (authorization.building_contact_name) {
    accessDetails.push(['Building Contact', authorization.building_contact_name]);
  }

  if (accessDetails.length > 0) {
    autoTable(doc, {
      startY: yPos,
      body: accessDetails,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: {
          cellWidth: 45,
          fontStyle: 'bold',
          textColor: textColor,
        },
        1: {
          cellWidth: 'auto',
          textColor: textColor,
        },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    yPos += 5;
  }

  // ===== SPECIAL INSTRUCTIONS =====
  if (authorization.special_instructions) {
    // Check if we need a new page
    if (yPos + 30 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Special Instructions', margin, yPos);
    yPos += 8;

    doc.setFillColor(255, 255, 220); // Light yellow
    doc.rect(margin, yPos, pageWidth - 2 * margin, 0, 'F'); // Will auto-size

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    const instructionLines = doc.splitTextToSize(
      authorization.special_instructions,
      pageWidth - 2 * margin - 10
    );
    doc.text(instructionLines, margin + 5, yPos + 5);

    const instructionHeight = instructionLines.length * 4 + 10;
    doc.setFillColor(255, 255, 220);
    doc.rect(margin, yPos, pageWidth - 2 * margin, instructionHeight, 'F');
    doc.text(instructionLines, margin + 5, yPos + 5);

    yPos += instructionHeight + 10;
  }

  // ===== APPROVAL & COMPLETION TRACKING =====
  if (authorization.approved_at || authorization.actual_arrival_time || authorization.actual_departure_time) {
    // Check if we need a new page
    if (yPos + 30 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Activity Log', margin, yPos);
    yPos += 8;

    const activityData: Array<[string, string]> = [];

    if (authorization.approved_at) {
      activityData.push([
        'Approved',
        format(new Date(authorization.approved_at), 'MMM dd, yyyy HH:mm'),
      ]);
    }

    if (authorization.actual_arrival_time) {
      activityData.push([
        'Vendor Arrived',
        format(new Date(authorization.actual_arrival_time), 'MMM dd, yyyy HH:mm'),
      ]);
    }

    if (authorization.actual_departure_time) {
      activityData.push([
        'Vendor Departed',
        format(new Date(authorization.actual_departure_time), 'MMM dd, yyyy HH:mm'),
      ]);
    }

    if (activityData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        body: activityData,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        columnStyles: {
          0: {
            cellWidth: 40,
            fontStyle: 'bold',
            textColor: textColor,
          },
          1: {
            cellWidth: 'auto',
            textColor: textColor,
          },
        },
        margin: { left: margin, right: margin },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // ===== COMPLETION NOTES =====
  if (authorization.completion_notes) {
    // Check if we need a new page
    if (yPos + 25 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Completion Notes:', margin, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const notesLines = doc.splitTextToSize(authorization.completion_notes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPos + 6);
    yPos += 6 + notesLines.length * 4 + 5;
  }

  // ===== IMPORTANT NOTICE =====
  if (yPos + 35 > pageHeight - 30) {
    doc.addPage();
    yPos = margin;
  } else {
    yPos = pageHeight - 45;
  }

  doc.setFillColor(255, 243, 205); // Light orange
  doc.rect(margin, yPos, pageWidth - 2 * margin, 25, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('IMPORTANT:', margin + 5, yPos + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const noticeText = [
    '• This authorization must be presented upon arrival.',
    '• Valid only for the date and time specified above.',
    '• Vendor must follow all building rules and safety protocols.',
    '• Notify building management immediately if issues arise.',
  ];
  noticeText.forEach((line, index) => {
    doc.text(line, margin + 5, yPos + 13 + index * 4);
  });

  // ===== FOOTER =====
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('This is an official Casa & Concierge access authorization.', pageWidth / 2, footerY, {
    align: 'center',
  });
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, footerY + 5, {
    align: 'center',
  });

  // ===== SAVE PDF =====
  const vendorName = authorization.vendor?.provider_name?.replace(/\s+/g, '_') || 'Vendor';
  const dateStr = authorization.access_date.replace(/-/g, '');
  const fileName = `Access_Authorization_${vendorName}_${dateStr}.pdf`;
  doc.save(fileName);
}
