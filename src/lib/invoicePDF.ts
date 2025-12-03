import jsPDF from 'jspdf';
import { Invoice } from './schemas';
import { getLogoForPDF, BRANDING } from './logo-utils';

export async function generateInvoicePDF(invoice: Invoice): Promise<string> {
  const doc = new jsPDF();

  // Set up colors - Black & Professional Theme
  const primaryColor: [number, number, number] = [0, 0, 0]; // Black
  const accentColor: [number, number, number] = [0, 0, 0]; // Black for totals
  const textDark: [number, number, number] = [17, 24, 39]; // #111827
  const textMuted: [number, number, number] = [107, 114, 128]; // #6b7280

  // Header with black background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 45, 'F');

  // Try to add logo
  try {
    const logoBase64 = await getLogoForPDF('white'); // White logo for black background
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 75, 5, 60, 20);
    } else {
      // Fallback to text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(BRANDING.COMPANY_NAME, 105, 18, { align: 'center' });
    }
  } catch {
    // Fallback to text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(BRANDING.COMPANY_NAME, 105, 18, { align: 'center' });
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(BRANDING.TAGLINE, 105, 35, { align: 'center' });

  // Invoice title and number
  doc.setTextColor(...textDark);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 20, 58);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Invoice #${invoice.invoice_number}`, 20, 66);

  // Invoice details box
  let yPos = 78;

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

  // Line items table header (grouped by type)
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, 170, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  doc.text('Description', 22, yPos + 5);
  doc.text('Amount', 185, yPos + 5, { align: 'right' });

  yPos += 10;

  // Group line items by type
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

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

  if (invoice.line_items && invoice.line_items.length > 0) {
    // Group items by type and calculate totals
    const groupedItems: Record<string, { total: number; taxTotal: number; count: number }> = {};

    invoice.line_items.forEach((item) => {
      const itemType = item.item_type || 'other';
      const qty = item.quantity || 1;
      const price = item.unit_price || 0;
      const amount = qty * price;
      const taxAmount = item.tax_amount || 0;

      if (!groupedItems[itemType]) {
        groupedItems[itemType] = { total: 0, taxTotal: 0, count: 0 };
      }
      groupedItems[itemType].total += amount;
      groupedItems[itemType].taxTotal += taxAmount;
      groupedItems[itemType].count += 1;
    });

    // Display grouped items in defined order
    typeOrder.forEach((itemType) => {
      if (groupedItems[itemType] && groupedItems[itemType].total > 0) {
        const group = groupedItems[itemType];
        const label = typeLabels[itemType] || itemType;

        doc.setTextColor(...textDark);
        doc.text(label, 22, yPos + 4);
        doc.text(`$${group.total.toFixed(2)}`, 185, yPos + 4, { align: 'right' });
        yPos += 7;

        // Add tax if present for this group
        if (group.taxTotal > 0) {
          doc.setTextColor(...textMuted);
          doc.text(`  Tax`, 22, yPos + 4);
          doc.text(`$${group.taxTotal.toFixed(2)}`, 185, yPos + 4, { align: 'right' });
          yPos += 6;
          doc.setTextColor(...textDark);
        }
      }
    });

    // Check for any types not in the predefined order
    Object.keys(groupedItems).forEach((itemType) => {
      if (!typeOrder.includes(itemType) && groupedItems[itemType].total > 0) {
        const group = groupedItems[itemType];
        const label = typeLabels[itemType] || itemType;

        doc.setTextColor(...textDark);
        doc.text(label, 22, yPos + 4);
        doc.text(`$${group.total.toFixed(2)}`, 185, yPos + 4, { align: 'right' });
        yPos += 7;

        if (group.taxTotal > 0) {
          doc.setTextColor(...textMuted);
          doc.text(`  Tax`, 22, yPos + 4);
          doc.text(`$${group.taxTotal.toFixed(2)}`, 185, yPos + 4, { align: 'right' });
          yPos += 6;
          doc.setTextColor(...textDark);
        }
      }
    });
  } else {
    doc.text('No charges', 22, yPos + 4);
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
  doc.setDrawColor(...primaryColor); // Violet
  doc.setLineWidth(0.5);
  doc.line(140, yPos - 2, 190, yPos - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', 140, yPos + 4);
  doc.setTextColor(...accentColor); // Lime green
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

export async function downloadInvoicePDF(invoice: Invoice) {
  // Generate PDF content
  const base64 = await generateInvoicePDF(invoice);

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
