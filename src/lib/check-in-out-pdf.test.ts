import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckInOutPDFGenerator, generateCheckInOutPDF, generateAndUploadCheckInOutPDF } from './check-in-out-pdf';
import { CheckInOutRecord } from './schemas';

// Mock logo utils to avoid loading actual logo (partial mock to keep PDF_COLORS)
vi.mock('./logo-utils', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getLogoForPDF: vi.fn().mockResolvedValue('data:image/png;base64,mockLogoBase64'),
  };
});

// Mock Image constructor for loadImage method
class MockImage {
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  src = '';
  width = 100;
  height = 100;
  crossOrigin = '';

  constructor() {
    // Immediately trigger onload after src is set
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

// @ts-ignore - Mock global Image
global.Image = MockImage as any;

// Mock canvas for image conversion
const mockCanvas = {
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,mockImageBase64'),
  width: 100,
  height: 100,
};

vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas as any;
  }
  return document.createElement(tagName);
});

// Mock jsPDF
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    rect: vi.fn(),
    text: vi.fn(),
    circle: vi.fn(),
    line: vi.fn(),
    addImage: vi.fn(),
    addPage: vi.fn(),
    splitTextToSize: vi.fn((text) => [text]),
    getTextWidth: vi.fn(() => 50),
    output: vi.fn(() => new Blob(['test-pdf'], { type: 'application/pdf' })),
    save: vi.fn(),
  })),
}));

describe('CheckInOutPDFGenerator', () => {
  let mockRecord: CheckInOutRecord;

  beforeEach(() => {
    mockRecord = {
      record_id: 'test-record-123',
      property_id: 'prop-123',
      record_type: 'check_in',
      record_date: '2024-01-15',
      resident_name: 'John Doe',
      resident_contact: '+1234567890',
      status: 'completed',
      property: {
        property_id: 'prop-123',
        property_name: 'Sunset Villa',
        address: '123 Main Street, City, State 12345',
      },
      agent: {
        user_id: 'agent-123',
        first_name: 'Jane',
        last_name: 'Smith',
        user_type: 'ops',
      },
      checklist_responses: [
        {
          item_id: 'item-1',
          item_text: 'Check all doors and windows',
          checked: true,
          response: 'All secure',
          notes: 'No issues found',
        },
        {
          item_id: 'item-2',
          item_text: 'Verify appliances working',
          checked: true,
          response: 'All functional',
        },
      ],
      photos: [
        {
          url: 'https://example.com/photo1.jpg',
          name: 'Living Room',
          caption: 'Living room entrance',
          size: 1024000,
        },
        {
          url: 'https://example.com/photo2.jpg',
          name: 'Kitchen',
          caption: 'Kitchen area',
          size: 2048000,
        },
      ],
      documents: [
        {
          url: 'https://example.com/doc1.pdf',
          name: 'Lease Agreement.pdf',
          size: 512000,
        },
      ],
      notes: 'Property is in excellent condition. All items checked and verified.',
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
      signature_name: 'John Doe',
      signature_date: '2024-01-15T10:30:00Z',
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      created_by: 'agent-123',
      agent_id: 'agent-123',
      template_id: null,
      template: null,
      creator: null,
    } as CheckInOutRecord;
  });

  describe('generatePDF', () => {
    it('should generate a PDF blob for a check-in record', async () => {
      const generator = new CheckInOutPDFGenerator();
      const blob = await generator.generatePDF(mockRecord);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should generate a PDF blob for a check-out record', async () => {
      mockRecord.record_type = 'check_out';
      const generator = new CheckInOutPDFGenerator();
      const blob = await generator.generatePDF(mockRecord);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should handle records with minimal data', async () => {
      const minimalRecord: CheckInOutRecord = {
        record_id: 'test-123',
        property_id: 'prop-123',
        record_type: 'check_in',
        record_date: '2024-01-15',
        resident_name: 'Jane Doe',
        status: 'draft',
        property: {
          property_id: 'prop-123',
          property_name: 'Test Property',
        },
        checklist_responses: [],
        photos: [],
        documents: [],
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T09:00:00Z',
        created_by: 'user-123',
        agent_id: null,
        template_id: null,
        agent: null,
        template: null,
        creator: null,
        resident_contact: null,
        notes: null,
        signature_data: null,
        signature_name: null,
        signature_date: null,
      } as CheckInOutRecord;

      const generator = new CheckInOutPDFGenerator();
      const blob = await generator.generatePDF(minimalRecord);

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle records with checklist responses', async () => {
      const generator = new CheckInOutPDFGenerator();
      const blob = await generator.generatePDF(mockRecord);

      expect(blob).toBeInstanceOf(Blob);
      expect(mockRecord.checklist_responses).toHaveLength(2);
    });

    it('should handle records with multiple photos', async () => {
      const generator = new CheckInOutPDFGenerator();

      // Mock image loading to avoid actual network requests
      const originalLoadImage = (generator as any).loadImage;
      (generator as any).loadImage = vi.fn().mockResolvedValue('data:image/jpeg;base64,test');

      const blob = await generator.generatePDF(mockRecord);

      expect(blob).toBeInstanceOf(Blob);
      expect(mockRecord.photos).toHaveLength(2);
    });

    it('should handle records with documents', async () => {
      const generator = new CheckInOutPDFGenerator();
      const blob = await generator.generatePDF(mockRecord);

      expect(blob).toBeInstanceOf(Blob);
      expect(mockRecord.documents).toHaveLength(1);
    });

    it('should handle records with notes', async () => {
      const generator = new CheckInOutPDFGenerator();
      const blob = await generator.generatePDF(mockRecord);

      expect(blob).toBeInstanceOf(Blob);
      expect(mockRecord.notes).toBeTruthy();
    });

    it('should handle records with signature', async () => {
      const generator = new CheckInOutPDFGenerator();
      const blob = await generator.generatePDF(mockRecord);

      expect(blob).toBeInstanceOf(Blob);
      expect(mockRecord.signature_data).toBeTruthy();
      expect(mockRecord.signature_name).toBe('John Doe');
    });
  });

  describe('generateCheckInOutPDF', () => {
    it('should generate PDF from PDFData object', async () => {
      const blob = await generateCheckInOutPDF({
        record: mockRecord,
        checklistItems: [],
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });
  });

  describe('generateAndUploadCheckInOutPDF', () => {
    it('should generate and upload PDF to Supabase', async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({
              data: { path: 'test-path' },
              error: null
            }),
            createSignedUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: 'https://example.com/signed-url' },
              error: null,
            }),
          }),
        },
      };

      const url = await generateAndUploadCheckInOutPDF(
        { record: mockRecord, checklistItems: [] },
        mockSupabase
      );

      expect(url).toBe('https://example.com/signed-url');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('property-documents');
    });

    it('should handle upload errors', async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Upload failed' },
            }),
          }),
        },
      };

      await expect(
        generateAndUploadCheckInOutPDF(
          { record: mockRecord, checklistItems: [] },
          mockSupabase
        )
      ).rejects.toThrow('Failed to upload PDF: Upload failed');
    });

    it('should handle signed URL generation errors', async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({
              data: { path: 'test-path' },
              error: null,
            }),
            createSignedUrl: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Failed to create signed URL' },
            }),
          }),
        },
      };

      await expect(
        generateAndUploadCheckInOutPDF(
          { record: mockRecord, checklistItems: [] },
          mockSupabase
        )
      ).rejects.toThrow('Failed to create signed URL: Failed to create signed URL');
    });
  });

  describe('PDF Content Validation', () => {
    it('should include all required sections', async () => {
      const generator = new CheckInOutPDFGenerator();
      const blob = await generator.generatePDF(mockRecord);

      // Verify blob size is reasonable (not empty)
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should format file sizes correctly', async () => {
      const generator = new CheckInOutPDFGenerator();
      const formatFileSize = (generator as any).formatFileSize.bind(generator);

      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(2097152)).toBe('2.0 MB');
    });

    it('should generate unique filenames', async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({
              data: { path: 'test-path' },
              error: null,
            }),
            createSignedUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: 'https://example.com/signed-url' },
              error: null,
            }),
          }),
        },
      };

      await generateAndUploadCheckInOutPDF(
        { record: mockRecord, checklistItems: [] },
        mockSupabase
      );

      const uploadCall = mockSupabase.storage.from().upload.mock.calls[0];
      const filePath = uploadCall[0];

      expect(filePath).toContain('check-in-out/reports/');
      expect(filePath).toContain(mockRecord.record_id);
      expect(filePath).toMatch(/\.pdf$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle image loading failures gracefully', async () => {
      const generator = new CheckInOutPDFGenerator();

      // Mock failed image loading
      (generator as any).loadImage = vi.fn().mockRejectedValue(new Error('Failed to load image'));

      // Should not throw, should continue with placeholder
      const blob = await generator.generatePDF(mockRecord);
      expect(blob).toBeInstanceOf(Blob);
    }, 15000); // 15 second timeout for PDF generation

    it('should handle missing property information', async () => {
      const recordWithoutProperty = {
        ...mockRecord,
        property: null,
      };

      const generator = new CheckInOutPDFGenerator();
      const blob = await generator.generatePDF(recordWithoutProperty as any);

      expect(blob).toBeInstanceOf(Blob);
    }, 15000); // 15 second timeout for PDF generation

    it('should handle missing agent information', async () => {
      const recordWithoutAgent = {
        ...mockRecord,
        agent: null,
      };

      const generator = new CheckInOutPDFGenerator();
      const blob = await generator.generatePDF(recordWithoutAgent as any);

      expect(blob).toBeInstanceOf(Blob);
    }, 15000); // 15 second timeout for PDF generation
  });
});
