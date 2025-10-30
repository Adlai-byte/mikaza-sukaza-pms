import { jsPDF } from 'jspdf';
import { CheckInOutRecord, ChecklistItem, ChecklistResponse, Attachment } from './schemas';

interface PDFData {
  record: CheckInOutRecord;
  checklistItems?: ChecklistItem[];
}

export async function generateCheckInOutPDF(data: PDFData): Promise<Blob> {
  const { record, checklistItems = [] } = data;
  const doc = new jsPDF();

  let yPos = 20;
  const leftMargin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const contentWidth = pageWidth - 2 * leftMargin;

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const title = record.record_type === 'check_in' ? 'CHECK-IN REPORT' : 'CHECK-OUT REPORT';
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Property Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPERTY INFORMATION', leftMargin, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Property: ${record.property?.property_name || 'N/A'}`, leftMargin, yPos);
  yPos += 5;
  doc.text(`Address: ${record.property?.address || 'N/A'}`, leftMargin, yPos);
  yPos += 5;
  doc.text(`Date: ${new Date(record.record_date).toLocaleDateString()}`, leftMargin, yPos);
  yPos += 10;

  // Resident Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESIDENT INFORMATION', leftMargin, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${record.resident_name || 'N/A'}`, leftMargin, yPos);
  yPos += 5;
  if (record.resident_contact) {
    doc.text(`Contact: ${record.resident_contact}`, leftMargin, yPos);
    yPos += 5;
  }
  yPos += 5;

  // Agent Information
  if (record.agent) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AGENT INFORMATION', leftMargin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Agent: ${record.agent.first_name} ${record.agent.last_name}`,
      leftMargin,
      yPos
    );
    yPos += 10;
  }

  // Checklist
  if (checklistItems.length > 0 && record.checklist_responses) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CHECKLIST', leftMargin, yPos);
    yPos += 7;

    const responses = record.checklist_responses as ChecklistResponse[];

    for (const item of checklistItems.sort((a, b) => a.order - b.order)) {
      const response = responses.find(r => r.item_id === item.id);

      checkPageBreak(15);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const itemLabel = `${item.label}${item.required ? ' *' : ''}`;
      doc.text(itemLabel, leftMargin, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      let responseText = '';

      if (item.type === 'checkbox') {
        responseText = response?.response === true ? '☑ Yes' : '☐ No';
      } else if (item.type === 'text' || item.type === 'number') {
        responseText = String(response?.response || 'No response');
      } else if (item.type === 'photo') {
        responseText = 'Photo attached';
      }

      doc.text(`Response: ${responseText}`, leftMargin + 5, yPos);
      yPos += 5;

      if (response?.notes) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        const notesLines = doc.splitTextToSize(`Notes: ${response.notes}`, contentWidth - 10);
        doc.text(notesLines, leftMargin + 5, yPos);
        yPos += notesLines.length * 4;
        doc.setTextColor(0);
        doc.setFontSize(10);
      }

      yPos += 3;
    }

    yPos += 5;
  }

  // Photos
  if (record.photos && (record.photos as Attachment[]).length > 0) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PHOTOS', leftMargin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${(record.photos as Attachment[]).length} photo(s) attached to this record`,
      leftMargin,
      yPos
    );
    yPos += 10;

    // Note: Actual photo embedding would require loading images as base64
    // For now, we just list them
    for (const [index, photo] of (record.photos as Attachment[]).entries()) {
      checkPageBreak(10);
      doc.text(`${index + 1}. ${photo.caption || photo.name || 'Photo'}`, leftMargin + 5, yPos);
      yPos += 5;
    }

    yPos += 5;
  }

  // Documents
  if (record.documents && (record.documents as Attachment[]).length > 0) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENTS', leftMargin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    for (const [index, document] of (record.documents as Attachment[]).entries()) {
      checkPageBreak(10);
      doc.text(`${index + 1}. ${document.name}`, leftMargin + 5, yPos);
      yPos += 5;
    }

    yPos += 5;
  }

  // Notes
  if (record.notes) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ADDITIONAL NOTES', leftMargin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(record.notes, contentWidth);
    doc.text(notesLines, leftMargin, yPos);
    yPos += notesLines.length * 5 + 10;
  }

  // Signature
  if (record.signature_data && record.signature_name) {
    checkPageBreak(50);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SIGNATURE', leftMargin, yPos);
    yPos += 7;

    try {
      // Add signature image
      doc.addImage(record.signature_data, 'PNG', leftMargin, yPos, 80, 30);
      yPos += 35;
    } catch (error) {
      console.error('Error adding signature image:', error);
      yPos += 35;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Signed by: ${record.signature_name}`, leftMargin, yPos);
    yPos += 5;

    if (record.signature_date) {
      doc.text(
        `Date: ${new Date(record.signature_date).toLocaleDateString()}`,
        leftMargin,
        yPos
      );
      yPos += 5;
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${new Date().toLocaleString()} | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

export async function generateAndUploadCheckInOutPDF(
  data: PDFData,
  supabase: any
): Promise<string> {
  const blob = await generateCheckInOutPDF(data);

  // Upload to Supabase storage
  const fileName = `check-in-out-${data.record.record_id}-${Date.now()}.pdf`;
  const filePath = `check-in-out/reports/${fileName}`;

  const { error: uploadError, data: uploadData } = await supabase.storage
    .from('documents')
    .upload(filePath, blob, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload PDF: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return publicUrl;
}
