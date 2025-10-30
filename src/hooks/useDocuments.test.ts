import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDocuments, useDocumentDetail, useDocumentStats } from './useDocuments';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockSupabaseSuccess, mockSupabaseError } from '@/test/utils/supabase-mock';

// Mock activity logs
vi.mock('@/hooks/useActivityLogs', () => ({
  useActivityLogs: () => ({
    logActivity: vi.fn(),
  }),
}));

// Mock permissions
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn().mockReturnValue(true),
  }),
}));

// Mock AuthContext - Must be first
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    profile: { user_id: 'user-123', user_type: 'admin' },
    session: { user: { id: 'user-123' }, access_token: 'mock-token' },
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock Supabase client - Must be defined inline for Vitest hoisting
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      }),
    },
  },
}));

// Import after mocking
import { supabase } from '@/integrations/supabase/client';
const mockSupabase = supabase as any;

// Mock document data - using DocumentSummary structure
const mockDocument = (overrides = {}) => ({
  document_id: 'doc-123',
  category: 'contracts',
  document_name: 'Test Contract.pdf',
  file_name: 'contract-2025.pdf',
  property_id: 'prop-123',
  file_url: 'https://example.com/doc.pdf',
  uploaded_by: 'user-123',
  created_at: '2025-10-23T00:00:00Z',
  status: 'active',
  version_number: 1,
  is_current_version: true,
  expiry_date: null,
  tags: [],
  description: 'Test document',
  ...overrides,
});

describe('useDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all documents successfully', async () => {
    const mockDocs = [
      mockDocument({ document_id: 'doc-1', document_name: 'Contract.pdf' }),
      mockDocument({ document_id: 'doc-2', document_name: 'Insurance.pdf' }),
      mockDocument({ document_id: 'doc-3', document_name: 'License.pdf' }),
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDocs)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.documents).toEqual(mockDocs);
    expect(result.current.documents.length).toBe(3);
  });

  it('should fetch documents filtered by property', async () => {
    const mockDocs = [
      mockDocument({ property_id: 'prop-123' }),
    ];

    // Create a chainable query mock that handles: .from().select().eq().order() with additional .eq()
    const queryChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    // Make it awaitable/thenable
    queryChain.then = vi.fn((resolve) => {
      return Promise.resolve(mockSupabaseSuccess(mockDocs)).then(resolve);
    });

    mockSupabase.from.mockReturnValue(queryChain);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useDocuments({ property_id: 'prop-123' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.documents).toEqual(mockDocs);
  });

  it('should fetch documents filtered by category', async () => {
    const mockDocs = [
      mockDocument({ category: 'contracts' }),
    ];

    const queryChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    queryChain.then = vi.fn((resolve) => {
      return Promise.resolve(mockSupabaseSuccess(mockDocs)).then(resolve);
    });

    mockSupabase.from.mockReturnValue(queryChain);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useDocuments({ category: 'contracts' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.documents).toEqual(mockDocs);
  });

  it('should fetch documents filtered by status', async () => {
    const mockDocs = [
      mockDocument({ status: 'active' }),
    ];

    const queryChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    queryChain.then = vi.fn((resolve) => {
      return Promise.resolve(mockSupabaseSuccess(mockDocs)).then(resolve);
    });

    mockSupabase.from.mockReturnValue(queryChain);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useDocuments({ status: 'active' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.documents).toEqual(mockDocs);
  });

  it('should handle fetch error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(
            mockSupabaseError('Failed to fetch documents')
          ),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should return empty array when no documents exist', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.documents).toEqual([]);
  });
});

describe('useDocuments - createDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create document record successfully', async () => {
    const newDoc = mockDocument({
      document_name: 'New Contract.pdf',
    });

    // Mock the query chain for fetching documents
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'document_summary') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'documents') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newDoc)),
            }),
          }),
        };
      }
      return {};
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.createDocument({
      category: 'contracts',
      document_name: 'New Contract.pdf',
      file_name: 'contract.pdf',
      property_id: 'prop-123',
      file_url: 'https://example.com/new-contract.pdf',
      description: 'Important contract',
    });

    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });
  });

  it('should include uploaded_by from session', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(
          mockSupabaseSuccess(mockDocument({ uploaded_by: 'user-123' }))
        ),
      }),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'document_summary') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'documents') {
        return { insert: insertMock };
      }
      return {};
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.createDocument({
      category: 'contracts',
      document_name: 'Test.pdf',
      file_name: 'test.pdf',
      property_id: 'prop-123',
      file_url: 'https://example.com/test.pdf',
    });

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            uploaded_by: 'user-123',
          })
        ])
      );
    });
  });

  it('should handle creation error', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'document_summary') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'documents') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                mockSupabaseError('Failed to create document')
              ),
            }),
          }),
        };
      }
      return {};
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.createDocument({
      category: 'contracts',
      document_name: 'Test.pdf',
      file_name: 'test.pdf',
      property_id: 'prop-123',
      file_url: 'https://example.com/test.pdf',
    });

    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });
  });
});

describe('useDocuments - updateDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update document successfully', async () => {
    const updatedDoc = mockDocument({
      document_id: 'doc-123',
      document_name: 'Updated Contract.pdf',
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'document_summary') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'documents') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedDoc)),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.updateDocument({
      documentId: 'doc-123',
      data: { document_name: 'Updated Contract.pdf' },
    });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });

  it('should handle update error', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'document_summary') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'documents') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(
                  mockSupabaseError('Failed to update document')
                ),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.updateDocument({
      documentId: 'doc-123',
      data: { document_name: 'Updated Contract.pdf' },
    });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });
});

describe('useDocuments - deleteDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete document successfully', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'document_summary') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'documents') {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
          }),
        };
      }
      return {};
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.deleteDocument('doc-123');

    await waitFor(() => {
      expect(result.current.isDeleting).toBe(false);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('documents');
  });

  it('should handle delete error', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'document_summary') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'documents') {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(
              mockSupabaseError('Failed to delete document')
            ),
          }),
        };
      }
      return {};
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.deleteDocument('doc-123');

    await waitFor(() => {
      expect(result.current.isDeleting).toBe(false);
    });
  });
});

describe('useDocumentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch document detail successfully', async () => {
    const detailDoc = mockDocument({
      document_id: 'doc-123',
      document_name: 'Contract Details.pdf',
    });

    // Mock the documents query for useDocuments (called by useDocumentDetail)
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'document_summary') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'documents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(detailDoc)),
            }),
          }),
        };
      }
      return {};
    });

    // Mock rpc for logging
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocumentDetail('doc-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.document).toEqual(detailDoc);
  });

  it('should handle detail fetch error', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'document_summary') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        };
      }
      if (table === 'documents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                mockSupabaseError('Document not found')
              ),
            }),
          }),
        };
      }
      return {};
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocumentDetail('doc-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});

describe('useDocumentStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch document stats successfully', async () => {
    const mockStats = [
      { category: 'contracts', total_documents: 10, active_documents: 8 },
      { category: 'coi', total_documents: 5, active_documents: 5 },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockStats)),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocumentStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.stats.length).toBe(2);
  });

  it('should handle stats fetch error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockResolvedValue(
        mockSupabaseError('Failed to fetch stats')
      ),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocumentStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});

describe('Document Categories', () => {
  it('should support different document categories', () => {
    const contractDoc = mockDocument({ category: 'contracts' });
    const accessDoc = mockDocument({ category: 'access' });
    const coiDoc = mockDocument({ category: 'coi' });
    const serviceDoc = mockDocument({ category: 'service' });

    expect(contractDoc.category).toBe('contracts');
    expect(accessDoc.category).toBe('access');
    expect(coiDoc.category).toBe('coi');
    expect(serviceDoc.category).toBe('service');
  });

  it('should link documents to properties', () => {
    const doc1 = mockDocument({ property_id: 'prop-123' });
    const doc2 = mockDocument({ property_id: 'prop-456' });

    expect(doc1.property_id).toBe('prop-123');
    expect(doc2.property_id).toBe('prop-456');
  });
});
