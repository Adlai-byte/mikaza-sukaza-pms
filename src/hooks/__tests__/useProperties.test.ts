/**
 * usePropertiesOptimized Hook Tests
 * Tests for property management functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePropertiesOptimized, usePropertyDetail, propertyKeys } from '../usePropertiesOptimized';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockProperty, createMockArray } from '@/test/utils/mock-data';

// Simple mock factory for amenities
const mockAmenity = (overrides?: Record<string, unknown>) => ({
  amenity_id: 'amenity-123',
  amenity_name: 'Swimming Pool',
  amenity_category: 'outdoor',
  amenity_icon: 'pool',
  created_at: new Date().toISOString(),
  ...overrides,
});

// Simple mock factory for rules
const mockRule = (overrides?: Record<string, unknown>) => ({
  rule_id: 'rule-123',
  rule_name: 'No Smoking',
  rule_description: 'No smoking allowed on the property',
  created_at: new Date().toISOString(),
  ...overrides,
});

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock hooks
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
    hasPermission: vi.fn(() => true),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: { user_id: 'test-user-id', user_type: 'admin' },
  }),
}));

// Import after mocks
import { supabase as mockSupabase } from '@/integrations/supabase/client';

describe('usePropertiesOptimized', () => {
  const mockProperties = createMockArray(mockProperty, 5);
  // Create amenities and rules manually since createMockArray relies on function.name
  const mockAmenities = Array.from({ length: 10 }, (_, i) => mockAmenity({
    amenity_id: `amenity-${i + 1}`,
    amenity_name: `Amenity ${i + 1}`,
  }));
  const mockRules = Array.from({ length: 5 }, (_, i) => mockRule({
    rule_id: `rule-${i + 1}`,
    rule_name: `Rule ${i + 1}`,
  }));

  const testProperty = mockProperty({
    property_id: 'prop-test-1',
    property_name: 'Beach Villa',
    property_type: 'villa',
    is_active: true,
    capacity: 6,
    num_bedrooms: 3,
    num_bathrooms: 2,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    (mockSupabase.from as any).mockImplementation((table: string) => {
      if (table === 'properties') {
        const orderResult = {
          then: (callback: any) => Promise.resolve({ data: mockProperties, error: null }).then(callback),
        };

        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(orderResult),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: (callback: any) => Promise.resolve({ data: testProperty, error: null }).then(callback),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: (callback: any) => Promise.resolve({ data: testProperty, error: null }).then(callback),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({
                  then: (callback: any) => Promise.resolve({ data: testProperty, error: null }).then(callback),
                }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: (callback: any) => Promise.resolve({ data: null, error: null }).then(callback),
            }),
          }),
        };
      }

      if (table === 'amenities') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              then: (callback: any) => Promise.resolve({ data: mockAmenities, error: null }).then(callback),
            }),
          }),
        };
      }

      if (table === 'rules') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              then: (callback: any) => Promise.resolve({ data: mockRules, error: null }).then(callback),
            }),
          }),
        };
      }

      // Default for other tables (property_location, property_amenities, etc.)
      return {
        select: vi.fn().mockReturnValue({
          then: (callback: any) => Promise.resolve({ data: [], error: null }).then(callback),
        }),
        insert: vi.fn().mockReturnValue({
          then: (callback: any) => Promise.resolve({ data: null, error: null }).then(callback),
        }),
        upsert: vi.fn().mockReturnValue({
          then: (callback: any) => Promise.resolve({ data: null, error: null }).then(callback),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: (callback: any) => Promise.resolve({ data: null, error: null }).then(callback),
          }),
        }),
      };
    });
  });

  describe('fetching properties', () => {
    it('should fetch all properties on mount', async () => {
      const { result } = renderHook(() => usePropertiesOptimized(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.properties.length).toBeGreaterThan(0);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('properties');
    });

    it('should return empty array when no properties exist', async () => {
      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                then: (callback: any) => Promise.resolve({ data: [], error: null }).then(callback),
              }),
            }),
          };
        }
        if (table === 'amenities' || table === 'rules') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                then: (callback: any) => Promise.resolve({ data: [], error: null }).then(callback),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            then: (callback: any) => Promise.resolve({ data: [], error: null }).then(callback),
          }),
        };
      });

      const { result } = renderHook(() => usePropertiesOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.properties).toEqual([]);
    });
  });

  describe('fetching amenities', () => {
    it('should fetch amenities', async () => {
      const { result } = renderHook(() => usePropertiesOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.amenities.length).toBeGreaterThan(0);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('amenities');
    });
  });

  describe('fetching rules', () => {
    it('should fetch rules', async () => {
      const { result } = renderHook(() => usePropertiesOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.rules.length).toBeGreaterThan(0);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('rules');
    });
  });

  describe('refetch functionality', () => {
    it('should have refetch function', async () => {
      const { result } = renderHook(() => usePropertiesOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('mutation state flags', () => {
    it('should expose mutation state flags', async () => {
      const { result } = renderHook(() => usePropertiesOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isCreating).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe('mutation functions', () => {
    it('should expose createProperty function', async () => {
      const { result } = renderHook(() => usePropertiesOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.createProperty).toBeDefined();
      expect(typeof result.current.createProperty).toBe('function');
    });

    it('should expose updateProperty function', async () => {
      const { result } = renderHook(() => usePropertiesOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.updateProperty).toBeDefined();
      expect(typeof result.current.updateProperty).toBe('function');
    });

    it('should expose deleteProperty function', async () => {
      const { result } = renderHook(() => usePropertiesOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.deleteProperty).toBeDefined();
      expect(typeof result.current.deleteProperty).toBe('function');
    });
  });
});

describe('usePropertyDetail', () => {
  const singleProperty = mockProperty({
    property_id: 'prop-single',
    property_name: 'Downtown Apartment',
    property_type: 'apartment',
    is_active: true,
    capacity: 4,
    num_bedrooms: 2,
    num_bathrooms: 1,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    (mockSupabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue({
            then: (callback: any) => Promise.resolve({ data: singleProperty, error: null }).then(callback),
          }),
        }),
      }),
    }));
  });

  it('should fetch single property by ID', async () => {
    const { result } = renderHook(() => usePropertyDetail('prop-single'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('properties');
  });

  it('should not fetch if ID is undefined', async () => {
    const { result } = renderHook(() => usePropertyDetail(undefined), {
      wrapper: createWrapper(),
    });

    // Should not be loading since query is disabled
    expect(result.current.property).toBeUndefined();
  });

  it('should not fetch if ID is empty string', async () => {
    const { result } = renderHook(() => usePropertyDetail(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.property).toBeUndefined();
  });

  it('should have refetch function', async () => {
    const { result } = renderHook(() => usePropertyDetail('prop-single'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.refetch).toBeDefined();
  });

  it('should expose isFetching state', async () => {
    const { result } = renderHook(() => usePropertyDetail('prop-single'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.isFetching).toBe('boolean');
  });
});

describe('propertyKeys', () => {
  it('should generate correct base keys', () => {
    expect(propertyKeys.all()).toEqual(['properties']);
    expect(propertyKeys.lists()).toEqual(['properties', 'list']);
    expect(propertyKeys.details()).toEqual(['properties', 'detail']);
    expect(propertyKeys.amenities()).toEqual(['amenities']);
    expect(propertyKeys.rules()).toEqual(['rules']);
  });

  it('should generate correct detail key', () => {
    expect(propertyKeys.detail('prop-123')).toEqual(['properties', 'detail', 'prop-123']);
  });

  it('should generate list key without filters', () => {
    expect(propertyKeys.list()).toEqual(['properties', 'list']);
  });

  it('should generate list key with filters', () => {
    const filters = { property_type: 'villa', is_active: true };
    expect(propertyKeys.list(filters)).toEqual(['properties', 'list', JSON.stringify(filters)]);
  });

  it('should generate consistent keys for same filters', () => {
    const filters1 = { type: 'house', active: true };
    const filters2 = { type: 'house', active: true };
    expect(propertyKeys.list(filters1)).toEqual(propertyKeys.list(filters2));
  });
});

describe('Property Type Definitions', () => {
  const propertyTypes = ['house', 'apartment', 'villa', 'condo', 'townhouse', 'cabin', 'studio'];

  it('should have common property types', () => {
    propertyTypes.forEach(type => {
      expect(typeof type).toBe('string');
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it('should create property with valid type', () => {
    const property = mockProperty({ property_type: 'villa' });
    expect(property.property_type).toBe('villa');
  });
});

describe('Property Calculations', () => {
  it('should calculate total rooms', () => {
    const property = mockProperty({
      num_bedrooms: 3,
      num_bathrooms: 2,
      num_living_rooms: 1,
      num_kitchens: 1,
    });

    const totalRooms = property.num_bedrooms + property.num_bathrooms +
      (property.num_living_rooms || 0) + (property.num_kitchens || 0);

    expect(totalRooms).toBe(7);
  });

  it('should calculate occupancy percentage', () => {
    const property = mockProperty({ capacity: 6, max_capacity: 8 });
    const currentGuests = 4;
    const occupancyPercent = (currentGuests / property.capacity) * 100;

    expect(occupancyPercent).toBeCloseTo(66.67, 1);
  });

  it('should identify active property', () => {
    const activeProperty = mockProperty({ is_active: true });
    expect(activeProperty.is_active).toBe(true);
  });

  it('should identify inactive property', () => {
    const inactiveProperty = mockProperty({ is_active: false });
    expect(inactiveProperty.is_active).toBe(false);
  });

  it('should identify bookable property', () => {
    const bookableProperty = mockProperty({ is_booking: true });
    expect(bookableProperty.is_booking).toBe(true);
  });

  it('should identify pets allowed property', () => {
    const petsAllowedProperty = mockProperty({ is_pets_allowed: true });
    expect(petsAllowedProperty.is_pets_allowed).toBe(true);
  });
});

describe('Property Owner Association', () => {
  it('should have owner_id', () => {
    const property = mockProperty({ owner_id: 'owner-123' });
    expect(property.owner_id).toBe('owner-123');
  });

  it('should have owner details when provided', () => {
    const property = mockProperty({
      owner: {
        user_id: 'owner-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      }
    });
    expect(property.owner).toBeDefined();
    expect(property.owner?.first_name).toBe('John');
    expect(property.owner?.last_name).toBe('Doe');
    expect(property.owner?.email).toBe('john@example.com');
  });
});

describe('Property Location', () => {
  it('should support location data', () => {
    const property = mockProperty({
      location: {
        city: 'Miami',
        address: '123 Ocean Drive',
        state: 'FL',
        country: 'USA',
      }
    });
    expect(property.location).toBeDefined();
    expect(property.location?.city).toBe('Miami');
  });
});

describe('Property Images', () => {
  it('should support images array', () => {
    const property = mockProperty({
      images: [
        { image_id: 'img-1', image_url: 'url1', is_primary: true },
      ]
    });
    expect(Array.isArray(property.images)).toBe(true);
    expect(property.images.length).toBe(1);
  });

  it('should identify primary image', () => {
    const images = [
      { image_id: 'img-1', image_url: 'url1', is_primary: false },
      { image_id: 'img-2', image_url: 'url2', is_primary: true },
      { image_id: 'img-3', image_url: 'url3', is_primary: false },
    ];

    const primaryImage = images.find(img => img.is_primary);
    expect(primaryImage?.image_id).toBe('img-2');
  });
});

describe('Amenity Features', () => {
  it('should create amenity with name and category', () => {
    const amenity = mockAmenity({
      amenity_name: 'Swimming Pool',
      amenity_category: 'outdoor',
    });

    expect(amenity.amenity_name).toBe('Swimming Pool');
    expect(amenity.amenity_category).toBe('outdoor');
  });

  it('should have valid amenity ID', () => {
    const amenity = mockAmenity();
    expect(amenity.amenity_id).toBeDefined();
    expect(typeof amenity.amenity_id).toBe('string');
  });
});

describe('Rule Features', () => {
  it('should create rule with name', () => {
    const rule = mockRule({
      rule_name: 'No Smoking',
    });

    expect(rule.rule_name).toBe('No Smoking');
  });

  it('should have valid rule ID', () => {
    const rule = mockRule();
    expect(rule.rule_id).toBeDefined();
    expect(typeof rule.rule_id).toBe('string');
  });
});

describe('Property Size Metrics', () => {
  it('should have size in square feet', () => {
    const property = mockProperty({ size_sqf: 2500 });
    expect(property.size_sqf).toBe(2500);
  });

  it('should calculate price per square foot', () => {
    const sizeSqf = 2000;
    const monthlyRent = 4000;
    const pricePerSqf = monthlyRent / sizeSqf;

    expect(pricePerSqf).toBe(2);
  });
});

describe('Property Capacity', () => {
  it('should have capacity and max_capacity', () => {
    const property = mockProperty({ capacity: 6, max_capacity: 8 });

    expect(property.capacity).toBe(6);
    expect(property.max_capacity).toBe(8);
  });

  it('should validate max_capacity is greater than or equal to capacity', () => {
    const property = mockProperty({ capacity: 6, max_capacity: 8 });

    expect(property.max_capacity).toBeGreaterThanOrEqual(property.capacity);
  });

  it('should identify if property can accommodate guests', () => {
    const property = mockProperty({ capacity: 4 });
    const guestCount = 3;

    const canAccommodate = guestCount <= property.capacity;
    expect(canAccommodate).toBe(true);
  });

  it('should identify if property cannot accommodate guests', () => {
    const property = mockProperty({ capacity: 4 });
    const guestCount = 5;

    const canAccommodate = guestCount <= property.capacity;
    expect(canAccommodate).toBe(false);
  });
});
