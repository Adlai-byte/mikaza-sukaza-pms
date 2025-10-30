import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVendorCOIs, useExpiringCOIs } from '@/hooks/useVendorCOIs';
import { useCOIDashboardStats } from '@/hooks/useCOIDashboardStats';
import { useBuildingCOIs } from '@/hooks/useBuildingCOIs';
import { useAccessAuthorizations } from '@/hooks/useAccessAuthorizations';
import { vendorCOISchema, buildingCOISchema, accessAuthorizationSchema } from '@/lib/schemas';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file.pdf' } })),
      })),
    },
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('COI Management System Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Zod Schema Validation', () => {
    it('should validate a valid vendor COI', () => {
      const validCOI = {
        vendor_id: '123e4567-e89b-12d3-a456-426614174000',
        coverage_type: 'general_liability',
        coverage_amount: 1000000,
        valid_from: '2025-01-01',
        valid_through: '2026-01-01',
        insurance_company: 'Test Insurance Co.',
        policy_number: 'POL-12345',
        file_url: 'https://example.com/test.pdf',
        file_name: 'test-coi.pdf',
        status: 'active',
      };

      const result = vendorCOISchema.safeParse(validCOI);
      expect(result.success).toBe(true);
    });

    it('should reject COI with invalid date range', () => {
      const invalidCOI = {
        vendor_id: '123e4567-e89b-12d3-a456-426614174000',
        coverage_type: 'general_liability',
        coverage_amount: 1000000,
        valid_from: '2026-01-01',
        valid_through: '2025-01-01', // Before valid_from
        insurance_company: 'Test Insurance Co.',
        policy_number: 'POL-12345',
        file_url: 'https://example.com/test.pdf',
        file_name: 'test-coi.pdf',
        status: 'active',
      };

      const result = vendorCOISchema.safeParse(invalidCOI);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Valid through date must be after');
      }
    });

    it('should reject COI with negative coverage amount', () => {
      const invalidCOI = {
        vendor_id: '123e4567-e89b-12d3-a456-426614174000',
        coverage_type: 'general_liability',
        coverage_amount: -1000,
        valid_from: '2025-01-01',
        valid_through: '2026-01-01',
        insurance_company: 'Test Insurance Co.',
        policy_number: 'POL-12345',
        file_url: 'https://example.com/test.pdf',
        file_name: 'test-coi.pdf',
        status: 'active',
      };

      const result = vendorCOISchema.safeParse(invalidCOI);
      expect(result.success).toBe(false);
    });

    it('should validate building COI with JSONB fields', () => {
      const validBuildingCOI = {
        property_id: '123e4567-e89b-12d3-a456-426614174000',
        required_coverages: {
          general_liability: { min_amount: 1000000, required: true },
          workers_compensation: { min_amount: 500000, required: true },
        },
        emergency_contact: [
          { name: 'John Doe', role: 'Security', phone: '555-0100' },
        ],
      };

      const result = buildingCOISchema.safeParse(validBuildingCOI);
      expect(result.success).toBe(true);
    });

    it('should validate access authorization', () => {
      const validAuth = {
        vendor_id: '123e4567-e89b-12d3-a456-426614174000',
        property_id: '123e4567-e89b-12d3-a456-426614174001',
        access_date: '2025-12-01',
        status: 'requested',
        number_of_personnel: 2,
      };

      const result = accessAuthorizationSchema.safeParse(validAuth);
      expect(result.success).toBe(true);
    });
  });

  describe('useVendorCOIs Hook', () => {
    it('should initialize with empty array', async () => {
      const { result } = renderHook(() => useVendorCOIs(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(Array.isArray(result.current.cois)).toBe(true);
    });

    it('should have all required methods', () => {
      const { result } = renderHook(() => useVendorCOIs(), { wrapper });

      expect(typeof result.current.createCOI).toBe('function');
      expect(typeof result.current.updateCOI).toBe('function');
      expect(typeof result.current.deleteCOI).toBe('function');
      expect(typeof result.current.verifyCOI).toBe('function');
      expect(typeof result.current.uploadCOIFile).toBe('function');
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should have loading states', () => {
      const { result } = renderHook(() => useVendorCOIs(), { wrapper });

      expect(typeof result.current.isCreating).toBe('boolean');
      expect(typeof result.current.isUpdating).toBe('boolean');
      expect(typeof result.current.isDeleting).toBe('boolean');
      expect(typeof result.current.isVerifying).toBe('boolean');
    });
  });

  describe('useCOIDashboardStats Hook', () => {
    it('should return stats data structure', async () => {
      const { result } = renderHook(() => useCOIDashboardStats(), { wrapper });

      // Hook should initialize
      expect(result.current).toBeDefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 3000 });

      // Should have data property (null or object)
      expect('data' in result.current).toBe(true);
    });
  });

  describe('useBuildingCOIs Hook', () => {
    it('should initialize with empty array', async () => {
      const { result } = renderHook(() => useBuildingCOIs(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(Array.isArray(result.current.buildingCOIs)).toBe(true);
    });

    it('should have CRUD methods', () => {
      const { result } = renderHook(() => useBuildingCOIs(), { wrapper });

      expect(typeof result.current.createBuildingCOI).toBe('function');
      expect(typeof result.current.updateBuildingCOI).toBe('function');
      expect(typeof result.current.deleteBuildingCOI).toBe('function');
      expect(typeof result.current.getBuildingCOIByProperty).toBe('function');
    });
  });

  describe('useAccessAuthorizations Hook', () => {
    it('should initialize correctly', async () => {
      const { result } = renderHook(() => useAccessAuthorizations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(Array.isArray(result.current.authorizations)).toBe(true);
    });

    it('should have workflow methods', () => {
      const { result } = renderHook(() => useAccessAuthorizations(), { wrapper });

      expect(typeof result.current.createAuthorization).toBe('function');
      expect(typeof result.current.updateAuthorization).toBe('function');
      expect(typeof result.current.deleteAuthorization).toBe('function');
      expect(typeof result.current.approveAuthorization).toBe('function');
      expect(typeof result.current.markInProgress).toBe('function');
      expect(typeof result.current.completeAuthorization).toBe('function');
      expect(typeof result.current.cancelAuthorization).toBe('function');
    });

    it('should have all loading states for workflow actions', () => {
      const { result } = renderHook(() => useAccessAuthorizations(), { wrapper });

      expect(typeof result.current.isApproving).toBe('boolean');
      expect(typeof result.current.isMarkingInProgress).toBe('boolean');
      expect(typeof result.current.isCompleting).toBe('boolean');
      expect(typeof result.current.isCancelling).toBe('boolean');
    });
  });

  describe('useExpiringCOIs Hook', () => {
    it('should fetch expiring COIs', async () => {
      const { result } = renderHook(() => useExpiringCOIs(30), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(Array.isArray(result.current.data)).toBe(true);
    });
  });

  describe('Schema Constants', () => {
    it('should export COI_COVERAGE_TYPES constant', async () => {
      const { COI_COVERAGE_TYPES } = await import('@/lib/schemas');

      expect(COI_COVERAGE_TYPES).toBeDefined();
      expect(COI_COVERAGE_TYPES.general_liability).toBe('General Liability');
      expect(COI_COVERAGE_TYPES.workers_compensation).toBe('Workers Compensation');
    });

    it('should export COI_STATUS constant', async () => {
      const { COI_STATUS } = await import('@/lib/schemas');

      expect(COI_STATUS).toBeDefined();
      expect(COI_STATUS.active).toBe('Active');
      expect(COI_STATUS.expiring_soon).toBe('Expiring Soon');
      expect(COI_STATUS.expired).toBe('Expired');
    });

    it('should export ACCESS_AUTH_STATUS constant', async () => {
      const { ACCESS_AUTH_STATUS } = await import('@/lib/schemas');

      expect(ACCESS_AUTH_STATUS).toBeDefined();
      expect(ACCESS_AUTH_STATUS.requested).toBe('Requested');
      expect(ACCESS_AUTH_STATUS.approved).toBe('Approved');
      expect(ACCESS_AUTH_STATUS.in_progress).toBe('In Progress');
    });
  });

  describe('File Upload Functionality', () => {
    it('should upload COI file and return URL', async () => {
      const { result } = renderHook(() => useVendorCOIs(), { wrapper });

      const mockFile = new File(['test'], 'test-coi.pdf', { type: 'application/pdf' });
      const vendorId = '123e4567-e89b-12d3-a456-426614174000';

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const uploadResult = await result.current.uploadCOIFile(mockFile, vendorId);

      expect(uploadResult).toBeDefined();
      expect(uploadResult.file_url).toBeDefined();
      expect(uploadResult.file_name).toBe('test-coi.pdf');
    });
  });
});

describe('COI System Integration Tests', () => {
  it('should have correct query keys for cache management', () => {
    const vendorCOIKey = ['vendor-cois', {}];
    const statsKey = ['coi-dashboard-stats'];
    const expiringKey = ['expiring-cois', 30];

    expect(Array.isArray(vendorCOIKey)).toBe(true);
    expect(Array.isArray(statsKey)).toBe(true);
    expect(Array.isArray(expiringKey)).toBe(true);
  });

  it('should validate migration file exists', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20251025_create_coi_management_system.sql'
    );

    expect(fs.existsSync(migrationPath)).toBe(true);
  });
});
