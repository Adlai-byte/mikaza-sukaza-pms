/**
 * MODERN PROPERTY MANAGEMENT CALENDAR
 *
 * Design Philosophy:
 * - Timeline-first approach: Horizontal booking bars for intuitive date management
 * - Revenue-focused: Dashboard shows financial metrics upfront
 * - Channel-aware: Track booking sources (Airbnb, Booking.com, Direct, etc.)
 * - Interaction-rich: Drag to create, resize to adjust, right-click for context
 * - Accessibility-compliant: Full keyboard navigation, ARIA labels, screen readers
 *
 * Industry Standards (Guesty, Hostaway, Hospitable, Lodgify):
 * - Properties on left (200-250px), timeline on right
 * - Color-coded booking bars: Confirmed (Blue), Pending (Yellow), Blocked (Gray)
 * - Check-in/out markers on booking edges
 * - Hover shows booking details
 * - Stats dashboard: Revenue, Occupancy %, Bookings, Available units
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calendar as CalendarIcon,
  Search,
  Edit,
  Building,
  Filter,
  RefreshCw,
  Download,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  X,
  MapPin,
  Home,
  Users,
  Bed,
  Bath,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Trash2,
  Info,
  Ban,
  FileDown,
  DollarSign,
  TrendingUp,
  Percent,
  CalendarDays,
  LayoutGrid,
  LayoutList,
  Maximize2,
  Menu,
  Package,
  Layers,
  History,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addDays,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { Tables } from '@/integrations/supabase/types';
import { BookingDialogEnhanced } from '@/components/BookingDialogEnhanced';
import { BookingInsert } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { bookingKeys, CreateBookingParams } from '@/hooks/useBookings';
import { createTasksFromBooking } from '@/hooks/useBookingTasks';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarSyncDialog } from '@/components/calendar/CalendarSyncDialog';
import { PropertyTransactionsDrawer } from '@/components/calendar/PropertyTransactionsDrawer';
import { formatStreetWithUnit } from '@/lib/address-utils';

/**
 * Helper to get location data from property
 * Handles both array format (one-to-many) and object format (one-to-one relationship)
 */
const getPropertyLocation = (property: any): { address?: string; city?: string; state?: string } | null => {
  // Check property_location (the relation) - could be array or object
  const propLoc = property?.property_location;
  if (propLoc) {
    // If it's an array, get first element
    if (Array.isArray(propLoc) && propLoc.length > 0) {
      return propLoc[0];
    }
    // If it's an object with city or address, return it directly
    if (typeof propLoc === 'object' && (propLoc.city || propLoc.address)) {
      return propLoc;
    }
  }

  // Fallback: check location field (aliased or direct JSONB)
  const loc = property?.location;
  if (loc) {
    if (Array.isArray(loc) && loc.length > 0) {
      return loc[0];
    }
    if (typeof loc === 'object' && (loc.city || loc.address)) {
      return loc;
    }
  }

  return null;
};

/**
 * Helper to format full location string
 */
const formatPropertyLocation = (property: any): string => {
  const loc = getPropertyLocation(property);
  if (!loc) return '';
  return [loc.address, loc.city].filter(Boolean).join(', ');
};

type Property = Tables<'properties'>;
type PropertyBooking = Tables<'property_bookings'>;

/**
 * DESIGN SYSTEM: Color coding for booking statuses
 * Following industry standards (Guesty, Hostaway, Lodgify)
 */
const BOOKING_COLORS = {
  confirmed: {
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-600',
    hover: 'hover:bg-blue-600',
    light: 'bg-blue-100',
  },
  pending: {
    bg: 'bg-yellow-500',
    text: 'text-gray-900',
    border: 'border-yellow-600',
    hover: 'hover:bg-yellow-600',
    light: 'bg-yellow-100',
  },
  blocked: {
    bg: 'bg-gray-400',
    text: 'text-white',
    border: 'border-gray-500',
    hover: 'hover:bg-gray-500',
    light: 'bg-gray-100',
  },
  checked_in: {
    bg: 'bg-green-500',
    text: 'text-white',
    border: 'border-green-600',
    hover: 'hover:bg-green-600',
    light: 'bg-green-100',
  },
  completed: {
    bg: 'bg-purple-500',
    text: 'text-white',
    border: 'border-purple-600',
    hover: 'hover:bg-purple-600',
    light: 'bg-purple-100',
  },
  cancelled: {
    bg: 'bg-red-400',
    text: 'text-white',
    border: 'border-red-500',
    hover: 'hover:bg-red-500',
    light: 'bg-red-100',
  },
} as const;

/**
 * DESIGN SYSTEM: Booking channel sources
 * Common OTA (Online Travel Agency) platforms
 */
const BOOKING_CHANNELS = [
  { id: 'airbnb', name: 'Airbnb', color: 'bg-pink-500', icon: '🏠' },
  { id: 'booking', name: 'Booking.com', color: 'bg-blue-600', icon: '🏨' },
  { id: 'vrbo', name: 'VRBO', color: 'bg-blue-500', icon: '🏖️' },
  { id: 'direct', name: 'Direct', color: 'bg-green-600', icon: '📞' },
  { id: 'expedia', name: 'Expedia', color: 'bg-yellow-500', icon: '✈️' },
  { id: 'other', name: 'Other', color: 'bg-gray-500', icon: '📋' },
] as const;

interface FilterState {
  startDate: Date;
  minCapacity: string;
  minRooms: string;
  minBathrooms: string;
  propertyType: string;
  city: string;
  amenities: string[];
  bookingStatus: string;
  channel: string;
  showOnlyWithBookings: boolean;
}

interface CalendarViewMode {
  type: 'timeline' | 'month' | 'list';
  dateRange: 'week' | 'month' | 'quarter' | 'year';
}

/**
 * MAIN CALENDAR COMPONENT
 * Production-ready with error handling, loading states, and accessibility
 */
const Calendar = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // State: Filters and View Configuration
  const [filters, setFilters] = useState<FilterState>({
    startDate: new Date(),
    minCapacity: 'all',
    minRooms: 'all',
    minBathrooms: 'all',
    propertyType: 'all',
    city: 'all',
    amenities: [],
    bookingStatus: 'all',
    channel: 'all',
    showOnlyWithBookings: true,
  });

  const [viewMode, setViewMode] = useState<CalendarViewMode>({
    type: 'timeline',
    dateRange: 'month',
  });

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  // State: Booking Operations
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingPropertyId, setBookingPropertyId] = useState<string | null>(null);
  const [bookingCheckIn, setBookingCheckIn] = useState<string>('');
  const [bookingCheckOut, setBookingCheckOut] = useState<string>('');
  const [editingBooking, setEditingBooking] = useState<PropertyBooking | null>(null);

  // State: Dialog Management
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState<PropertyBooking | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<PropertyBooking | null>(null);

  // State: Block Dates
  const [showBlockDatesDialog, setShowBlockDatesDialog] = useState(false);
  const [blockPropertyId, setBlockPropertyId] = useState<string | null>(null);
  const [blockStartDate, setBlockStartDate] = useState<string>('');
  const [blockEndDate, setBlockEndDate] = useState<string>('');
  const [blockReason, setBlockReason] = useState<string>('');

  // State: Bulk Operations
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  // State: Calendar Sync Dialog
  const [showCalendarSyncDialog, setShowCalendarSyncDialog] = useState(false);

  // State: Property Transactions Drawer
  const [showTransactionsDrawer, setShowTransactionsDrawer] = useState(false);
  const [transactionsPropertyId, setTransactionsPropertyId] = useState<string | null>(null);
  const [transactionsPropertyName, setTransactionsPropertyName] = useState<string>('');

  // State: Drag-to-Create Booking
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ propertyId: string; date: Date } | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);

  // State: Expanded Properties (for multi-unit view)
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());

  /**
   * FEATURE: Generate date range based on view mode
   * Supports: week, month, quarter, year views
   */
  const dateRange = useMemo(() => {
    const start = startOfMonth(filters.startDate);
    let months = 1;

    switch (viewMode.dateRange) {
      case 'week':
        return eachDayOfInterval({
          start: startOfWeek(filters.startDate),
          end: endOfWeek(filters.startDate),
        });
      case 'month':
        months = 1;
        break;
      case 'quarter':
        months = 3;
        break;
      case 'year':
        months = 12;
        break;
    }

    const end = endOfMonth(addMonths(start, months - 1));
    return eachDayOfInterval({ start, end });
  }, [filters.startDate, viewMode.dateRange]);

  /**
   * DATA: Fetch properties with location and amenities
   * Cached for 5 minutes (properties don't change often)
   */
  const { data: properties = [], isLoading: propertiesLoading, error: propertiesError } = useQuery({
    queryKey: ['properties-with-location-units'],
    queryFn: async () => {
      console.log('🔍 Fetching properties from Supabase...');
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_location (
            city,
            state,
            address
          ),
          property_amenities (
            amenity_id,
            amenities (
              amenity_name
            )
          ),
          units (
            unit_id,
            property_name,
            owner_id
          )
        `)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Properties fetch error:', error);
        throw error;
      }
      console.log('✅ Properties fetched successfully:', data?.length, 'properties');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  /**
   * DATA: Fetch bookings for date range
   * Cached for 2 minutes (bookings are more dynamic)
   */
  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError } = useQuery({
    queryKey: ['bookings', filters.startDate, viewMode.dateRange],
    queryFn: async () => {
      const startDate = format(dateRange[0], 'yyyy-MM-dd');
      const endDate = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd');

      console.log('🔍 Fetching bookings from', startDate, 'to', endDate);
      // Fetch bookings that overlap with the date range
      // A booking overlaps if: check_in_date <= endDate AND check_out_date >= startDate
      const { data, error } = await supabase
        .from('property_bookings')
        .select(`
          *,
          unit:units!property_bookings_unit_id_fkey(
            unit_id,
            property_name
          )
        `)
        .lte('check_in_date', endDate)
        .gte('check_out_date', startDate);

      if (error) {
        console.error('❌ Bookings fetch error:', error);
        throw error;
      }
      console.log('✅ Bookings fetched successfully:', data?.length, 'bookings');
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  /**
   * DATA: Fetch amenities for filters
   * Cached for 30 minutes (amenities rarely change)
   */
  const { data: availableAmenities = [] } = useQuery({
    queryKey: ['amenities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .order('amenity_name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  /**
   * COMPUTED: Filter properties based on active filters
   */
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      if (filters.minCapacity !== 'all' && property.capacity && property.capacity < parseInt(filters.minCapacity)) {
        return false;
      }
      if (filters.minRooms !== 'all' && property.num_bedrooms && property.num_bedrooms < parseInt(filters.minRooms)) {
        return false;
      }
      if (filters.minBathrooms !== 'all' && property.num_bathrooms && property.num_bathrooms < parseInt(filters.minBathrooms)) {
        return false;
      }
      if (filters.propertyType !== 'all' && property.property_type !== filters.propertyType) {
        return false;
      }
      if (filters.city !== 'all') {
        const loc = getPropertyLocation(property);
        if (!loc?.city || loc.city !== filters.city) {
          return false;
        }
      }
      if (filters.amenities.length > 0) {
        const propertyAmenities = property.property_amenities?.map(pa => pa.amenities?.amenity_name) || [];
        const hasRequiredAmenities = filters.amenities.every(amenity =>
          propertyAmenities.includes(amenity)
        );
        if (!hasRequiredAmenities) {
          return false;
        }
      }
      // Filter to show only properties with bookings in the current date range
      if (filters.showOnlyWithBookings) {
        const propertyHasBookings = bookings.some(booking =>
          booking.property_id === property.property_id &&
          booking.booking_status !== 'cancelled'
        );
        if (!propertyHasBookings) {
          return false;
        }
      }
      return true;
    });
  }, [properties, filters, bookings]);

  /**
   * COMPUTED: Calculate dashboard statistics
   * Revenue, Occupancy %, Total Bookings, Available Units
   */
  const dashboardStats = useMemo(() => {
    const totalRevenue = bookings
      .filter(b => b.booking_status !== 'cancelled')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const confirmedBookings = bookings.filter(b =>
      b.booking_status === 'confirmed' || b.booking_status === 'checked_in'
    ).length;

    const totalPropertyDays = filteredProperties.length * dateRange.length;
    const bookedDays = bookings.filter(b => b.booking_status !== 'cancelled').reduce((sum, booking) => {
      const checkIn = parseISO(booking.check_in_date);
      const checkOut = parseISO(booking.check_out_date);
      return sum + differenceInDays(checkOut, checkIn);
    }, 0);

    const occupancyRate = totalPropertyDays > 0 ? (bookedDays / totalPropertyDays) * 100 : 0;

    const availableUnits = filteredProperties.filter(property => {
      const hasBooking = bookings.some(b =>
        b.property_id === property.property_id &&
        b.booking_status !== 'cancelled'
      );
      return !hasBooking;
    }).length;

    return {
      totalRevenue,
      occupancyRate: Math.round(occupancyRate),
      totalBookings: bookings.filter(b => b.booking_status !== 'cancelled').length,
      availableUnits,
      confirmedBookings,
    };
  }, [bookings, filteredProperties, dateRange]);

  /**
   * UTILITY: Get booking for a specific property and date
   * For property-level rows: shows "entire property" bookings (unit_id = null)
   * For unit-level rows: shows specific unit bookings
   */
  const getBookingForDate = (propertyId: string, date: Date, unitId?: string | null) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.find(b => {
      const dateMatch =
        b.property_id === propertyId &&
        dateStr >= b.check_in_date &&
        dateStr <= b.check_out_date;

      if (!dateMatch) return false;

      // If querying for a specific unit
      if (unitId !== undefined) {
        // Show bookings for this specific unit OR entire-property bookings
        return b.unit_id === unitId || b.unit_id === null;
      }

      // Property-level row: show only entire-property bookings (unit_id = null)
      return b.unit_id === null;
    });
  };

  /**
   * UTILITY: Get bookings for a specific unit on a date
   * Returns only unit-specific bookings, not entire-property bookings
   */
  const getUnitBookingForDate = (propertyId: string, unitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.find(b =>
      b.property_id === propertyId &&
      (b.unit_id === unitId || b.unit_id === null) &&
      dateStr >= b.check_in_date &&
      dateStr <= b.check_out_date
    );
  };

  /**
   * UTILITY: Toggle property expansion (for multi-unit properties)
   */
  const togglePropertyExpansion = (propertyId: string) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });
  };

  /**
   * UTILITY: Get booking status color
   */
  const getBookingColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'pending';
    return BOOKING_COLORS[normalizedStatus as keyof typeof BOOKING_COLORS] || BOOKING_COLORS.pending;
  };

  /**
   * UTILITY: Get unique cities for filter dropdown
   */
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    properties.forEach(property => {
      const loc = getPropertyLocation(property);
      if (loc?.city) citySet.add(loc.city);
    });
    return Array.from(citySet).sort();
  }, [properties]);

  /**
   * UTILITY: Get unique property types for filter dropdown
   */
  const propertyTypes = useMemo(() => {
    const typeSet = new Set<string>();
    properties.forEach(property => {
      if (property.property_type) typeSet.add(property.property_type);
    });
    return Array.from(typeSet).sort();
  }, [properties]);

  /**
   * HANDLER: Toggle amenity filter
   */
  const handleAmenityToggle = (amenityName: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityName)
        ? prev.amenities.filter(a => a !== amenityName)
        : [...prev.amenities, amenityName]
    }));
  };

  /**
   * HANDLER: Clear all filters
   */
  const clearAllFilters = () => {
    setFilters({
      startDate: new Date(),
      minCapacity: 'all',
      minRooms: 'all',
      minBathrooms: 'all',
      propertyType: 'all',
      city: 'all',
      amenities: [],
      bookingStatus: 'all',
      channel: 'all',
      showOnlyWithBookings: true,
    });
  };

  /**
   * HANDLER: Remove individual filter chip
   */
  const removeFilter = (filterType: keyof FilterState) => {
    if (filterType === 'amenities') {
      setFilters(prev => ({ ...prev, amenities: [] }));
    } else {
      setFilters(prev => ({ ...prev, [filterType]: 'all' }));
    }
  };

  /**
   * HANDLER: Open booking dialog for date
   */
  const handleDateClick = (propertyId: string, date: Date, booking?: PropertyBooking) => {
    console.log('📅 Date clicked:', {
      propertyId,
      date: format(date, 'yyyy-MM-dd'),
      hasBooking: !!booking,
      booking: booking ? { id: booking.booking_id, guest: booking.guest_name } : null
    });

    if (booking) {
      console.log('✏️ Opening dialog to edit booking');
      setEditingBooking(booking);
      setBookingPropertyId(propertyId);
      setShowBookingDialog(true);
    } else {
      console.log('➕ Opening dialog to create new booking');
      setEditingBooking(null);
      setBookingPropertyId(propertyId);
      setBookingCheckIn(format(date, 'yyyy-MM-dd'));
      setBookingCheckOut(format(addDays(date, 1), 'yyyy-MM-dd'));
      setShowBookingDialog(true);
    }

    console.log('🎭 Dialog state set to:', true);
  };

  /**
   * HANDLER: Submit booking (create or update)
   */
  const handleBookingSubmit = async (bookingData: CreateBookingParams) => {
    console.log('📅 Calendar handleBookingSubmit called with:', bookingData);
    try {
      // Extract jobConfigs and customTasks before database insert (not database columns)
      const { jobConfigs, customTasks, ...dbBookingData } = bookingData;
      console.log('📅 Extracted data:', { jobConfigs, customTasks, dbBookingData });

      if (editingBooking) {
        const { data, error } = await supabase
          .from('property_bookings')
          .update(dbBookingData)
          .eq('booking_id', editingBooking.booking_id)
          .select()
          .single();

        if (error) throw error;

        // Create tasks from job configs or custom tasks if provided (for editing)
        const hasJobs = jobConfigs && jobConfigs.length > 0;
        const hasCustomTasks = customTasks && customTasks.length > 0;

        if (data && (hasJobs || hasCustomTasks) && user?.id) {
          try {
            await createTasksFromBooking(
              data.booking_id,
              data.property_id,
              data.check_in_date,
              data.check_out_date,
              jobConfigs || [],
              user.id,
              data.guest_name || undefined,
              customTasks
            );
          } catch (taskError) {
            console.error('Failed to create booking tasks:', taskError);
            toast({
              title: t('common.warning', 'Warning'),
              description: t('calendar.tasksCreationFailed', 'Booking updated but failed to generate tasks'),
              variant: 'destructive',
            });
          }
        }

        toast({
          title: t('common.success'),
          description: t('notifications.success.updated'),
        });
      } else {
        const { data, error } = await supabase
          .from('property_bookings')
          .insert([dbBookingData])
          .select()
          .single();

        if (error) throw error;

        // Create tasks from job configs or custom tasks if provided
        const hasJobs = jobConfigs && jobConfigs.length > 0;
        const hasCustomTasks = customTasks && customTasks.length > 0;

        if (data && (hasJobs || hasCustomTasks) && user?.id) {
          try {
            await createTasksFromBooking(
              data.booking_id,
              data.property_id,
              data.check_in_date,
              data.check_out_date,
              jobConfigs || [],
              user.id,
              data.guest_name || undefined,
              customTasks
            );
          } catch (taskError) {
            console.error('Failed to create booking tasks:', taskError);
            // Show warning but don't fail the booking
            toast({
              title: t('common.warning', 'Warning'),
              description: t('calendar.tasksCreationFailed', 'Booking created but failed to generate tasks'),
              variant: 'destructive',
            });
          }
        }

        toast({
          title: t('common.success'),
          description: t('notifications.success.created'),
        });
      }

      setShowBookingDialog(false);
      setBookingPropertyId(null);
      setBookingCheckIn('');
      setBookingCheckOut('');
      setEditingBooking(null);

      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: bookingKeys.property(bookingData.property_id) });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t(editingBooking ? 'notifications.error.updateFailed' : 'notifications.error.createFailed'),
        variant: 'destructive',
      });
    }
  };

  /**
   * HANDLER: Delete booking (soft delete by setting status to cancelled)
   */
  const handleDeleteBooking = async () => {
    if (!deletingBooking) return;

    try {
      // Soft delete: Update status to cancelled instead of hard deleting
      const { error } = await supabase
        .from('property_bookings')
        .update({ booking_status: 'cancelled' })
        .eq('booking_id', deletingBooking.booking_id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: 'Booking cancelled successfully',
      });

      setShowDeleteDialog(false);
      setDeletingBooking(null);
      setShowDetailsDrawer(false);
      setSelectedBookingDetails(null);

      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to cancel booking. Please try again.',
        variant: 'destructive',
      });
    }
  };

  /**
   * HANDLER: Block dates for maintenance
   */
  const handleBlockDates = async () => {
    if (!blockStartDate || !blockEndDate) {
      toast({
        title: t('common.error'),
        description: t('validation.required'),
        variant: 'destructive',
      });
      return;
    }

    if (new Date(blockEndDate) <= new Date(blockStartDate)) {
      toast({
        title: t('common.error'),
        description: t('validation.startDateBeforeEnd'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const propertiesToBlock = selectedProperties.size > 0
        ? Array.from(selectedProperties)
        : blockPropertyId
        ? [blockPropertyId]
        : [];

      if (propertiesToBlock.length === 0) {
        toast({
          title: t('common.error'),
          description: 'No properties selected',
          variant: 'destructive',
        });
        return;
      }

      const blockings = propertiesToBlock.map(propertyId => ({
        property_id: propertyId,
        check_in_date: blockStartDate,
        check_out_date: blockEndDate,
        guest_name: 'BLOCKED - Maintenance',
        booking_status: 'blocked',
        special_requests: blockReason || 'Property blocked for maintenance',
        total_amount: 0,
      }));

      const { data, error } = await supabase
        .from('property_bookings')
        .insert(blockings)
        .select();

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: `Dates blocked for ${propertiesToBlock.length} propert${propertiesToBlock.length === 1 ? 'y' : 'ies'}`,
      });

      setShowBlockDatesDialog(false);
      setBlockPropertyId(null);
      setBlockStartDate('');
      setBlockEndDate('');
      setBlockReason('');
      setSelectedProperties(new Set());

      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to block dates',
        variant: 'destructive',
      });
    }
  };

  /**
   * HANDLER: Export calendar to CSV
   */
  const exportToCSV = () => {
    try {
      const headers = ['Property', 'Guest Name', 'Check In', 'Check Out', 'Status', 'Total Amount', 'Payment Status', 'Channel'];

      const rows = bookings.map(booking => {
        const property = properties.find(p => p.property_id === booking.property_id);
        return [
          property?.property_name || 'N/A',
          booking.guest_name,
          booking.check_in_date,
          booking.check_out_date,
          booking.booking_status,
          booking.total_amount || 'N/A',
          booking.payment_status || 'N/A',
          booking.booking_channel || 'Direct',
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `calendar_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: t('common.success'),
        description: t('calendar.calendarExported'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to export calendar',
        variant: 'destructive',
      });
    }
  };

  /**
   * HANDLER: Toggle property selection for bulk operations
   */
  const togglePropertySelection = (propertyId: string) => {
    const newSelection = new Set(selectedProperties);
    if (newSelection.has(propertyId)) {
      newSelection.delete(propertyId);
    } else {
      newSelection.add(propertyId);
    }
    setSelectedProperties(newSelection);
  };

  /**
   * HANDLER: Navigate to previous period
   */
  const goToPreviousPeriod = () => {
    const monthsToSubtract = viewMode.dateRange === 'week' ? 0 :
                             viewMode.dateRange === 'month' ? 1 :
                             viewMode.dateRange === 'quarter' ? 3 : 12;

    if (viewMode.dateRange === 'week') {
      setFilters(prev => ({ ...prev, startDate: addDays(prev.startDate, -7) }));
    } else {
      setFilters(prev => ({ ...prev, startDate: addMonths(prev.startDate, -monthsToSubtract) }));
    }
  };

  /**
   * HANDLER: Navigate to next period
   */
  const goToNextPeriod = () => {
    const monthsToAdd = viewMode.dateRange === 'week' ? 0 :
                        viewMode.dateRange === 'month' ? 1 :
                        viewMode.dateRange === 'quarter' ? 3 : 12;

    if (viewMode.dateRange === 'week') {
      setFilters(prev => ({ ...prev, startDate: addDays(prev.startDate, 7) }));
    } else {
      setFilters(prev => ({ ...prev, startDate: addMonths(prev.startDate, monthsToAdd) }));
    }
  };

  /**
   * ERROR HANDLING: Show error state if database errors occur
   */
  if (propertiesError || bookingsError) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">{t('calendar.title')}</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h3 className="text-red-800 font-semibold text-lg">{t('calendar.databaseError')}</h3>
          </div>
          <p className="text-red-700 mt-2">
            {propertiesError ? `Properties: ${propertiesError.message}` : ''}
            {bookingsError ? `Bookings: ${bookingsError.message}` : ''}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('calendar.retryConnection')}
          </Button>
        </div>
      </div>
    );
  }

  /**
   * LOADING STATE: Professional skeleton loader
   */
  if (propertiesLoading || bookingsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="h-10 bg-gray-200 rounded w-64"></div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 rounded w-24"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
            </div>
          </div>

          {/* Dashboard Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Calendar Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="h-96 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /**
   * MAIN RENDER
   * Modern, professional property management calendar interface
   */
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 h-full">

        {/* ========================================
            HEADER: Title, Stats, Actions (Fixed - no horizontal scroll)
            ======================================== */}
        <div className="flex-shrink-0">
          <PageHeader
            title={t('calendar.title')}
            subtitle={t('calendar.subtitle')}
            icon={CalendarIcon}
            actions={
              <>
                <Button
                  variant={bulkSelectMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setBulkSelectMode(!bulkSelectMode);
                    if (bulkSelectMode) setSelectedProperties(new Set());
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {bulkSelectMode ? t('calendar.exitBulkMode') : t('calendar.bulkSelect')}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowCalendarSyncDialog(true)}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {t('calendar.syncCalendar')}
                </Button>

                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('calendar.exportCSV')}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['bookings'] });
                    queryClient.invalidateQueries({ queryKey: ['properties-with-location'] });
                    toast({ title: t('calendar.calendarRefreshed') });
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('common.refresh')}
                </Button>
              </>
            }
          />
        </div>

        {/* ========================================
            DASHBOARD: Revenue, Occupancy, Bookings
            ======================================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">

          {/* Total Revenue Card */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">{t('calendar.totalRevenue')}</p>
                  <h3 className="text-3xl font-bold text-green-900 mt-1">
                    ${dashboardStats.totalRevenue.toLocaleString()}
                  </h3>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Occupancy Rate Card */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">{t('calendar.occupancyRate')}</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">
                    {dashboardStats.occupancyRate}%
                  </h3>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Percent className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Bookings Card */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">{t('calendar.totalBookings')}</p>
                  <h3 className="text-3xl font-bold text-purple-900 mt-1">
                    {dashboardStats.totalBookings}
                  </h3>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Units Card */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">{t('calendar.availableUnits')}</p>
                  <h3 className="text-3xl font-bold text-orange-900 mt-1">
                    {dashboardStats.availableUnits}
                  </h3>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Home className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================
            BULK OPERATIONS TOOLBAR
            ======================================== */}
        {bulkSelectMode && selectedProperties.size > 0 && (
          <Card className="bg-blue-50 border-blue-200 flex-shrink-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">
                    {selectedProperties.size} {selectedProperties.size === 1 ? t('calendar.propertySelected') : t('calendar.propertiesSelected')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const selectedBookings = bookings.filter(b => selectedProperties.has(b.property_id));
                    // Export logic here
                  }}>
                    <FileDown className="h-4 w-4 mr-2" />
                    {t('calendar.exportSelected')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setShowBlockDatesDialog(true);
                  }}>
                    <Ban className="h-4 w-4 mr-2" />
                    {t('calendar.blockDates')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedProperties(new Set());
                    setBulkSelectMode(false);
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================
            FILTERS & VIEW CONTROLS
            ======================================== */}
        <Card className="shadow-md flex-shrink-0 border-0">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">

              {/* Top Row: Date Navigation & View Modes */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                {/* Date Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPeriod}
                    aria-label="Previous period"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="px-4 py-2 bg-gray-100 rounded-lg">
                    <span className="font-semibold text-gray-900">
                      {format(filters.startDate, 'MMMM yyyy')}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPeriod}
                    aria-label="Next period"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, startDate: new Date() }))}
                  >
                    {t('calendar.today')}
                  </Button>
                </div>

                {/* View Mode Selector */}
                <div className="flex items-center gap-2">
                  <Select
                    value={viewMode.dateRange}
                    onValueChange={(value: any) => setViewMode(prev => ({ ...prev, dateRange: value }))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">{t('calendar.week')}</SelectItem>
                      <SelectItem value="month">{t('calendar.month')}</SelectItem>
                      <SelectItem value="quarter">{t('calendar.quarter')}</SelectItem>
                      <SelectItem value="year">{t('calendar.year')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode.type === 'timeline' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode(prev => ({ ...prev, type: 'timeline' }))}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode.type === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode(prev => ({ ...prev, type: 'list' }))}
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Quick Filters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                <Select value={filters.minCapacity} onValueChange={(value) => setFilters(prev => ({ ...prev, minCapacity: value }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Capacity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('calendar.anyCapacity')}</SelectItem>
                    <SelectItem value="2">{t('calendar.twoPlus')}</SelectItem>
                    <SelectItem value="4">{t('calendar.fourPlus')}</SelectItem>
                    <SelectItem value="6">6+ guests</SelectItem>
                    <SelectItem value="8">8+ guests</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.city} onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('properties.city')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('calendar.allCities')}</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.propertyType} onValueChange={(value) => setFilters(prev => ({ ...prev, propertyType: value }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('properties.propertyType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('calendar.allTypes')}</SelectItem>
                    {propertyTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.bookingStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, bookingStatus: value }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('common.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('calendar.allStatuses')}</SelectItem>
                    <SelectItem value="confirmed">{t('calendar.status.confirmed')}</SelectItem>
                    <SelectItem value="pending">{t('calendar.status.pending')}</SelectItem>
                    <SelectItem value="blocked">{t('calendar.status.blocked')}</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className="h-9"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {t('calendar.moreFilters')}
                </Button>
              </div>

              {/* Show Only With Bookings Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="showOnlyWithBookings"
                  checked={filters.showOnlyWithBookings}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showOnlyWithBookings: checked === true }))}
                />
                <label
                  htmlFor="showOnlyWithBookings"
                  className="text-sm font-medium cursor-pointer select-none"
                >
                  {t('calendar.showOnlyWithBookings', 'Show only properties with bookings')}
                </label>
              </div>

              {/* Expanded Filters */}
              {filtersExpanded && (
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t('calendar.amenities')}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiltersExpanded(false)}
                    >
                      <ChevronDown className="h-4 w-4 mr-2" />
                      {t('calendar.hide')}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {availableAmenities.map((amenity) => (
                      <div
                        key={amenity.amenity_id}
                        className={`
                          flex items-center space-x-2 p-2 rounded border cursor-pointer text-sm transition-colors
                          ${filters.amenities.includes(amenity.amenity_name)
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                          }
                        `}
                        onClick={() => handleAmenityToggle(amenity.amenity_name)}
                      >
                        <Checkbox
                          id={amenity.amenity_id}
                          checked={filters.amenities.includes(amenity.amenity_name)}
                          onCheckedChange={() => handleAmenityToggle(amenity.amenity_name)}
                        />
                        <Label htmlFor={amenity.amenity_id} className="cursor-pointer text-xs">
                          {amenity.amenity_name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Filters Display */}
              {(filters.minCapacity !== 'all' || filters.city !== 'all' || filters.propertyType !== 'all' || filters.amenities.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">{t('calendar.active')}:</span>
                  {filters.minCapacity !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {filters.minCapacity}+ guests
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('minCapacity')} />
                    </Badge>
                  )}
                  {filters.city !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {filters.city}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('city')} />
                    </Badge>
                  )}
                  {filters.propertyType !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {filters.propertyType}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('propertyType')} />
                    </Badge>
                  )}
                  {filters.amenities.map(amenity => (
                    <Badge key={amenity} variant="secondary" className="gap-1">
                      {amenity}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => handleAmenityToggle(amenity)} />
                    </Badge>
                  ))}
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 text-xs">
                    {t('calendar.clearAll')}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ========================================
            CALENDAR GRID: Timeline View
            ======================================== */}
        <Card className="shadow-lg flex-1 flex flex-col min-h-0 border-0 overflow-hidden">
          <CardHeader className="pb-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                {t('calendar.timelineView')}
              </CardTitle>
              <Badge variant="outline">
                {filteredProperties.length} {t('calendar.properties')} • {dateRange.length} Days
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
            {filteredProperties.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('calendar.noPropertiesFound')}</h3>
                  <p className="text-gray-500 mb-4">
                    {t('calendar.noPropertiesMatch')}
                  </p>
                  <Button onClick={clearAllFilters} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('calendar.clearAll')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* Fixed Property Column */}
                <div className="flex-shrink-0 w-80 border-r bg-white flex flex-col">
                  {/* Header */}
                  <div className="h-12 border-b bg-gray-50 flex items-center px-4 font-semibold text-gray-700">
                    <Home className="h-4 w-4 mr-2" />
                    {t('calendar.properties')}
                  </div>

                  {/* Property List */}
                  <div className="flex-1 overflow-y-auto">
                    {filteredProperties.map((property, index) => {
                      const propertyBookingsCount = bookings.filter(b =>
                        b.property_id === property.property_id &&
                        b.booking_status !== 'cancelled'
                      ).length;

                      const occupancyRate = dateRange.length > 0
                        ? Math.round((propertyBookingsCount / dateRange.length) * 100)
                        : 0;

                      // Get current booking (today's guest)
                      const today = format(new Date(), 'yyyy-MM-dd');
                      const currentBooking = bookings.find(b =>
                        b.property_id === property.property_id &&
                        b.booking_status !== 'cancelled' &&
                        b.booking_status !== 'blocked' &&
                        b.check_in_date <= today &&
                        b.check_out_date >= today
                      );

                      // Check if property has units
                      const propertyUnits = property.units || [];
                      const hasUnits = propertyUnits.length > 0;
                      const isExpanded = expandedProperties.has(property.property_id);

                      return (
                        <React.Fragment key={property.property_id}>
                          {/* Property Row */}
                          <div
                            className={`
                              h-32 p-4 border-b transition-all cursor-pointer overflow-hidden flex items-center
                              ${selectedProperty === property.property_id
                                ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                : index % 2 === 0
                                  ? 'bg-white hover:bg-gray-50'
                                  : 'bg-gray-50 hover:bg-gray-100'
                              }
                            `}
                            onClick={() => setSelectedProperty(
                              selectedProperty === property.property_id ? null : property.property_id
                            )}
                          >
                            <div className="flex items-start gap-3 w-full">
                              {/* Expand/Collapse Button for Multi-Unit Properties */}
                              {hasUnits ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePropertyExpansion(property.property_id);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors flex-shrink-0 mt-3"
                                  aria-label={isExpanded ? t('calendar.collapseUnits') : t('calendar.expandUnits')}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-gray-600" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-600" />
                                  )}
                                </button>
                              ) : (
                                <div className="w-6 flex-shrink-0" />
                              )}

                              {bulkSelectMode && (
                                <Checkbox
                                  checked={selectedProperties.has(property.property_id)}
                                  onCheckedChange={() => togglePropertySelection(property.property_id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}

                              {/* Property Avatar */}
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-sm flex-shrink-0">
                                {property.property_name?.[0] || 'P'}
                              </div>

                              {/* Property Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 leading-tight">
                                    {property.property_name}
                                  </h4>
                                  {hasUnits && (
                                    <Badge variant="outline" className="h-4 text-[10px] px-1 bg-purple-50 text-purple-700 border-purple-200 flex-shrink-0">
                                      <Layers className="h-2.5 w-2.5 mr-0.5" />
                                      {propertyUnits.length} {t('calendar.units', 'units')}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {formatPropertyLocation(property) || 'N/A'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {property.capacity || 0}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Bed className="h-3 w-3" />
                                    {property.num_bedrooms || 0}
                                  </span>
                                </div>

                                {/* Current Guest */}
                                <div className="mt-1.5">
                                  {currentBooking ? (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Users className="h-3 w-3 text-green-600" />
                                      </div>
                                      <span className="text-green-700 font-medium truncate">
                                        {currentBooking.guest_name}
                                      </span>
                                      <Badge variant="outline" className="h-4 text-[10px] px-1 bg-green-50 text-green-700 border-green-200">
                                        {currentBooking.booking_status === 'checked_in' ? t('calendar.status.checkedIn') : t('calendar.status.confirmed')}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                      <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Home className="h-3 w-3 text-gray-400" />
                                      </div>
                                      <span>{t('calendar.available', 'Available')}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Occupancy Bar & History Button Row */}
                                <div className="mt-1.5 flex items-end gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                      <span className="text-gray-500">{t('calendar.occupancy')}</span>
                                      <span className={`font-medium ${
                                        occupancyRate > 80 ? 'text-red-600' :
                                        occupancyRate > 50 ? 'text-orange-600' :
                                        'text-green-600'
                                      }`}>
                                        {occupancyRate}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full transition-all ${
                                          occupancyRate > 80 ? 'bg-red-500' :
                                          occupancyRate > 50 ? 'bg-orange-500' :
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                  {/* History Button */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTransactionsPropertyId(property.property_id);
                                      setTransactionsPropertyName(property.property_name || '');
                                      setShowTransactionsDrawer(true);
                                    }}
                                  >
                                    <History className="h-3 w-3 mr-1" />
                                    {t('calendar.history', 'History')}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Unit Rows (when expanded) */}
                          {isExpanded && propertyUnits.map((unit: any, unitIndex: number) => {
                            const unitBooking = bookings.find(b =>
                              b.property_id === property.property_id &&
                              (b.unit_id === unit.unit_id || b.unit_id === null) &&
                              b.booking_status !== 'cancelled' &&
                              b.booking_status !== 'blocked' &&
                              b.check_in_date <= today &&
                              b.check_out_date >= today
                            );

                            return (
                              <div
                                key={unit.unit_id}
                                className={`
                                  min-h-[5rem] pl-10 pr-4 py-2 border-b transition-all flex items-center
                                  bg-gradient-to-r from-purple-50 to-white
                                  ${unitIndex === propertyUnits.length - 1 ? 'border-b-2 border-b-purple-200' : ''}
                                `}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  {/* Unit connector line */}
                                  <div className="w-4 h-full flex items-center justify-center">
                                    <div className={`w-px h-full bg-purple-300 ${unitIndex === propertyUnits.length - 1 ? 'h-1/2 self-start' : ''}`} />
                                  </div>
                                  <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />

                                  {/* Unit Avatar */}
                                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                                    {unit.property_name?.[0] || 'U'}
                                  </div>

                                  {/* Unit Info */}
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-gray-800 text-xs leading-tight">
                                      {unit.property_name}
                                      {(unit.num_bedrooms != null || unit.num_bathrooms != null) && (
                                        <span className="font-normal text-purple-500 ml-1">
                                          ({unit.num_bedrooms != null ? `${unit.num_bedrooms}bd` : ''}{unit.num_bedrooms != null && unit.num_bathrooms != null ? '/' : ''}{unit.num_bathrooms != null ? `${unit.num_bathrooms}ba` : ''})
                                        </span>
                                      )}
                                    </h5>
                                    {/* Show property location with property name, unit name */}
                                    <div className="flex items-start gap-1 text-[10px] text-gray-500 mt-0.5">
                                      <MapPin className="h-2.5 w-2.5 flex-shrink-0 mt-0.5" />
                                      <span className="break-words">
                                        {[
                                          formatPropertyLocation(property),
                                          property.property_name,
                                          unit.property_name
                                        ].filter(Boolean).join(', ') || property.property_name}
                                      </span>
                                    </div>
                                    {unitBooking ? (
                                      <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                                        <Users className="h-3 w-3" />
                                        <span className="truncate">{unitBooking.guest_name}</span>
                                        {unitBooking.unit_id === null && (
                                          <Badge variant="outline" className="h-3 text-[8px] px-0.5 bg-blue-50 text-blue-600 border-blue-200">
                                            {t('calendar.entireProperty', 'Entire')}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">{t('calendar.available', 'Available')}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Scrollable Timeline Column */}
                <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
                  {/* Single scrollable container for synchronized scrolling */}
                  <div className="flex-1 overflow-auto relative">
                    <div className="inline-flex flex-col min-w-max">
                      {/* Date Header - sticky at top */}
                      <div className="sticky top-0 z-10 h-12 border-b bg-gray-50 flex-shrink-0">
                        <div className="inline-flex h-full">
                          {dateRange.map((date, index) => {
                            const isFirstOfMonth = date.getDate() === 1;
                            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                            return (
                              <div
                                key={format(date, 'yyyy-MM-dd')}
                                className={`
                                  flex-shrink-0 w-12 h-full flex flex-col items-center justify-center text-xs border-r
                                  ${isToday ? 'bg-blue-100 border-blue-300 font-bold' : ''}
                                  ${isWeekend && !isToday ? 'bg-gray-100' : ''}
                                `}
                              >
                                {isFirstOfMonth && (
                                  <div className="text-[10px] font-semibold text-blue-600 uppercase">
                                    {format(date, 'MMM')}
                                  </div>
                                )}
                                <div className={`${isToday ? 'text-blue-600' : 'text-gray-700'} font-medium`}>
                                  {format(date, 'd')}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  {format(date, 'EEE')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Timeline Grid */}
                    <div className="inline-flex flex-col min-w-full">
                      {filteredProperties.map((property, propIndex) => {
                        const propertyUnits = property.units || [];
                        const hasUnits = propertyUnits.length > 0;
                        const isExpanded = expandedProperties.has(property.property_id);

                        return (
                          <React.Fragment key={property.property_id}>
                            {/* Property Timeline Row */}
                            <div
                              className={`
                                border-b flex-shrink-0 h-32 flex
                                ${selectedProperty === property.property_id ? 'bg-blue-50' :
                                  propIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }
                              `}
                            >
                              <div className="inline-flex h-full relative">
                                {dateRange.map((date) => {
                                  // For property row: show all bookings (entire property + unit-specific)
                                  // This shows that property has activity
                                  const booking = bookings.find(b =>
                                    b.property_id === property.property_id &&
                                    format(date, 'yyyy-MM-dd') >= b.check_in_date &&
                                    format(date, 'yyyy-MM-dd') <= b.check_out_date &&
                                    b.booking_status !== 'cancelled'
                                  );
                                  const isCheckIn = booking && format(parseISO(booking.check_in_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                                  const isCheckOut = booking && format(parseISO(booking.check_out_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                  const color = booking ? getBookingColor(booking.booking_status || 'pending') : null;
                                  // Use different color for entire-property bookings vs unit-specific
                                  const isEntireProperty = booking && booking.unit_id === null;

                                  const cellElement = (
                                    <div
                                      key={format(date, 'yyyy-MM-dd')}
                                      className={`
                                        flex-shrink-0 w-12 h-full border-r flex items-center justify-center cursor-pointer transition-all relative group
                                        ${isToday ? 'border-l-2 border-l-blue-500' : ''}
                                        ${!booking ? 'hover:bg-blue-50' : ''}
                                      `}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDateClick(property.property_id, date, booking);
                                      }}
                                    >
                                      {booking ? (
                                        <div className={`
                                          w-full h-16 ${color?.bg} ${color?.text} rounded-md flex items-center justify-center text-xs font-medium shadow-sm
                                          ${isCheckIn ? 'rounded-l-lg ml-1' : isCheckOut ? 'rounded-r-lg mr-1' : 'rounded-none'}
                                          ${color?.hover} transition-colors
                                          ${!isEntireProperty && hasUnits ? 'opacity-60 border-2 border-dashed border-white' : ''}
                                        `}>
                                          {isCheckIn && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div className="flex flex-col items-center">
                                                  <CheckCircle className="h-4 w-4 mb-1" />
                                                  <span className="text-[10px]">IN</span>
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <div className="text-xs">
                                                  <div className="font-semibold">{booking.guest_name}</div>
                                                  {booking.unit_id ? (
                                                    <div className="text-purple-600">
                                                      {formatStreetWithUnit(
                                                        getPropertyLocation(property)?.address,
                                                        (booking as any).unit?.property_name
                                                      ) || 'Specific Unit'}
                                                    </div>
                                                  ) : (
                                                    <div className="text-blue-600">
                                                      {getPropertyLocation(property)?.address || t('calendar.entireProperty', 'Entire Property')}
                                                    </div>
                                                  )}
                                                  <div>Check-in: {format(parseISO(booking.check_in_date), 'MMM dd')}</div>
                                                  <div>Check-out: {format(parseISO(booking.check_out_date), 'MMM dd')}</div>
                                                  {booking.total_amount && (
                                                    <div className="mt-1 font-medium">${booking.total_amount}</div>
                                                  )}
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                          {isCheckOut && !isCheckIn && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div className="flex flex-col items-center">
                                                  <AlertCircle className="h-4 w-4 mb-1" />
                                                  <span className="text-[10px]">OUT</span>
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <div className="text-xs">
                                                  <div className="font-semibold">{booking.guest_name}</div>
                                                  {booking.unit_id ? (
                                                    <div className="text-purple-600">
                                                      {formatStreetWithUnit(
                                                        getPropertyLocation(property)?.address,
                                                        (booking as any).unit?.property_name
                                                      ) || 'Specific Unit'}
                                                    </div>
                                                  ) : (
                                                    <div className="text-blue-600">
                                                      {getPropertyLocation(property)?.address || t('calendar.entireProperty', 'Entire Property')}
                                                    </div>
                                                  )}
                                                  <div>Check-out: {format(parseISO(booking.check_out_date), 'MMM dd')}</div>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                          {!isCheckIn && !isCheckOut && (
                                            <div className="w-2 h-2 rounded-full bg-white opacity-70" />
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                          +
                                        </div>
                                      )}
                                    </div>
                                  );

                                  // Wrap booked cells with context menu
                                  if (booking) {
                                    return (
                                      <ContextMenu key={format(date, 'yyyy-MM-dd')}>
                                        <ContextMenuTrigger>
                                          {cellElement}
                                        </ContextMenuTrigger>
                                        <ContextMenuContent className="w-48">
                                          <ContextMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedBookingDetails(booking);
                                              setShowDetailsDrawer(true);
                                            }}
                                          >
                                            <Info className="h-4 w-4 mr-2" />
                                            {t('common.details')}
                                          </ContextMenuItem>
                                          <ContextMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingBooking(booking);
                                              setBookingPropertyId(property.property_id);
                                              setShowBookingDialog(true);
                                            }}
                                          >
                                            <Edit className="h-4 w-4 mr-2" />
                                            {t('common.edit')}
                                          </ContextMenuItem>
                                          <ContextMenuSeparator />
                                          <ContextMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeletingBooking(booking);
                                              setShowDeleteDialog(true);
                                            }}
                                            className="text-red-600 focus:text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Cancel Booking
                                          </ContextMenuItem>
                                        </ContextMenuContent>
                                      </ContextMenu>
                                    );
                                  }

                                  return cellElement;
                                })}
                              </div>
                            </div>

                            {/* Unit Timeline Rows (when expanded) */}
                            {isExpanded && propertyUnits.map((unit: any, unitIndex: number) => (
                              <div
                                key={unit.unit_id}
                                className={`
                                  border-b flex-shrink-0 min-h-[5rem] flex
                                  bg-gradient-to-r from-purple-50 to-white
                                  ${unitIndex === propertyUnits.length - 1 ? 'border-b-2 border-b-purple-200' : ''}
                                `}
                              >
                                <div className="inline-flex h-full relative">
                                  {dateRange.map((date) => {
                                    // For unit row: show unit-specific bookings AND entire-property bookings
                                    const unitBooking = bookings.find(b =>
                                      b.property_id === property.property_id &&
                                      (b.unit_id === unit.unit_id || b.unit_id === null) &&
                                      format(date, 'yyyy-MM-dd') >= b.check_in_date &&
                                      format(date, 'yyyy-MM-dd') <= b.check_out_date &&
                                      b.booking_status !== 'cancelled'
                                    );
                                    const isCheckIn = unitBooking && format(parseISO(unitBooking.check_in_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                                    const isCheckOut = unitBooking && format(parseISO(unitBooking.check_out_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                                    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                    const isEntirePropertyBooking = unitBooking && unitBooking.unit_id === null;
                                    // Use purple for unit-specific, blue for entire-property
                                    const unitColor = isEntirePropertyBooking
                                      ? { bg: 'bg-blue-400', text: 'text-white', hover: 'hover:bg-blue-500' }
                                      : { bg: 'bg-purple-500', text: 'text-white', hover: 'hover:bg-purple-600' };

                                    return (
                                      <div
                                        key={format(date, 'yyyy-MM-dd')}
                                        className={`
                                          flex-shrink-0 w-12 min-h-[5rem] border-r flex items-center justify-center cursor-pointer transition-all relative group
                                          ${isToday ? 'border-l-2 border-l-blue-500' : ''}
                                          ${!unitBooking ? 'hover:bg-purple-100' : ''}
                                        `}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDateClick(property.property_id, date, unitBooking);
                                        }}
                                      >
                                        {unitBooking ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className={`
                                                w-full h-10 ${unitColor.bg} ${unitColor.text} rounded-md flex items-center justify-center text-xs font-medium shadow-sm
                                                ${isCheckIn ? 'rounded-l-lg ml-1' : isCheckOut ? 'rounded-r-lg mr-1' : 'rounded-none'}
                                                ${unitColor.hover} transition-colors
                                                ${isEntirePropertyBooking ? 'border border-dashed border-white' : ''}
                                              `}>
                                                {isCheckIn && <span className="text-[9px]">IN</span>}
                                                {isCheckOut && !isCheckIn && <span className="text-[9px]">OUT</span>}
                                                {!isCheckIn && !isCheckOut && <div className="w-1.5 h-1.5 rounded-full bg-white opacity-70" />}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <div className="text-xs">
                                                <div className="font-semibold">{unitBooking.guest_name}</div>
                                                {isEntirePropertyBooking ? (
                                                  <div className="text-blue-600 font-medium">{t('calendar.entireProperty', 'Entire Property')}</div>
                                                ) : (
                                                  <div className="text-purple-600">
                                                    {unit.property_name}
                                                    {(unit.num_bedrooms != null || unit.num_bathrooms != null) && (
                                                      <span className="text-purple-400 ml-1">
                                                        ({unit.num_bedrooms != null ? `${unit.num_bedrooms}bd` : ''}{unit.num_bedrooms != null && unit.num_bathrooms != null ? '/' : ''}{unit.num_bathrooms != null ? `${unit.num_bathrooms}ba` : ''})
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                                {getPropertyLocation(property) && (
                                                  <div className="text-gray-500 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {formatPropertyLocation(property)}
                                                  </div>
                                                )}
                                                <div>Check-in: {format(parseISO(unitBooking.check_in_date), 'MMM dd')}</div>
                                                <div>Check-out: {format(parseISO(unitBooking.check_out_date), 'MMM dd')}</div>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <div className="text-purple-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                            +
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========================================
            LEGEND & SUMMARY
            ======================================== */}
        <Card className="bg-white shadow-md flex-shrink-0 border-0">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-gray-700">{t('calendar.status.confirmed')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-gray-700">{t('calendar.status.pending')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="text-gray-700">{t('calendar.status.blocked')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-gray-700">{t('calendar.status.checkedIn')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-gray-700">{t('calendar.unitBooking', 'Unit Booking')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-400 rounded border border-dashed border-white"></div>
                  <span className="text-gray-700">{t('calendar.entireProperty', 'Entire Property')}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="text-sm text-gray-500">
                {t('calendar.lastUpdated')}: {format(new Date(), 'MMM dd, HH:mm')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========================================
            DIALOGS: Booking, Delete, Block, Details
            ======================================== */}

        {/* Booking Dialog - Enhanced with Conflict Detection & Template Integration */}
        <BookingDialogEnhanced
          open={showBookingDialog}
          onOpenChange={(open) => {
            setShowBookingDialog(open);
            if (!open) {
              setEditingBooking(null);
              setBookingPropertyId(null);
              setBookingCheckIn('');
              setBookingCheckOut('');
            }
          }}
          onSubmit={handleBookingSubmit}
          propertyId={bookingPropertyId || undefined}
          booking={editingBooking}
          defaultCheckIn={bookingCheckIn}
          defaultCheckOut={bookingCheckOut}
        />

        {/* Cancel Booking Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Booking</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this booking? This will set the booking status to cancelled.
              </DialogDescription>
            </DialogHeader>
            {deletingBooking && (
              <div className="space-y-3 py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('calendar.guest')}:</span>
                  <span className="font-medium">{deletingBooking.guest_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('bookings.checkIn')}:</span>
                  <span className="font-medium">
                    {format(parseISO(deletingBooking.check_in_date), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('bookings.checkOut')}:</span>
                  <span className="font-medium">
                    {format(parseISO(deletingBooking.check_out_date), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium">{deletingBooking.booking_status}</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteBooking}>
                Cancel Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Block Dates Dialog */}
        <Dialog open={showBlockDatesDialog} onOpenChange={setShowBlockDatesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('calendar.blockDatesTitle')}</DialogTitle>
              <DialogDescription>
                {selectedProperties.size > 0
                  ? `Block dates for ${selectedProperties.size} selected propert${selectedProperties.size === 1 ? 'y' : 'ies'}`
                  : 'Block dates to prevent bookings during maintenance or unavailable periods.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('calendar.startDate')} *</Label>
                <Input
                  type="date"
                  value={blockStartDate}
                  onChange={(e) => setBlockStartDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('calendar.endDate')} *</Label>
                <Input
                  type="date"
                  value={blockEndDate}
                  onChange={(e) => setBlockEndDate(e.target.value)}
                  min={blockStartDate || format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('calendar.reasonOptional')}</Label>
                <Input
                  type="text"
                  placeholder={t('calendar.reasonPlaceholder')}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBlockDatesDialog(false);
                  setBlockPropertyId(null);
                  setBlockStartDate('');
                  setBlockEndDate('');
                  setBlockReason('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleBlockDates}>
                <Ban className="h-4 w-4 mr-2" />
                {t('calendar.blockDates')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Booking Details Drawer */}
        <Sheet open={showDetailsDrawer} onOpenChange={setShowDetailsDrawer}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{t('calendar.bookingDetails')}</SheetTitle>
              <SheetDescription>
                {t('calendar.bookingDetailsSubtitle')}
              </SheetDescription>
            </SheetHeader>
            {selectedBookingDetails && (
              <div className="space-y-6 mt-6">
                {/* Guest Information */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    {t('calendar.guestInformation')}
                  </h3>
                  <div className="space-y-2 pl-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('common.name')}:</span>
                      <span className="font-medium">{selectedBookingDetails.guest_name}</span>
                    </div>
                    {selectedBookingDetails.guest_email && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('common.email')}:</span>
                        <span className="font-medium">{selectedBookingDetails.guest_email}</span>
                      </div>
                    )}
                    {selectedBookingDetails.guest_phone && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('common.phone')}:</span>
                        <span className="font-medium">{selectedBookingDetails.guest_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Dates */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-blue-600" />
                    {t('calendar.bookingDates')}
                  </h3>
                  <div className="space-y-2 pl-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('bookings.checkIn')}:</span>
                      <span className="font-medium">
                        {format(parseISO(selectedBookingDetails.check_in_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('bookings.checkOut')}:</span>
                      <span className="font-medium">
                        {format(parseISO(selectedBookingDetails.check_out_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('calendar.duration')}:</span>
                      <span className="font-medium">
                        {differenceInDays(
                          parseISO(selectedBookingDetails.check_out_date),
                          parseISO(selectedBookingDetails.check_in_date)
                        )} {t('calendar.nights')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Payment */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    {t('calendar.statusAndPayment')}
                  </h3>
                  <div className="space-y-2 pl-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('common.status')}:</span>
                      <Badge>{selectedBookingDetails.booking_status}</Badge>
                    </div>
                    {selectedBookingDetails.total_amount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('bookings.totalAmount')}:</span>
                        <span className="font-medium text-lg">
                          ${selectedBookingDetails.total_amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setEditingBooking(selectedBookingDetails);
                      setBookingPropertyId(selectedBookingDetails.property_id);
                      setShowDetailsDrawer(false);
                      setShowBookingDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowDetailsDrawer(false);
                      setDeletingBooking(selectedBookingDetails);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancel Booking
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Calendar Sync Dialog */}
        <CalendarSyncDialog
          open={showCalendarSyncDialog}
          onOpenChange={setShowCalendarSyncDialog}
          properties={properties as Property[]}
        />

        {/* Property Transactions Drawer */}
        <PropertyTransactionsDrawer
          open={showTransactionsDrawer}
          onOpenChange={setShowTransactionsDrawer}
          propertyId={transactionsPropertyId}
          propertyName={transactionsPropertyName}
        />
      </div>
    </TooltipProvider>
  );
};

export default Calendar;
