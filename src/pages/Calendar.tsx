import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  X,
  MapPin,
  Home,
  Users,
  Bed,
  Bath,
  Maximize,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addDays } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';
import { BookingDialog } from '@/components/BookingDialog';
import { BookingInsert } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { bookingKeys } from '@/hooks/useBookings';

type Property = Tables<'properties'>;
type PropertyBooking = Tables<'property_bookings'>;
type Amenity = Tables<'amenities'>;

interface FilterState {
  startDate: Date;
  minCapacity: string;
  minRooms: string;
  minBathrooms: string;
  propertyType: string;
  city: string;
  amenities: string[];
}

interface FilterChip {
  id: string;
  label: string;
  value: string;
  type: 'capacity' | 'rooms' | 'bathrooms' | 'propertyType' | 'city' | 'amenity';
}

const Calendar = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<FilterState>({
    startDate: new Date(),
    minCapacity: 'all',
    minRooms: 'all',
    minBathrooms: 'all',
    propertyType: 'all',
    city: 'all',
    amenities: [],
  });

  const [viewMode, setViewMode] = useState<'year' | 'month'>('year');
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  // Booking dialog state
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingPropertyId, setBookingPropertyId] = useState<string | null>(null);
  const [bookingCheckIn, setBookingCheckIn] = useState<string>('');
  const [bookingCheckOut, setBookingCheckOut] = useState<string>('');

  // Debounced search - trigger search 500ms after last filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTrigger(prev => prev + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [filters]);

  // Generate date range for calendar grid
  const dateRange = useMemo(() => {
    const start = startOfMonth(filters.startDate);
    const months = viewMode === 'year' ? 12 : 3;
    const end = endOfMonth(addMonths(start, months - 1));
    return eachDayOfInterval({ start, end });
  }, [filters.startDate, viewMode]);

  // Fetch properties with related data
  const { data: properties = [], isLoading: propertiesLoading, error: propertiesError } = useQuery({
    queryKey: ['properties-with-location'],
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch bookings for date range
  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError } = useQuery({
    queryKey: ['bookings', filters.startDate, viewMode],
    queryFn: async () => {
      const startDate = format(startOfMonth(filters.startDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(addMonths(filters.startDate, viewMode === 'year' ? 12 : 3)), 'yyyy-MM-dd');

      console.log('🔍 Fetching bookings from', startDate, 'to', endDate);
      const { data, error } = await supabase
        .from('property_bookings')
        .select('*')
        .gte('check_in_date', startDate)
        .lte('check_out_date', endDate);

      if (error) {
        console.error('❌ Bookings fetch error:', error);
        throw error;
      }
      console.log('✅ Bookings fetched successfully:', data?.length, 'bookings');
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for bookings (more dynamic data)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch amenities for filter
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
    staleTime: 30 * 60 * 1000, // 30 minutes (amenities don't change often)
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  // Filter properties based on current filters
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      // Capacity filter
      if (filters.minCapacity !== 'all' && property.capacity && property.capacity < parseInt(filters.minCapacity)) {
        return false;
      }

      // Rooms filter
      if (filters.minRooms !== 'all' && property.num_bedrooms && property.num_bedrooms < parseInt(filters.minRooms)) {
        return false;
      }

      // Bathrooms filter
      if (filters.minBathrooms !== 'all' && property.num_bathrooms && property.num_bathrooms < parseInt(filters.minBathrooms)) {
        return false;
      }

      // Property type filter
      if (filters.propertyType !== 'all' && property.property_type !== filters.propertyType) {
        return false;
      }

      // City filter
      if (filters.city !== 'all') {
        const propertyLocation = property.property_location?.[0];
        if (!propertyLocation || propertyLocation.city !== filters.city) {
          return false;
        }
      }

      // Amenities filter
      if (filters.amenities.length > 0) {
        const propertyAmenities = property.property_amenities?.map(pa => pa.amenities?.amenity_name) || [];
        const hasRequiredAmenities = filters.amenities.every(amenity =>
          propertyAmenities.includes(amenity)
        );
        if (!hasRequiredAmenities) {
          return false;
        }
      }

      return true;
    });
  }, [properties, filters]);

  // Get booking status for a specific property and date
  const getBookingStatus = (propertyId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const propertyBookings = bookings.filter(b => b.property_id === propertyId);

    for (const booking of propertyBookings) {
      if (dateStr >= booking.check_in_date && dateStr <= booking.check_out_date) {
        return {
          status: 'booked',
          booking,
          isCheckIn: dateStr === booking.check_in_date,
          isCheckOut: dateStr === booking.check_out_date,
        };
      }
    }

    return { status: 'available' };
  };

  // Get unique cities for filter
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    properties.forEach(property => {
      const city = property.property_location?.[0]?.city;
      if (city) citySet.add(city);
    });
    return Array.from(citySet).sort();
  }, [properties]);

  // Get unique property types for filter
  const propertyTypes = useMemo(() => {
    const typeSet = new Set<string>();
    properties.forEach(property => {
      if (property.property_type) typeSet.add(property.property_type);
    });
    return Array.from(typeSet).sort();
  }, [properties]);

  const handleAmenityToggle = (amenityName: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityName)
        ? prev.amenities.filter(a => a !== amenityName)
        : [...prev.amenities, amenityName]
    }));
  };

  const handleSearch = useCallback(() => {
    // Force immediate search by updating trigger
    setSearchTrigger(prev => prev + 1);
  }, []);

  const groupedDates = useMemo(() => {
    const months: { [key: string]: Date[] } = {};
    dateRange.forEach(date => {
      const monthKey = format(date, 'yyyy-MM');
      if (!months[monthKey]) {
        months[monthKey] = [];
      }
      months[monthKey].push(date);
    });
    return months;
  }, [dateRange]);

  // Show error state if there are database errors
  if (propertiesError || bookingsError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Calendar - Database Connection Test</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Database Connection Error</h3>
          <p className="text-red-700 mt-2">
            {propertiesError ? `Properties: ${propertiesError.message}` : ''}
            {bookingsError ? `Bookings: ${bookingsError.message}` : ''}
          </p>
        </div>
        <div className="text-center text-muted-foreground">
          <p>Unable to load calendar data. Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  // Show test component if no data is available for debugging
  if (propertiesLoading && bookingsLoading && properties.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Calendar - Database Connection Test</h1>
        <div className="text-center text-muted-foreground">
          <p>Unable to load calendar data. Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  if (propertiesLoading || bookingsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>

          {/* Filters Skeleton */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-6 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="h-10 bg-gray-200 rounded w-full sm:w-24"></div>
                <div className="h-10 bg-gray-200 rounded w-full sm:w-32"></div>
              </div>
            </CardContent>
          </Card>

          {/* View Toggle Skeleton */}
          <div className="flex space-x-2 mb-6">
            <div className="h-10 bg-gray-200 rounded w-16"></div>
            <div className="h-10 bg-gray-200 rounded w-16"></div>
          </div>

          {/* Calendar Grid Skeleton */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-[200px_1fr] border-b">
                <div className="p-3 bg-gray-100 border-r">
                  <div className="h-4 bg-gray-200 rounded w-8"></div>
                </div>
                <div className="p-3 bg-gray-100">
                  <div className="h-4 bg-gray-200 rounded w-12 mb-2"></div>
                  <div className="grid grid-flow-col auto-cols-[30px] gap-1">
                    {[...Array(30)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="grid grid-cols-[200px_1fr] border-b">
                    <div className="p-3 border-r">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gray-200 rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="grid grid-flow-col auto-cols-[30px] gap-1">
                        {[...Array(30)].map((_, j) => (
                          <div key={j} className="h-6 w-6 bg-gray-200 rounded"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Generate active filter chips
  const activeFilters = useMemo(() => {
    const chips: FilterChip[] = [];

    if (filters.minCapacity !== 'all') {
      chips.push({ id: 'capacity', label: `Min Capacity: ${filters.minCapacity}+`, value: filters.minCapacity, type: 'capacity' });
    }
    if (filters.minRooms !== 'all') {
      chips.push({ id: 'rooms', label: `Min Rooms: ${filters.minRooms}+`, value: filters.minRooms, type: 'rooms' });
    }
    if (filters.minBathrooms !== 'all') {
      chips.push({ id: 'bathrooms', label: `Min Bathrooms: ${filters.minBathrooms}+`, value: filters.minBathrooms, type: 'bathrooms' });
    }
    if (filters.propertyType !== 'all') {
      chips.push({ id: 'propertyType', label: `Type: ${filters.propertyType}`, value: filters.propertyType, type: 'propertyType' });
    }
    if (filters.city !== 'all') {
      chips.push({ id: 'city', label: `City: ${filters.city}`, value: filters.city, type: 'city' });
    }
    filters.amenities.forEach(amenity => {
      chips.push({ id: `amenity-${amenity}`, label: amenity, value: amenity, type: 'amenity' });
    });

    return chips;
  }, [filters]);

  const removeFilter = (chip: FilterChip) => {
    switch (chip.type) {
      case 'capacity':
        setFilters(prev => ({ ...prev, minCapacity: 'all' }));
        break;
      case 'rooms':
        setFilters(prev => ({ ...prev, minRooms: 'all' }));
        break;
      case 'bathrooms':
        setFilters(prev => ({ ...prev, minBathrooms: 'all' }));
        break;
      case 'propertyType':
        setFilters(prev => ({ ...prev, propertyType: 'all' }));
        break;
      case 'city':
        setFilters(prev => ({ ...prev, city: 'all' }));
        break;
      case 'amenity':
        setFilters(prev => ({ ...prev, amenities: prev.amenities.filter(a => a !== chip.value) }));
        break;
    }
  };

  const clearAllFilters = () => {
    setFilters({
      startDate: new Date(),
      minCapacity: 'all',
      minRooms: 'all',
      minBathrooms: 'all',
      propertyType: 'all',
      city: 'all',
      amenities: [],
    });
  };

  // Handle booking creation from calendar
  const handleDateClick = (propertyId: string, date: Date, bookingInfo: any) => {
    // Don't open dialog if date is already booked
    if (bookingInfo.status === 'booked') {
      toast({
        title: 'Date Unavailable',
        description: `This date is already booked by ${bookingInfo.booking?.guest_name}`,
        variant: 'destructive',
      });
      return;
    }

    // Set booking defaults and open dialog
    setBookingPropertyId(propertyId);
    setBookingCheckIn(format(date, 'yyyy-MM-dd'));
    setBookingCheckOut(format(addDays(date, 1), 'yyyy-MM-dd'));
    setShowBookingDialog(true);
  };

  const handleBookingSubmit = async (bookingData: BookingInsert) => {
    try {
      const { data, error } = await supabase
        .from('property_bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Booking created successfully',
      });

      // Close dialog and refresh bookings
      setShowBookingDialog(false);
      setBookingPropertyId(null);
      setBookingCheckIn('');
      setBookingCheckOut('');

      // Invalidate bookings query to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: bookingKeys.property(bookingData.property_id) });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create booking',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-primary opacity-5 rounded-lg"></div>
        <div className="relative bg-card border rounded-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Master Calendar</h1>
                  <p className="text-sm text-muted-foreground">
                    View and manage property availability across all locations
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{filteredProperties.length}</div>
                  <div className="text-xs text-muted-foreground">Properties</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{properties.length}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {bookings.filter(b => b.booking_status === 'confirmed').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Bookings</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFilters.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
                {activeFilters.map((chip) => (
                  <Badge
                    key={chip.id}
                    variant="secondary"
                    className="gap-1 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {chip.label}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeFilter(chip)}
                    />
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Search Filters</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="gap-2"
            >
              {filtersExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {filtersExpanded ? 'Hide' : 'Show'}
              <ChevronDown className={`h-4 w-4 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        {filtersExpanded && (
          <CardContent className="space-y-6">
            {/* Primary Filters */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Date & Capacity
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={format(filters.startDate, 'yyyy-MM-dd')}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                    className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    Min. Capacity
                  </Label>
                  <Select value={filters.minCapacity} onValueChange={(value) => setFilters(prev => ({ ...prev, minCapacity: value }))}>
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Any capacity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any capacity</SelectItem>
                      <SelectItem value="1">1+ guests</SelectItem>
                      <SelectItem value="2">2+ guests</SelectItem>
                      <SelectItem value="4">4+ guests</SelectItem>
                      <SelectItem value="6">6+ guests</SelectItem>
                      <SelectItem value="8">8+ guests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Bed className="h-3 w-3" />
                    Min. Rooms
                  </Label>
                  <Select value={filters.minRooms} onValueChange={(value) => setFilters(prev => ({ ...prev, minRooms: value }))}>
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Any rooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any rooms</SelectItem>
                      <SelectItem value="1">1+ bedroom</SelectItem>
                      <SelectItem value="2">2+ bedrooms</SelectItem>
                      <SelectItem value="3">3+ bedrooms</SelectItem>
                      <SelectItem value="4">4+ bedrooms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Bath className="h-3 w-3" />
                    Min. Bathrooms
                  </Label>
                  <Select value={filters.minBathrooms} onValueChange={(value) => setFilters(prev => ({ ...prev, minBathrooms: value }))}>
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Any bathrooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any bathrooms</SelectItem>
                      <SelectItem value="1">1+ bathroom</SelectItem>
                      <SelectItem value="2">2+ bathrooms</SelectItem>
                      <SelectItem value="3">3+ bathrooms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Location & Type Filters */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Location & Type
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Home className="h-3 w-3" />
                    Property Type
                  </Label>
                  <Select value={filters.propertyType} onValueChange={(value) => setFilters(prev => ({ ...prev, propertyType: value }))}>
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any type</SelectItem>
                      {propertyTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    City
                  </Label>
                  <Select value={filters.city} onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}>
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Any city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any city</SelectItem>
                      {cities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Amenities Filter */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Maximize className="h-4 w-4 text-primary" />
                Amenities
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {availableAmenities.slice(0, 8).map((amenity) => (
                  <div
                    key={amenity.amenity_id}
                    className={`
                      flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer
                      ${filters.amenities.includes(amenity.amenity_name)
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-background border-border hover:bg-muted/50'
                      }
                    `}
                    onClick={() => handleAmenityToggle(amenity.amenity_name)}
                  >
                    <Checkbox
                      id={amenity.amenity_id}
                      checked={filters.amenities.includes(amenity.amenity_name)}
                      onCheckedChange={() => handleAmenityToggle(amenity.amenity_name)}
                    />
                    <Label
                      htmlFor={amenity.amenity_id}
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {amenity.amenity_name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleSearch} className="bg-gradient-primary hover:bg-gradient-secondary w-full sm:w-auto gap-2">
                  <Search className="h-4 w-4" />
                  Search Properties
                </Button>
                <Button variant="outline" className="w-full sm:w-auto gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Season
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                {filteredProperties.length} of {properties.length} properties match your filters
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Enhanced View Toggle */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 p-1 bg-muted rounded-lg">
                <Button
                  variant={viewMode === 'year' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('year')}
                  className={`
                    transition-all duration-200
                    ${viewMode === 'year'
                      ? 'bg-gradient-primary text-white shadow-sm'
                      : 'hover:bg-background'
                    }
                  `}
                >
                  Year View
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className={`
                    transition-all duration-200
                    ${viewMode === 'month'
                      ? 'bg-gradient-primary text-white shadow-sm'
                      : 'hover:bg-background'
                    }
                  `}
                >
                  Month View
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {viewMode === 'year' ? '12 months' : '3 months'} from {format(filters.startDate, 'MMM yyyy')}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                  <span className="text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                  <span className="text-muted-foreground">Booked</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                  <span className="text-muted-foreground">Weekend</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Calendar Grid */}
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Property Availability Calendar
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {format(filters.startDate, 'MMMM yyyy')} - {format(addMonths(filters.startDate, viewMode === 'year' ? 11 : 2), 'MMMM yyyy')}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Enhanced Date Headers */}
              <div className="grid grid-cols-[250px_1fr] border-b-2 border-border">
                <div className="p-4 font-semibold bg-gradient-to-r from-muted to-muted/50 border-r">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">Properties</span>
                  </div>
                </div>
                <div className="p-4 font-semibold bg-gradient-to-r from-muted to-muted/50">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">Availability Calendar</span>
                  </div>

                  {/* Enhanced Month Headers */}
                  <div className="grid grid-flow-col auto-cols-fr gap-2 mb-2">
                    {Object.keys(groupedDates).map((monthKey) => (
                      <div key={monthKey} className="text-center">
                        <div className="text-xs font-medium text-primary bg-primary/10 rounded px-2 py-1">
                          {format(new Date(monthKey), 'MMM yyyy')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Enhanced Day Headers */}
                  <div className="grid grid-flow-col auto-cols-[32px] gap-1">
                    {dateRange.map((date) => (
                      <div
                        key={format(date, 'yyyy-MM-dd')}
                        className={`
                          text-xs text-center py-1 rounded transition-colors
                          ${date.getDay() === 0 || date.getDay() === 6
                            ? 'text-blue-600 font-medium bg-blue-50'
                            : 'text-muted-foreground hover:bg-muted/50'
                          }
                          ${!isSameMonth(date, filters.startDate) ? 'opacity-40' : ''}
                        `}
                      >
                        {format(date, 'd')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Enhanced Property Rows */}
              <div className="max-h-[700px] overflow-y-auto">
                {filteredProperties.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="max-w-md mx-auto">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">No properties found</h3>
                      <p className="text-muted-foreground mb-4">
                        No properties match your current filter criteria. Try adjusting your filters to see more results.
                      </p>
                      <Button
                        onClick={clearAllFilters}
                        variant="outline"
                        className="gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Clear all filters
                      </Button>
                    </div>
                  </div>
                ) : (
                  filteredProperties.map((property, index) => {
                    const isSelected = selectedProperty === property.property_id;
                    const propertyBookings = bookings.filter(b => b.property_id === property.property_id);
                    const occupancyRate = Math.round((propertyBookings.length / dateRange.length) * 100);

                    return (
                      <div
                        key={property.property_id}
                        className={`
                          grid grid-cols-[250px_1fr] border-b transition-all duration-200
                          ${isSelected
                            ? 'bg-primary/5 border-primary/30'
                            : index % 2 === 0
                              ? 'bg-background hover:bg-muted/30'
                              : 'bg-muted/20 hover:bg-muted/40'
                          }
                        `}
                        onClick={() => setSelectedProperty(isSelected ? null : property.property_id)}
                      >
                        {/* Enhanced Property Info */}
                        <div className="p-4 border-r flex items-center space-x-3 cursor-pointer">
                          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
                            {property.property_name?.[0] || 'P'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate mb-1">
                              {property.property_name}
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {property.property_location?.[0]?.city || 'No city'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {property.capacity || 0}
                              </div>
                              <div className="flex items-center gap-1">
                                <Bed className="h-3 w-3" />
                                {property.num_bedrooms || 0}
                              </div>
                            </div>
                            <div className="mt-1">
                              <div className="text-xs text-muted-foreground">
                                Occupancy: <span className={`font-medium ${occupancyRate > 70 ? 'text-red-600' : occupancyRate > 40 ? 'text-orange-500' : 'text-green-600'}`}>{occupancyRate}%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Availability Grid */}
                        <div className="p-4">
                          <div className="grid grid-flow-col auto-cols-[32px] gap-1">
                            {dateRange.map((date) => {
                              const bookingInfo = getBookingStatus(property.property_id, date);
                              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                              return (
                                <div
                                  key={format(date, 'yyyy-MM-dd')}
                                  className={`
                                    h-7 w-7 text-xs flex items-center justify-center rounded-lg cursor-pointer transition-all duration-200 relative group
                                    ${bookingInfo.status === 'booked'
                                      ? 'bg-red-100 text-red-800 border-2 border-red-300 hover:bg-red-200 shadow-sm'
                                      : isWeekend
                                        ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 hover:shadow-md'
                                        : 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 hover:shadow-md'
                                    }
                                    ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                                    ${bookingInfo.isCheckIn ? 'border-l-4 border-l-orange-500' : ''}
                                    ${bookingInfo.isCheckOut ? 'border-r-4 border-r-orange-500' : ''}
                                  `}
                                  title={`
                                    ${format(date, 'MMM dd, yyyy')}
                                    ${bookingInfo.status === 'booked' ? `\nBooked - ${bookingInfo.booking?.guest_name}` : '\nAvailable - Click to book'}
                                    ${bookingInfo.isCheckIn ? '\nCheck-in' : ''}
                                    ${bookingInfo.isCheckOut ? '\nCheck-out' : ''}
                                  `}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDateClick(property.property_id, date, bookingInfo);
                                  }}
                                >
                                  {bookingInfo.status === 'booked' ? (
                                    <div className="flex items-center justify-center">
                                      {bookingInfo.isCheckIn ? (
                                        <CheckCircle className="h-3 w-3" />
                                      ) : bookingInfo.isCheckOut ? (
                                        <AlertCircle className="h-3 w-3" />
                                      ) : (
                                        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="font-medium">
                                      {date.getDate()}
                                    </span>
                                  )}

                                  {/* Tooltip on hover */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                                    {format(date, 'MMM dd, yyyy')}
                                    {bookingInfo.status === 'booked' && (
                                      <div>
                                        Guest: {bookingInfo.booking?.guest_name}
                                        {bookingInfo.isCheckIn && <div>Check-in</div>}
                                        {bookingInfo.isCheckOut && <div>Check-out</div>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Results Summary */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {filteredProperties.length} of {properties.length} properties
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span>
                  {dateRange.length} days
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  Last updated: {format(new Date(), 'MMM dd, HH:mm')}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="text-xs text-muted-foreground">
                Total bookings: <span className="font-medium text-foreground">{bookings.length}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Avg occupancy: <span className="font-medium text-foreground">
                  {Math.round((bookings.length / (filteredProperties.length * dateRange.length)) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <BookingDialog
        open={showBookingDialog}
        onOpenChange={setShowBookingDialog}
        onSubmit={handleBookingSubmit}
        propertyId={bookingPropertyId || undefined}
        defaultCheckIn={bookingCheckIn}
        defaultCheckOut={bookingCheckOut}
      />
    </div>
  );
};

export default Calendar;