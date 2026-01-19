import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, InvoiceLineItem, AccessAuthorization } from './schemas';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { getLogoForPDF, BRANDING, PDF_COLORS } from './logo-utils';

// Helper to add logo to PDF document
async function addLogoToPDF(
  doc: jsPDF,
  x: number,
  y: number,
  width: number = 55,
  height: number = 18
): Promise<boolean> {
  try {
    const logoBase64 = await getLogoForPDF('black'); // Black logo for light PDF backgrounds
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', x, y, width, height);
      return true;
    }
  } catch (error) {
    console.warn('Failed to add logo to PDF:', error);
  }
  return false;
}

// Fallback text-based logo
function addFallbackLogo(doc: jsPDF, x: number, y: number, primaryColor: [number, number, number]): void {
  doc.setFillColor(...primaryColor);
  doc.rect(x, y, 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(BRANDING.SHORT_NAME, x + 5, y + 7);

  doc.setTextColor(...PDF_COLORS.TEXT);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(BRANDING.COMPANY_NAME, x + 45, y + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.TEXT_LIGHT);
  doc.text(BRANDING.TAGLINE, x + 45, y + 12);
}

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
export async function generateInvoicePDF(invoice: InvoiceWithDetails) {
  const doc = new jsPDF();

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors - Violet & Lime Green Theme
  const primaryColor: [number, number, number] = PDF_COLORS.PRIMARY;
  const accentColor: [number, number, number] = PDF_COLORS.ACCENT;
  const textColor: [number, number, number] = PDF_COLORS.TEXT;
  const lightGray: [number, number, number] = PDF_COLORS.BACKGROUND_LIGHT;

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
  // Try to add logo image, fallback to text
  const logoAdded = await addLogoToPDF(doc, margin, yPos, 55, 18);
  if (!logoAdded) {
    addFallbackLogo(doc, margin, yPos, primaryColor);
  }

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

  // ===== LINE ITEMS TABLE (Grouped by Type) =====
  const lineItems = invoice.line_items || [];

  // Type display names mapping
  const typeLabels: Record<string, string> = {
    accommodation: 'Accommodation',
    cleaning: 'Cleaning Fee',
    extras: 'Additional Services',
    tax: 'Taxes',
    other: 'Other Charges',
  };

  // Define display order for types
  const typeOrder = ['accommodation', 'cleaning', 'extras', 'other', 'tax'];

  // Group items by type and calculate totals
  const groupedItems: Record<string, { total: number; taxTotal: number }> = {};

  lineItems.forEach((item) => {
    const itemType = item.item_type || 'other';
    const qty = item.quantity || 1;
    const price = item.unit_price || 0;
    const amount = qty * price;
    const taxAmount = item.tax_amount || 0;

    if (!groupedItems[itemType]) {
      groupedItems[itemType] = { total: 0, taxTotal: 0 };
    }
    groupedItems[itemType].total += amount;
    groupedItems[itemType].taxTotal += taxAmount;
  });

  // Build table data from grouped items
  const tableData: string[][] = [];

  // Add items in defined order
  typeOrder.forEach((itemType) => {
    if (groupedItems[itemType] && groupedItems[itemType].total > 0) {
      const group = groupedItems[itemType];
      const label = typeLabels[itemType] || itemType;
      tableData.push([label, formatCurrency(group.total)]);

      // Add tax row if present
      if (group.taxTotal > 0) {
        tableData.push(['  Tax', formatCurrency(group.taxTotal)]);
      }
    }
  });

  // Add any types not in predefined order
  Object.keys(groupedItems).forEach((itemType) => {
    if (!typeOrder.includes(itemType) && groupedItems[itemType].total > 0) {
      const group = groupedItems[itemType];
      const label = typeLabels[itemType] || itemType;
      tableData.push([label, formatCurrency(group.total)]);

      if (group.taxTotal > 0) {
        tableData.push(['  Tax', formatCurrency(group.taxTotal)]);
      }
    }
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
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
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
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
export async function generateOwnerStatementPDF(statement: OwnerStatementData) {
  const doc = new jsPDF();

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors - Violet & Lime Green Theme
  const primaryColor: [number, number, number] = PDF_COLORS.PRIMARY;
  const textColor: [number, number, number] = PDF_COLORS.TEXT;
  const lightGray: [number, number, number] = PDF_COLORS.BACKGROUND_LIGHT;
  const greenColor: [number, number, number] = PDF_COLORS.ACCENT;
  const redColor: [number, number, number] = PDF_COLORS.PRIMARY;

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
  // Try to add logo image, fallback to text
  const logoAdded = await addLogoToPDF(doc, margin, yPos, 55, 18);
  if (!logoAdded) {
    addFallbackLogo(doc, margin, yPos, primaryColor);
  }

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
  const primaryColor: [number, number, number] = PDF_COLORS.PRIMARY;
  const textColor: [number, number, number] = PDF_COLORS.TEXT;
  const lightGray: [number, number, number] = PDF_COLORS.BACKGROUND_LIGHT;
  const statusColors: Record<string, [number, number, number]> = {
    requested: PDF_COLORS.PRIMARY,
    approved: PDF_COLORS.ACCENT,
    in_progress: [124, 58, 237], // Violet-600
    completed: PDF_COLORS.MUTED,
    cancelled: PDF_COLORS.ERROR,
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
  // Try to add logo image, fallback to text
  const logoAdded = await addLogoToPDF(doc, margin, yPos, 55, 18);
  if (!logoAdded) {
    addFallbackLogo(doc, margin, yPos, primaryColor);
  }

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

// ===== REPORT PDF GENERATION FUNCTIONS =====

/**
 * Generic Report PDF Options
 */
export interface ReportPDFOptions {
  title: string;
  subtitle?: string;
  dateRange?: { from: string; to: string };
  filters?: Record<string, string>;
  headers: string[];
  data: (string | number | null | undefined)[][];
  summaryRows?: { label: string; value: string | number }[];
  columnWidths?: number[];
}

/**
 * Generate a generic report PDF
 */
export async function generateReportPDF(options: ReportPDFOptions): Promise<void> {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  const primaryColor: [number, number, number] = PDF_COLORS.PRIMARY;
  const textColor: [number, number, number] = PDF_COLORS.TEXT;
  const lightGray: [number, number, number] = PDF_COLORS.BACKGROUND_LIGHT;

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // ===== HEADER =====
  const logoAdded = await addLogoToPDF(doc, margin, yPos, 55, 18);
  if (!logoAdded) {
    addFallbackLogo(doc, margin, yPos, primaryColor);
  }

  yPos += 25;

  // ===== REPORT TITLE =====
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(options.title.toUpperCase(), margin, yPos);

  yPos += 8;

  // Subtitle and date range
  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.TEXT_LIGHT);
    doc.text(options.subtitle, margin, yPos);
    yPos += 5;
  }

  if (options.dateRange) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.TEXT_LIGHT);
    doc.text(`Period: ${options.dateRange.from} to ${options.dateRange.to}`, margin, yPos);
    yPos += 5;
  }

  yPos += 5;

  // ===== FILTERS SECTION =====
  if (options.filters && Object.keys(options.filters).length > 0) {
    const filterCount = Object.keys(options.filters).length;
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPos, pageWidth - 2 * margin, filterCount * 5 + 8, 'F');

    doc.setFontSize(8);
    doc.setTextColor(...textColor);
    yPos += 5;

    Object.entries(options.filters).forEach(([key, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${key}:`, margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), margin + 45, yPos);
      yPos += 5;
    });

    yPos += 5;
  }

  // ===== DATA TABLE =====
  autoTable(doc, {
    startY: yPos,
    head: [options.headers],
    body: options.data.map(row => row.map(cell => cell ?? '')),
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
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: options.columnWidths
      ? Object.fromEntries(options.columnWidths.map((w, i) => [i, { cellWidth: w }]))
      : {},
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Footer on each page
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ===== SUMMARY SECTION =====
  if (options.summaryRows && options.summaryRows.length > 0) {
    // Check if we need a new page
    if (yPos + 50 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }

    const summaryX = pageWidth - margin - 80;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Summary', summaryX, yPos);
    yPos += 8;

    options.summaryRows.forEach(item => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(item.label, summaryX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.value), pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
    });
  }

  // ===== FOOTER =====
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(BRANDING.COMPANY_NAME, pageWidth / 2, footerY + 5, { align: 'center' });

  // ===== SAVE =====
  const safeFilename = options.title.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${safeFilename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

/**
 * Generate Current Balance Report PDF
 */
export async function generateCurrentBalancePDF(
  data: {
    guest_name: string;
    guest_email: string | null;
    total_invoiced: number;
    total_paid: number;
    balance_due: number;
  }[],
  filters: Record<string, string>
): Promise<void> {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const totalInvoiced = data.reduce((sum, d) => sum + d.total_invoiced, 0);
  const totalPaid = data.reduce((sum, d) => sum + d.total_paid, 0);
  const totalBalance = data.reduce((sum, d) => sum + d.balance_due, 0);

  await generateReportPDF({
    title: 'Current Balance Report',
    subtitle: `${data.length} clients with outstanding balances`,
    filters,
    headers: ['Guest Name', 'Email', 'Total Invoiced', 'Total Paid', 'Balance Due'],
    data: data.map(d => [
      d.guest_name,
      d.guest_email || '-',
      formatCurrency(d.total_invoiced),
      formatCurrency(d.total_paid),
      formatCurrency(d.balance_due),
    ]),
    summaryRows: [
      { label: 'Total Invoiced:', value: formatCurrency(totalInvoiced) },
      { label: 'Total Paid:', value: formatCurrency(totalPaid) },
      { label: 'Total Balance Due:', value: formatCurrency(totalBalance) },
    ],
  });
}

/**
 * Generate Financial Entries Report PDF
 */
export async function generateFinancialEntriesPDF(
  data: {
    date: string;
    property_name: string;
    entry_type: string;
    description: string;
    amount: number;
    running_balance: number;
  }[],
  filters: Record<string, string>
): Promise<void> {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const totalDebits = data.filter(d => d.entry_type === 'debit').reduce((sum, d) => sum + d.amount, 0);
  const totalCredits = data.filter(d => d.entry_type === 'credit').reduce((sum, d) => sum + d.amount, 0);
  const finalBalance = data.length > 0 ? data[data.length - 1].running_balance : 0;

  await generateReportPDF({
    title: 'Financial Entries Report',
    subtitle: `${data.length} entries`,
    filters,
    headers: ['Date', 'Property', 'Type', 'Description', 'Amount', 'Balance'],
    data: data.map(d => [
      formatDate(d.date),
      d.property_name,
      d.entry_type.charAt(0).toUpperCase() + d.entry_type.slice(1).replace('_', ' '),
      d.description.length > 40 ? d.description.substring(0, 40) + '...' : d.description,
      formatCurrency(d.amount),
      formatCurrency(d.running_balance),
    ]),
    summaryRows: [
      { label: 'Total Debits:', value: formatCurrency(totalDebits) },
      { label: 'Total Credits:', value: formatCurrency(totalCredits) },
      { label: 'Final Balance:', value: formatCurrency(finalBalance) },
    ],
  });
}

/**
 * Generate Active Clients Report PDF
 */
export async function generateActiveClientsPDF(
  data: {
    guest_name: string;
    guest_email: string | null;
    guest_phone: string | null;
    last_booking: string | null;
    total_bookings: number;
    total_spent: number;
  }[],
  filters: Record<string, string>
): Promise<void> {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const totalBookings = data.reduce((sum, d) => sum + d.total_bookings, 0);
  const totalSpent = data.reduce((sum, d) => sum + d.total_spent, 0);

  await generateReportPDF({
    title: 'Active Clients Report',
    subtitle: `${data.length} active clients`,
    filters,
    headers: ['Guest Name', 'Email', 'Phone', 'Last Booking', 'Bookings', 'Total Spent'],
    data: data.map(d => [
      d.guest_name,
      d.guest_email || '-',
      d.guest_phone || '-',
      formatDate(d.last_booking),
      d.total_bookings,
      formatCurrency(d.total_spent),
    ]),
    summaryRows: [
      { label: 'Total Clients:', value: data.length },
      { label: 'Total Bookings:', value: totalBookings },
      { label: 'Total Revenue:', value: formatCurrency(totalSpent) },
    ],
  });
}

/**
 * Generate Inactive Clients Report PDF
 */
export async function generateInactiveClientsPDF(
  data: {
    guest_name: string;
    guest_email: string | null;
    guest_phone: string | null;
    last_booking_date: string | null;
    days_since_last_booking: number;
  }[],
  filters: Record<string, string>
): Promise<void> {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  await generateReportPDF({
    title: 'Inactive Clients Report',
    subtitle: `${data.length} inactive clients`,
    filters,
    headers: ['Guest Name', 'Email', 'Phone', 'Last Booking', 'Days Inactive'],
    data: data.map(d => [
      d.guest_name,
      d.guest_email || '-',
      d.guest_phone || '-',
      formatDate(d.last_booking_date),
      d.days_since_last_booking,
    ]),
    summaryRows: [
      { label: 'Total Inactive:', value: data.length },
    ],
  });
}

/**
 * Generate Enhanced Bookings Report PDF
 */
export async function generateEnhancedBookingsPDF(
  data: {
    booking_id: string;
    guest_name: string;
    property_name: string;
    check_in_date: string;
    check_out_date: string;
    booking_status: string;
    total_price: number;
    tax_amount?: number;
    invoice_number?: string | null;
    invoice_paid?: number;
    invoice_balance?: number;
  }[],
  filters: Record<string, string>,
  showFinancial: boolean,
  showTax: boolean
): Promise<void> {
  const formatCurrency = (amount: number | undefined) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const headers = ['ID', 'Guest', 'Property', 'Check-In', 'Check-Out', 'Status', 'Amount'];
  if (showFinancial) headers.push('Invoice', 'Paid', 'Balance');
  if (showTax) headers.push('Tax');

  const totalAmount = data.reduce((sum, d) => sum + (d.total_price || 0), 0);
  const totalPaid = showFinancial ? data.reduce((sum, d) => sum + (d.invoice_paid || 0), 0) : 0;
  const totalTax = showTax ? data.reduce((sum, d) => sum + (d.tax_amount || 0), 0) : 0;

  await generateReportPDF({
    title: 'Bookings Report',
    subtitle: `${data.length} bookings`,
    filters,
    headers,
    data: data.map(d => {
      const row: (string | number)[] = [
        d.booking_id.substring(0, 8),
        d.guest_name,
        d.property_name.length > 20 ? d.property_name.substring(0, 20) + '...' : d.property_name,
        formatDate(d.check_in_date),
        formatDate(d.check_out_date),
        d.booking_status,
        formatCurrency(d.total_price),
      ];
      if (showFinancial) {
        row.push(d.invoice_number || '-', formatCurrency(d.invoice_paid), formatCurrency(d.invoice_balance));
      }
      if (showTax) {
        row.push(formatCurrency(d.tax_amount));
      }
      return row;
    }),
    summaryRows: [
      { label: 'Total Bookings:', value: data.length },
      { label: 'Total Amount:', value: formatCurrency(totalAmount) },
      ...(showFinancial ? [{ label: 'Total Paid:', value: formatCurrency(totalPaid) }] : []),
      ...(showTax ? [{ label: 'Total Tax:', value: formatCurrency(totalTax) }] : []),
    ],
  });
}

/**
 * Generate Rental Revenue Report PDF
 */
export async function generateRentalRevenuePDF(
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
): Promise<void> {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  const primaryColor: [number, number, number] = PDF_COLORS.PRIMARY;
  const accentColor: [number, number, number] = PDF_COLORS.ACCENT;
  const textColor: [number, number, number] = PDF_COLORS.TEXT;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  // ===== HEADER =====
  const logoAdded = await addLogoToPDF(doc, margin, yPos, 55, 18);
  if (!logoAdded) {
    addFallbackLogo(doc, margin, yPos, primaryColor);
  }

  yPos += 25;

  // ===== TITLE =====
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('RENTAL REVENUE REPORT', margin, yPos);

  yPos += 15;

  // ===== FILTERS =====
  if (Object.keys(filters).length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.TEXT_LIGHT);
    Object.entries(filters).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, margin, yPos);
      yPos += 5;
    });
    yPos += 5;
  }

  // ===== SUMMARY BOXES =====
  const boxWidth = (pageWidth - 3 * margin) / 2;

  // Booking Revenue Box
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPos, boxWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Booking Revenue', margin + 5, yPos + 8);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.totalBookingRevenue), margin + 5, yPos + 20);

  // Invoice Revenue Box
  doc.setFillColor(...accentColor);
  doc.rect(margin + boxWidth + margin, yPos, boxWidth, 25, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Invoice Revenue', margin + boxWidth + margin + 5, yPos + 8);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.invoiceRevenue), margin + boxWidth + margin + 5, yPos + 20);

  yPos += 35;

  // ===== REVENUE BY PROPERTY =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Revenue by Property', margin, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Property', 'Base', 'Extras', 'Cleaning', 'Deposits', 'Total']],
    body: data.byProperty.map(p => [
      p.property_name.length > 25 ? p.property_name.substring(0, 25) + '...' : p.property_name,
      formatCurrency(p.base_amount),
      formatCurrency(p.extras),
      formatCurrency(p.cleaning),
      formatCurrency(p.deposits),
      formatCurrency(p.total),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      5: { fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ===== REVENUE BY CHANNEL =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Revenue by Channel', margin, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Channel', 'Revenue']],
    body: data.byChannel.map(c => [
      c.channel.charAt(0).toUpperCase() + c.channel.slice(1),
      formatCurrency(c.revenue),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: accentColor,
      textColor: 0,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: textColor,
    },
    columnStyles: {
      1: { fontStyle: 'bold', halign: 'right' },
    },
    margin: { left: margin, right: margin },
    tableWidth: 100,
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ===== GRAND TOTAL =====
  const grandTotal = data.totalBookingRevenue + data.invoiceRevenue;

  doc.setFillColor(245, 243, 255);
  doc.rect(pageWidth - margin - 80, yPos, 80, 20, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Grand Total:', pageWidth - margin - 75, yPos + 8);
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(grandTotal), pageWidth - margin - 5, yPos + 16, { align: 'right' });

  // ===== FOOTER =====
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(BRANDING.COMPANY_NAME, pageWidth / 2, footerY + 5, { align: 'center' });

  // ===== SAVE =====
  doc.save(`Rental_Revenue_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
