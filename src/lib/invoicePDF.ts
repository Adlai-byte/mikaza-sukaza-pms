import jsPDF from 'jspdf';
import { Invoice } from './schemas';

export function generateInvoicePDF(invoice: Invoice): string {
  const doc = new jsPDF();

  // Set up colors
  const primaryColor: [number, number, number] = [102, 126, 234]; // #667eea
  const textDark: [number, number, number] = [17, 24, 39]; // #111827
  const textMuted: [number, number, number] = [107, 114, 128]; // #6b7280

  // Header with gradient effect (simplified for PDF)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Casa & Concierge', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Property Management Services', 105, 28, { align: 'center' });

  // Invoice title and number
  doc.setTextColor(...textDark);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 20, 55);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Invoice #${invoice.invoice_number}`, 20, 63);

  // Invoice details box
  let yPos = 75;

  // Guest information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text('Bill To:', 20, yPos);

  doc.setFont('helvetica', 'normal');
  doc.text(invoice.guest_name || 'N/A', 20, yPos + 6);
  if (invoice.guest_email) {
    doc.text(invoice.guest_email, 20, yPos + 12);
  }
  if (invoice.guest_phone) {
    doc.text(invoice.guest_phone, 20, yPos + 18);
  }

  // Invoice dates (right side)
  doc.setFont('helvetica', 'bold');
  doc.text('Issue Date:', 130, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.issue_date).toLocaleDateString(), 160, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('Due Date:', 130, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.due_date).toLocaleDateString(), 160, yPos + 6);

  if (invoice.property?.property_name) {
    doc.setFont('helvetica', 'bold');
    doc.text('Property:', 130, yPos + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.property.property_name, 160, yPos + 12);
  }

  yPos += 35;

  // Line items table header
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, 170, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  doc.text('Description', 22, yPos + 5);
  doc.text('Qty', 120, yPos + 5, { align: 'right' });
  doc.text('Price', 145, yPos + 5, { align: 'right' });
  doc.text('Amount', 185, yPos + 5, { align: 'right' });

  yPos += 10;

  // Line items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (invoice.line_items && invoice.line_items.length > 0) {
    invoice.line_items.forEach((item) => {
      const description = item.description || 'Item';
      const qty = item.quantity || 1;
      const price = item.unit_price || 0;
      const amount = qty * price;

      // Wrap description if too long
      const descLines = doc.splitTextToSize(description, 95);
      doc.text(descLines, 22, yPos + 4);
      doc.text(qty.toString(), 120, yPos + 4, { align: 'right' });
      doc.text(`$${price.toFixed(2)}`, 145, yPos + 4, { align: 'right' });
      doc.text(`$${amount.toFixed(2)}`, 185, yPos + 4, { align: 'right' });

      yPos += descLines.length * 5 + 2;

      // Add tax if present
      if (item.tax_amount && item.tax_amount > 0) {
        doc.setTextColor(...textMuted);
        doc.text(`  Tax (${item.tax_rate || 0}%)`, 22, yPos + 4);
        doc.text(`$${item.tax_amount.toFixed(2)}`, 185, yPos + 4, { align: 'right' });
        yPos += 6;
        doc.setTextColor(...textDark);
      }
    });
  } else {
    doc.text('No line items', 22, yPos + 4);
    yPos += 10;
  }

  // Totals section
  yPos += 10;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 140, yPos);
  doc.text(`$${(invoice.subtotal || 0).toFixed(2)}`, 185, yPos, { align: 'right' });
  yPos += 6;

  // Tax
  if (invoice.tax_amount && invoice.tax_amount > 0) {
    doc.text('Tax:', 140, yPos);
    doc.text(`$${invoice.tax_amount.toFixed(2)}`, 185, yPos, { align: 'right' });
    yPos += 6;
  }

  // Total (highlighted)
  doc.setDrawColor(102, 126, 234);
  doc.setLineWidth(0.5);
  doc.line(140, yPos - 2, 190, yPos - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', 140, yPos + 4);
  doc.setTextColor(5, 150, 105); // Green color
  doc.text(`$${(invoice.total_amount || 0).toFixed(2)}`, 185, yPos + 4, { align: 'right' });
  yPos += 10;

  // Balance due
  doc.setTextColor(...textDark);
  doc.setFontSize(10);
  doc.text('Balance Due:', 140, yPos + 4);
  doc.setTextColor(220, 38, 38); // Red color
  doc.setFont('helvetica', 'bold');
  doc.text(`$${(invoice.balance_due || 0).toFixed(2)}`, 185, yPos + 4, { align: 'right' });

  // Notes section
  if (invoice.notes) {
    yPos += 20;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes:', 20, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textMuted);
    const notesLines = doc.splitTextToSize(invoice.notes, 170);
    doc.text(notesLines, 20, yPos + 6);
    yPos += notesLines.length * 5 + 10;
  }

  // Terms section
  if (invoice.terms) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Terms & Conditions:', 20, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textMuted);
    const termsLines = doc.splitTextToSize(invoice.terms, 170);
    doc.text(termsLines, 20, yPos + 6);
    yPos += termsLines.length * 5;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Thank you for your business!',
      105,
      285,
      { align: 'center' }
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Return as base64 string
  return doc.output('datauristring').split(',')[1];
}

export function downloadInvoicePDF(invoice: Invoice) {
  const doc = new jsPDF();

  // Generate PDF content (reuse the logic from generateInvoicePDF)
  const base64 = generateInvoicePDF(invoice);

  // Convert base64 to blob and download
  const pdfBlob = base64ToBlob(base64, 'application/pdf');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${invoice.invoice_number}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type });
}
