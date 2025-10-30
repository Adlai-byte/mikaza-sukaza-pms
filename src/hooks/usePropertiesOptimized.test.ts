import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePropertiesOptimized, usePropertyDetail } from './usePropertiesOptimized';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockProperty } from '@/test/utils/mock-data';
import { mockSupabaseSuccess, mockSupabaseError } from '@/test/utils/supabase-mock';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useActivityLogs', () => ({
  useActivityLogs: () => ({
    logActivity: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock('@/lib/cache-manager-simplified', () => ({
  OptimisticUpdates: {
    addProperty: vi.fn(() => vi.fn()),
    updateProperty: vi.fn(() => vi.fn()),
    removeProperty: vi.fn(() => vi.fn()),
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', user_type: 'admin', is_active: true },
    session: { user: { id: 'user-123' }, access_token: 'mock-token' },
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
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

describe('usePropertiesOptimized', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetching Properties', () => {
    it('should fetch all properties successfully', async () => {
      const mockProperties = [
        mockProperty({ property_id: 'prop-1', property_name: 'Sunset Villa' }),
        mockProperty({ property_id: 'prop-2', property_name: 'Beach House' }),
        mockProperty({ property_id: 'prop-3', property_name: 'Mountain Cabin' }),
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockProperties)),
            }),
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.properties).toEqual(mockProperties);
      expect(result.current.properties.length).toBe(3);
    });

    it('should return empty array when no properties exist', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.properties).toEqual([]);
    });

    it('should handle fetch error gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch properties')),
            }),
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should fetch properties sorted by created_at descending', async () => {
      const mockProperties = [
        mockProperty({ property_id: 'prop-3', created_at: '2025-10-23' }),
        mockProperty({ property_id: 'prop-2', created_at: '2025-10-22' }),
        mockProperty({ property_id: 'prop-1', created_at: '2025-10-21' }),
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockProperties)),
            }),
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify newest property is first
      expect(result.current.properties[0].property_id).toBe('prop-3');
      expect(result.current.properties[1].property_id).toBe('prop-2');
      expect(result.current.properties[2].property_id).toBe('prop-1');
    });
  });

  describe('Amenities and Rules', () => {
    it('should fetch amenities successfully', async () => {
      const mockAmenities = [
        { amenity_id: 'am-1', amenity_name: 'WiFi', icon: 'wifi' },
        { amenity_id: 'am-2', amenity_name: 'Pool', icon: 'pool' },
        { amenity_id: 'am-3', amenity_name: 'Parking', icon: 'parking' },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockAmenities)),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.amenities).toEqual(mockAmenities);
      expect(result.current.amenities.length).toBe(3);
    });

    it('should fetch rules successfully', async () => {
      const mockRules = [
        { rule_id: 'rule-1', rule_name: 'No Smoking', description: 'Smoking not allowed' },
        { rule_id: 'rule-2', rule_name: 'No Pets', description: 'Pets not allowed' },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockRules)),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.rules).toEqual(mockRules);
      expect(result.current.rules.length).toBe(2);
    });
  });

  describe('Creating Properties', () => {
    it('should create property successfully', async () => {
      const newProperty = mockProperty({
        property_name: 'New Beach House',
        property_type: 'villa',
        owner_id: 'owner-123',
      });

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newProperty)),
        }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
            insert: insertMock,
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.createProperty({
        property_name: 'New Beach House',
        property_type: 'villa',
        owner_id: 'owner-123',
        is_active: true,
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(insertMock).toHaveBeenCalled();
    });

    it('should create property with location and amenities', async () => {
      const newProperty = mockProperty({
        property_id: 'prop-new',
        property_name: 'Luxury Villa',
      });

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newProperty)),
        }),
      });

      const locationInsertMock = vi.fn().mockResolvedValue(mockSupabaseSuccess(null));
      const amenitiesInsertMock = vi.fn().mockResolvedValue(mockSupabaseSuccess(null));

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
            insert: insertMock,
          };
        }
        if (table === 'property_location') {
          return { insert: locationInsertMock };
        }
        if (table === 'property_amenities') {
          return { insert: amenitiesInsertMock };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.createProperty({
        property_name: 'Luxury Villa',
        property_type: 'villa',
        owner_id: 'owner-123',
        is_active: true,
        location: {
          address: '123 Beach Road',
          city: 'Miami',
          state: 'FL',
          country: 'USA',
          zip_code: '33139',
        },
        amenity_ids: ['am-1', 'am-2', 'am-3'],
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(insertMock).toHaveBeenCalled();
    });

    it('should handle creation error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to create property')),
              }),
            }),
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.createProperty({
        property_name: 'Test Property',
        property_type: 'apartment',
        owner_id: 'owner-123',
        is_active: true,
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });
    });
  });

  describe('Updating Properties', () => {
    it('should update property successfully', async () => {
      const updatedProperty = mockProperty({
        property_id: 'prop-123',
        property_name: 'Updated Villa Name',
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedProperty)),
          }),
        }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockImplementation((columns?: string) => {
              // Detail fetch uses select with joins and needs eq
              if (columns && columns.includes('property_location')) {
                return {
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedProperty)),
                  }),
                };
              }
              // List query uses order
              return {
                order: vi.fn().mockResolvedValue(mockSupabaseSuccess([mockProperty({ property_id: 'prop-123' })])),
              };
            }),
            update: updateMock,
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateProperty('prop-123', {
        property_name: 'Updated Villa Name',
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(updateMock).toHaveBeenCalled();
    });

    it('should update property with related data', async () => {
      const updatedProperty = mockProperty({ property_id: 'prop-123' });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedProperty)),
          }),
        }),
      });

      const locationUpsertMock = vi.fn().mockResolvedValue(mockSupabaseSuccess(null));

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockImplementation((columns?: string) => {
              // Detail fetch uses select with joins and needs eq
              if (columns && columns.includes('property_location')) {
                return {
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedProperty)),
                  }),
                };
              }
              // List query uses order
              return {
                order: vi.fn().mockResolvedValue(mockSupabaseSuccess([mockProperty({ property_id: 'prop-123' })])),
              };
            }),
            update: updateMock,
          };
        }
        if (table === 'property_location') {
          return { upsert: locationUpsertMock };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateProperty('prop-123', {
        property_name: 'Updated Name',
        location: {
          address: '456 New Address',
          city: 'Los Angeles',
        },
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(updateMock).toHaveBeenCalled();
    });

    it('should handle update error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([mockProperty({ property_id: 'prop-123' })])),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to update property')),
                }),
              }),
            }),
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateProperty('prop-123', {
        property_name: 'Updated Name',
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });
  });

  describe('Deleting Properties', () => {
    it('should delete property successfully', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([mockProperty({ property_id: 'prop-123', property_name: 'To Delete' })])),
            }),
            delete: deleteMock,
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.deleteProperty('prop-123');

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(deleteMock).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('properties');
    });

    it('should handle delete error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([mockProperty({ property_id: 'prop-123' })])),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(mockSupabaseError('Failed to delete property')),
            }),
          };
        }
        if (table === 'amenities') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePropertiesOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.deleteProperty('prop-123');

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });
  });
});

describe('usePropertyDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch property detail with full data', async () => {
    const mockPropertyDetail = mockProperty({
      property_id: 'prop-123',
      property_name: 'Luxury Villa',
      location: { address: '123 Beach Road', city: 'Miami' },
      communication: { phone: '+1234567890' },
      access: { wifi_password: 'secret123' },
      extras: { parking_spaces: 2 },
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockPropertyDetail)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePropertyDetail('prop-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.property).toBeTruthy();
    expect(result.current.property?.property_id).toBe('prop-123');
    expect(result.current.property?.property_name).toBe('Luxury Villa');
  });

  it('should not fetch when propertyId is undefined', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePropertyDetail(undefined), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.property).toBeUndefined();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should handle property detail fetch error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseError('Property not found')),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePropertyDetail('invalid-id'), { wrapper });

    // Wait longer for error after retries (React Query retries 2 times by default)
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('should refetch property detail when refetch is called', async () => {
    const mockPropertyDetail = mockProperty({ property_id: 'prop-123' });

    const singleMock = vi.fn().mockResolvedValue(mockSupabaseSuccess(mockPropertyDetail));

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: singleMock,
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePropertyDetail('prop-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(singleMock).toHaveBeenCalledTimes(2);
    });
  });
});
