import { jsPDF } from 'jspdf';
import { CheckInOutRecord, ChecklistResponse, Attachment, ChecklistItem } from './schemas';
import { format } from 'date-fns';
import { getLogoForPDF, BRANDING, PDF_COLORS } from './logo-utils';

/**
 * PDF generation data interface
 */
export interface PDFData {
  record: CheckInOutRecord;
  checklistItems?: ChecklistItem[];
}

/**
 * Generate a professional PDF report for Check-in/Check-out records
 * Includes property details, photos, checklist, signature, and metadata
 */
export class CheckInOutPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;
  private lineHeight: number = 7;
  private primaryColor: [number, number, number] = PDF_COLORS.PRIMARY;
  private secondaryColor: [number, number, number] = PDF_COLORS.MUTED;
  private logoBase64: string = '';

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Load logo for PDF embedding
   */
  private async loadLogo(): Promise<void> {
    try {
      this.logoBase64 = await getLogoForPDF('black'); // Black logo for light PDF backgrounds
    } catch (error) {
      console.warn('Failed to load logo for PDF:', error);
    }
  }

  /**
   * Main method to generate the complete PDF
   */
  async generatePDF(record: CheckInOutRecord): Promise<Blob> {
    try {
      console.log('Starting PDF generation for record:', record.record_id);

      // Load logo for branding
      await this.loadLogo();
      console.log('✓ Logo loaded');

      // Header
      this.addHeader(record);
      console.log('✓ Header added');

      // Property and Record Information
      this.addPropertyInfo(record);
      console.log('✓ Property info added');

      // Resident Information
      this.addResidentInfo(record);
      console.log('✓ Resident info added');

      // Checklist Section
      if (record.checklist_responses && record.checklist_responses.length > 0) {
        this.addChecklistSection(record.checklist_responses);
        console.log(`✓ Checklist added (${record.checklist_responses.length} items)`);
      }

      // Photos Section (most likely to fail due to CORS or image loading)
      if (record.photos && record.photos.length > 0) {
        console.log(`Attempting to add ${record.photos.length} photos...`);
        try {
          await this.addPhotosSection(record.photos);
          console.log('✓ Photos added successfully');
        } catch (photoError) {
          console.warn('⚠️ Failed to add photos, continuing without them:', photoError);
          // Continue without photos rather than failing completely
        }
      }

      // Documents Section
      if (record.documents && record.documents.length > 0) {
        this.addDocumentsSection(record.documents);
        console.log(`✓ Documents added (${record.documents.length} items)`);
      }

      // Notes Section
      if (record.notes) {
        this.addNotesSection(record.notes);
        console.log('✓ Notes added');
      }

      // Signature Section
      if (record.signature_data || record.signature_name || record.signature_date) {
        await this.addSignatureSection(record);
        console.log('✓ Signature added');
      }

      // Footer
      this.addFooter(record);
      console.log('✓ Footer added');

      // Return as Blob
      const blob = this.doc.output('blob');
      console.log('✅ PDF generation completed successfully');
      return blob;
    } catch (error: any) {
      console.error('❌ Error generating PDF:', error);
      throw new Error(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Download the PDF directly
   */
  async downloadPDF(record: CheckInOutRecord, filename?: string): Promise<void> {
    await this.generatePDF(record);

    const defaultFilename = filename ||
      `Check-${record.record_type === 'check_in' ? 'In' : 'Out'}_${record.property?.property_name}_${format(new Date(record.record_date), 'yyyy-MM-dd')}.pdf`;

    this.doc.save(defaultFilename);
  }

  /**
   * Add header with branding and title
   */
  private addHeader(record: CheckInOutRecord): void {
    try {
      // Logo - use actual image if available, otherwise fallback to text
      if (this.logoBase64) {
        try {
          // Add logo image (black version for light PDF background)
          this.doc.addImage(this.logoBase64, 'PNG', this.margin, this.margin, 55, 18);
        } catch (imgError) {
          console.warn('Failed to add logo image, using fallback:', imgError);
          this.addFallbackLogo();
        }
      } else {
        this.addFallbackLogo();
      }

      // Document title - positioned after logo
      this.doc.setTextColor(0, 0, 0);
      this.doc.setFontSize(18);
      this.doc.setFont('helvetica', 'bold');
      const title = record.record_type === 'check_in' ? 'CHECK-IN REPORT' : 'CHECK-OUT REPORT';
      this.doc.text(title, this.pageWidth - this.margin, this.margin + 8, { align: 'right' });

      // Date and status below title
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      const dateStr = record.record_date ? format(new Date(record.record_date), 'MMM dd, yyyy') : 'N/A';
      const statusStr = (record.status || 'draft').toUpperCase();
      this.doc.setTextColor(...this.secondaryColor);
      this.doc.text(`Date: ${dateStr} | Status: ${statusStr}`, this.pageWidth - this.margin, this.margin + 16, { align: 'right' });

      this.currentY = this.margin + 30;
    } catch (error) {
      console.error('Error in addHeader:', error);
      throw error;
    }
  }

  /**
   * Add fallback text-based logo when image is not available
   */
  private addFallbackLogo(): void {
    this.doc.setFillColor(...this.primaryColor);
    this.doc.rect(this.margin, this.margin, 55, 18, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(BRANDING.COMPANY_NAME, this.margin + 27.5, this.margin + 11, { align: 'center' });
  }

  /**
   * Add property and record information
   */
  private addPropertyInfo(record: CheckInOutRecord): void {
    try {
      this.checkPageBreak(40);

      // Section header
      this.addSectionHeader('Property Information');

      // Property details in a box
      this.doc.setFillColor(245, 245, 245);
      this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 30, 'F');

      this.doc.setFontSize(10);
      this.doc.setTextColor(0, 0, 0);

      let infoY = this.currentY + 7;

      // Property name
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Property:', this.margin + 5, infoY);
      this.doc.setFont('helvetica', 'normal');
      const propertyName = record.property?.property_name || 'N/A';
      this.doc.text(String(propertyName), this.margin + 40, infoY);

      infoY += this.lineHeight;

      // Record type
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Type:', this.margin + 5, infoY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(record.record_type === 'check_in' ? 'Check-In' : 'Check-Out', this.margin + 40, infoY);

      infoY += this.lineHeight;

      // Agent
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Agent:', this.margin + 5, infoY);
      this.doc.setFont('helvetica', 'normal');
      const agentName = record.agent
        ? `${record.agent.first_name || ''} ${record.agent.last_name || ''}`.trim() || 'N/A'
        : 'N/A';
      this.doc.text(String(agentName), this.margin + 40, infoY);

      infoY += this.lineHeight;

      // Date
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Date:', this.margin + 5, infoY);
      this.doc.setFont('helvetica', 'normal');
      const dateStr = record.record_date
        ? format(new Date(record.record_date), 'MMMM dd, yyyy')
        : 'N/A';
      this.doc.text(String(dateStr), this.margin + 40, infoY);

      this.currentY += 35;
    } catch (error) {
      console.error('Error in addPropertyInfo:', error);
      throw error;
    }
  }

  /**
   * Add resident information
   */
  private addResidentInfo(record: CheckInOutRecord): void {
    try {
      this.checkPageBreak(25);

      this.addSectionHeader('Resident Information');

      this.doc.setFillColor(245, 245, 245);
      this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 15, 'F');

      this.doc.setFontSize(10);
      this.doc.setTextColor(0, 0, 0);

      let infoY = this.currentY + 7;

      // Resident name
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Name:', this.margin + 5, infoY);
      this.doc.setFont('helvetica', 'normal');
      const residentName = record.resident_name || 'N/A';
      this.doc.text(String(residentName), this.margin + 40, infoY);

      // Contact
      if (record.resident_contact) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Contact:', this.pageWidth / 2 + 10, infoY);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(String(record.resident_contact), this.pageWidth / 2 + 35, infoY);
      }

      this.currentY += 20;
    } catch (error) {
      console.error('Error in addResidentInfo:', error);
      throw error;
    }
  }

  /**
   * Add checklist section
   */
  private addChecklistSection(responses: ChecklistResponse[]): void {
    try {
      this.checkPageBreak(20 + responses.length * 10);

      this.addSectionHeader('Checklist');

      responses.forEach((response, index) => {
        this.checkPageBreak(15);

        // Checkbox
        const boxSize = 4;
        const boxX = this.margin + 5;
        const boxY = this.currentY - boxSize + 2;

        this.doc.setDrawColor(100, 100, 100);
        this.doc.rect(boxX, boxY, boxSize, boxSize);

        if (response.checked) {
          this.doc.setDrawColor(...this.primaryColor);
          this.doc.setLineWidth(0.5);
          this.doc.line(boxX + 1, boxY + 2, boxX + 2, boxY + 3);
          this.doc.line(boxX + 2, boxY + 3, boxX + 3.5, boxY + 0.5);
          this.doc.setLineWidth(0.2);
        }

        // Item text
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(0, 0, 0);
        const itemText = response.item_text || 'Checklist item';
        this.doc.text(String(itemText), this.margin + 12, this.currentY);

        // Response/notes
        if (response.response || response.notes) {
          this.doc.setFontSize(9);
          this.doc.setTextColor(...this.secondaryColor);
          const note = String(response.response || response.notes || '');
          this.doc.text(`  → ${note}`, this.margin + 12, this.currentY + 5);
          this.currentY += 5;
        }

        this.currentY += 10;
      });

      this.currentY += 5;
    } catch (error) {
      console.error('Error in addChecklistSection:', error);
      throw error;
    }
  }

  /**
   * Add photos section with embedded images
   */
  private async addPhotosSection(photos: Attachment[]): Promise<void> {
    this.checkPageBreak(30);

    this.addSectionHeader(`Photos (${photos.length})`);

    const photosPerRow = 2;
    const photoWidth = (this.pageWidth - 2 * this.margin - 10) / photosPerRow;
    const photoHeight = photoWidth * 0.75; // 4:3 aspect ratio

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const col = i % photosPerRow;
      const row = Math.floor(i / photosPerRow);

      // Check if we need a new page
      this.checkPageBreak(photoHeight + 20);

      const x = this.margin + col * (photoWidth + 5);
      const y = this.currentY + row * (photoHeight + 15);

      try {
        console.log(`Loading photo ${i + 1}/${photos.length}:`, photo.url);

        // Fetch and convert image to base64
        const imageData = await this.loadImage(photo.url);

        // Add image to PDF
        this.doc.addImage(imageData, 'JPEG', x, y, photoWidth, photoHeight);
        console.log(`✓ Photo ${i + 1} added successfully`);

        // Add caption if available
        if (photo.caption || photo.name) {
          this.doc.setFontSize(8);
          this.doc.setTextColor(...this.secondaryColor);
          this.doc.text(photo.caption || photo.name, x, y + photoHeight + 4, {
            maxWidth: photoWidth,
          });
        }
      } catch (error: any) {
        console.warn(`⚠️ Failed to load photo ${i + 1}:`, error.message);
        // Draw placeholder if image fails
        this.doc.setDrawColor(200, 200, 200);
        this.doc.setFillColor(245, 245, 245);
        this.doc.rect(x, y, photoWidth, photoHeight, 'FD');

        this.doc.setFontSize(9);
        this.doc.setTextColor(150, 150, 150);
        this.doc.text('Image unavailable', x + photoWidth / 2, y + photoHeight / 2, { align: 'center' });

        // Add caption even if image failed
        if (photo.caption || photo.name) {
          this.doc.setFontSize(8);
          this.doc.setTextColor(...this.secondaryColor);
          this.doc.text(photo.caption || photo.name, x, y + photoHeight + 4, {
            maxWidth: photoWidth,
          });
        }
      }

      // Move to next row after completing a row
      if (col === photosPerRow - 1) {
        this.currentY = y + photoHeight + 15;
      }
    }

    // Adjust currentY if last row was incomplete
    if (photos.length % photosPerRow !== 0) {
      const lastRow = Math.floor((photos.length - 1) / photosPerRow);
      this.currentY += photoHeight + 15;
    }

    this.currentY += 10;
  }

  /**
   * Add documents section
   */
  private addDocumentsSection(documents: Attachment[]): void {
    this.checkPageBreak(20 + documents.length * 7);

    this.addSectionHeader('Attached Documents');

    this.doc.setFontSize(9);
    this.doc.setTextColor(0, 0, 0);

    documents.forEach((doc, index) => {
      this.checkPageBreak(10);

      const bulletX = this.margin + 5;

      // Bullet point
      this.doc.circle(bulletX, this.currentY - 1, 0.8, 'F');

      // Document name
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(doc.name, bulletX + 3, this.currentY);

      // File size
      if (doc.size) {
        const sizeStr = this.formatFileSize(doc.size);
        this.doc.setTextColor(...this.secondaryColor);
        this.doc.text(` (${sizeStr})`, bulletX + 3 + this.doc.getTextWidth(doc.name), this.currentY);
        this.doc.setTextColor(0, 0, 0);
      }

      this.currentY += 7;
    });

    this.currentY += 5;
  }

  /**
   * Add notes section
   */
  private addNotesSection(notes: string): void {
    this.checkPageBreak(30);

    this.addSectionHeader('Notes');

    this.doc.setFillColor(255, 255, 240);
    this.doc.setDrawColor(200, 200, 150);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, -1, 'FD');

    this.doc.setFontSize(10);
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');

    const lines = this.doc.splitTextToSize(notes, this.pageWidth - 2 * this.margin - 10);
    const notesHeight = lines.length * this.lineHeight + 10;

    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, notesHeight, 'FD');

    this.doc.text(lines, this.margin + 5, this.currentY + 7);

    this.currentY += notesHeight + 5;
  }

  /**
   * Validate that a signature is a valid data URL with sufficient content
   */
  private isValidSignatureDataUrl(data: string | null | undefined): data is string {
    if (!data || typeof data !== 'string') {
      console.log('⚠️ Signature validation failed: data is null, undefined, or not a string');
      return false;
    }
    if (!data.startsWith('data:image/')) {
      console.log('⚠️ Signature validation failed: does not start with data:image/');
      return false;
    }
    if (!data.includes('base64,')) {
      console.log('⚠️ Signature validation failed: missing base64 marker');
      return false;
    }
    // Minimum reasonable length for a signature image (base64 encoded)
    if (data.length < 100) {
      console.log('⚠️ Signature validation failed: data too short (length:', data.length, ')');
      return false;
    }
    return true;
  }

  /**
   * Extract image format from data URL
   */
  private getImageFormatFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' | 'GIF' | 'WEBP' {
    if (dataUrl.includes('data:image/png')) return 'PNG';
    if (dataUrl.includes('data:image/jpeg') || dataUrl.includes('data:image/jpg')) return 'JPEG';
    if (dataUrl.includes('data:image/gif')) return 'GIF';
    if (dataUrl.includes('data:image/webp')) return 'WEBP';
    // Default to PNG for signatures (most common from canvas)
    return 'PNG';
  }

  /**
   * Add signature section
   */
  private async addSignatureSection(record: CheckInOutRecord): Promise<void> {
    this.checkPageBreak(60);

    this.addSectionHeader('Signature');

    const signatureWidth = 80;
    const signatureHeight = 40;
    const signatureX = this.margin + 5;

    // Draw signature box border
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setFillColor(255, 255, 255);
    this.doc.rect(signatureX, this.currentY, signatureWidth, signatureHeight, 'FD');

    // Try to add signature image with robust validation
    if (this.isValidSignatureDataUrl(record.signature_data)) {
      let signatureAdded = false;
      try {
        console.log('📝 Adding signature to PDF, data length:', record.signature_data.length);
        console.log('📝 Signature data prefix:', record.signature_data.substring(0, 50));

        // Auto-detect image format from data URL
        const imageFormat = this.getImageFormatFromDataUrl(record.signature_data);
        console.log('📝 Detected image format:', imageFormat);

        this.doc.addImage(
          record.signature_data,
          imageFormat,
          signatureX + 2,
          this.currentY + 2,
          signatureWidth - 4,
          signatureHeight - 4
        );
        signatureAdded = true;
        console.log('✅ Signature added to PDF successfully');
      } catch (error: any) {
        console.error('❌ Error adding signature image:', error?.message || error);

        // Try with different format as fallback
        try {
          console.log('🔄 Retrying with JPEG format...');
          this.doc.addImage(
            record.signature_data,
            'JPEG',
            signatureX + 2,
            this.currentY + 2,
            signatureWidth - 4,
            signatureHeight - 4
          );
          signatureAdded = true;
          console.log('✅ Signature added with JPEG fallback');
        } catch (fallbackError) {
          console.error('❌ JPEG fallback also failed:', fallbackError);
        }
      }

      if (!signatureAdded) {
        // Fallback: Display text message if image fails
        this.doc.setFontSize(8);
        this.doc.setTextColor(150, 150, 150);
        this.doc.text('Signature image unavailable', signatureX + signatureWidth / 2, this.currentY + signatureHeight / 2, {
          align: 'center'
        });
        this.doc.setTextColor(0, 0, 0);
      }
    } else {
      console.log('⚠️ No valid signature_data in record, signature_data:',
        record.signature_data ? `${typeof record.signature_data}, length: ${String(record.signature_data).length}` : 'null/undefined');
      // No signature data - show placeholder
      this.doc.setFontSize(8);
      this.doc.setTextColor(150, 150, 150);
      this.doc.text('(Signature)', signatureX + signatureWidth / 2, this.currentY + signatureHeight / 2, {
        align: 'center'
      });
      this.doc.setTextColor(0, 0, 0);
    }

    this.currentY += signatureHeight + 5;

    // Signature details
    this.doc.setFontSize(9);
    this.doc.setTextColor(0, 0, 0);

    if (record.signature_name) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Signed by:', signatureX, this.currentY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(record.signature_name, signatureX + 22, this.currentY);
      this.currentY += 6;
    }

    if (record.signature_date) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Date:', signatureX, this.currentY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(format(new Date(record.signature_date), 'MMM dd, yyyy HH:mm'), signatureX + 22, this.currentY);
    }

    this.currentY += 10;
  }

  /**
   * Add footer with metadata
   */
  private addFooter(record: CheckInOutRecord): void {
    try {
      const footerY = this.pageHeight - 15;

      this.doc.setDrawColor(...this.primaryColor);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin, footerY, this.pageWidth - this.margin, footerY);

      this.doc.setFontSize(8);
      this.doc.setTextColor(...this.secondaryColor);
      this.doc.setFont('helvetica', 'normal');

      // Generated info
      const generatedText = `Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')} | Casa & Concierge Property Management`;
      this.doc.text(generatedText, this.pageWidth / 2, footerY + 5, { align: 'center' });

      // Record ID
      const recordIdText = `Record ID: ${String(record.record_id || 'N/A')}`;
      this.doc.text(recordIdText, this.pageWidth / 2, footerY + 10, { align: 'center' });
    } catch (error) {
      console.error('Error in addFooter:', error);
      throw error;
    }
  }

  /**
   * Helper: Add section header
   */
  private addSectionHeader(title: string): void {
    this.checkPageBreak(15);

    this.doc.setFillColor(...this.primaryColor);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');

    this.doc.setFontSize(12);
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin + 5, this.currentY + 6);

    this.currentY += 13;
  }

  /**
   * Helper: Check if we need a page break
   */
  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 25) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  /**
   * Helper: Load image and convert to base64
   */
  private async loadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataURL);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Helper: Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

/**
 * Generate PDF from data (compatible with existing hooks)
 */
export async function generateCheckInOutPDF(data: PDFData): Promise<Blob> {
  const generator = new CheckInOutPDFGenerator();
  return generator.generatePDF(data.record);
}

/**
 * Generate PDF and upload to Supabase storage
 */
export async function generateAndUploadCheckInOutPDF(
  data: PDFData,
  supabase: any
): Promise<string> {
  const blob = await generateCheckInOutPDF(data);

  // Upload to Supabase storage
  const fileName = `check-in-out-${data.record.record_id}-${Date.now()}.pdf`;
  const filePath = `check-in-out/reports/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('property-documents')
    .upload(filePath, blob, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('PDF upload error:', uploadError);
    throw new Error(`Failed to upload PDF: ${uploadError.message}`);
  }

  // Generate a signed URL for long-term access (7 days)
  // Note: For permanent access, consider using public buckets or refreshing URLs periodically
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('property-documents')
    .createSignedUrl(filePath, 604800); // 7 days (STORAGE_URL_EXPIRATION.PDF_RECORD)

  if (signedUrlError) {
    console.error('Error creating signed URL:', signedUrlError);
    throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
  }

  return signedUrlData.signedUrl;
}

/**
 * Convenience function to generate and download PDF directly
 */
export async function downloadCheckInOutPDF(record: CheckInOutRecord, filename?: string): Promise<void> {
  const generator = new CheckInOutPDFGenerator();
  await generator.downloadPDF(record, filename);
}
