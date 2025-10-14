import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  DollarSign,
  CreditCard,
  Wallet,
  Banknote,
  Percent,
  UserPlus,
  Save,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TabLoadingSpinner } from './PropertyEditSkeleton';
import { format, addMonths, subMonths } from 'date-fns';
import { usePropertyBookings, bookingKeys as bookingQueryKeys } from '@/hooks/useBookings';
import { BookingDialogEnhanced } from '@/components/BookingDialogEnhanced';
import { BookingsTable } from '@/components/BookingsTable';
import { Booking, BookingInsert } from '@/lib/schemas';

interface BookingRates {
  rate_id?: string;
  property_id: string;
  low_season_rate: number;
  medium_season_rate: number;
  high_season_rate: number;
  holiday_rate: number;
  extra_guest_price: number;
  pm_commission: number;
  cash_payment: boolean;
  credit_card_payment: boolean;
  debit_card_payment: boolean;
  stripe_payment: boolean;
  deposit_payment: boolean;
}

interface BookingTabOptimizedProps {
  propertyId: string;
}

// Query keys
const bookingKeys = {
  all: (propertyId: string) => ['booking', propertyId] as const,
  rates: (propertyId: string) => ['booking-rates', propertyId] as const,
  bookings: (propertyId: string) => ['bookings', propertyId] as const,
};

// Fetch booking rates
const fetchBookingRates = async (propertyId: string): Promise<BookingRates> => {
  const { data, error } = await supabase
    .from('property_booking_rates')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data || {
    property_id: propertyId,
    low_season_rate: 0,
    medium_season_rate: 0,
    high_season_rate: 0,
    holiday_rate: 0,
    extra_guest_price: 0,
    pm_commission: 0,
    cash_payment: false,
    credit_card_payment: false,
    debit_card_payment: false,
    stripe_payment: false,
    deposit_payment: false,
  };
};

// Fetch bookings
const fetchBookings = async (propertyId: string): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from('property_bookings')
    .select('*')
    .eq('property_id', propertyId)
    .order('check_in_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

export function BookingTabOptimized({ propertyId }: BookingTabOptimizedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Use the new bookings hook
  const {
    bookings: propertyBookings = [],
    loading: loadingBookings,
    isCreating,
    isUpdating,
    isDeleting,
  } = usePropertyBookings(propertyId) as any;

  // Fetch booking rates query
  const {
    data: rates,
    isLoading: isLoadingRates,
    isFetching: isFetchingRates,
    error: ratesError,
  } = useQuery({
    queryKey: bookingKeys.rates(propertyId),
    queryFn: () => fetchBookingRates(propertyId),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Use propertyBookings from the hook above instead of separate query

  const isLoading = isLoadingRates || loadingBookings;
  const isFetching = isFetchingRates;
  const error = ratesError;

  const [formData, setFormData] = useState<BookingRates>({
    property_id: propertyId,
    low_season_rate: 0,
    medium_season_rate: 0,
    high_season_rate: 0,
    holiday_rate: 0,
    extra_guest_price: 0,
    pm_commission: 0,
    cash_payment: false,
    credit_card_payment: false,
    debit_card_payment: false,
    stripe_payment: false,
    deposit_payment: false,
  });

  // Update form data when rates are loaded
  React.useEffect(() => {
    if (rates) {
      setFormData(rates);
    }
  }, [rates]);

  // Save booking rates mutation
  const saveRatesMutation = useMutation({
    mutationFn: async (ratesData: BookingRates) => {
      if (rates?.rate_id) {
        // Update existing rates
        const { data, error } = await supabase
          .from('property_booking_rates')
          .update(ratesData)
          .eq('rate_id', rates.rate_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new rates
        const { data, error } = await supabase
          .from('property_booking_rates')
          .insert([ratesData])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all(propertyId) });
      toast({
        title: 'Success',
        description: 'Booking rates saved successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save booking rates',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    saveRatesMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof BookingRates, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Booking handlers
  const handleCreateBooking = () => {
    setEditingBooking(null);
    setShowBookingDialog(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setShowBookingDialog(true);
  };

  const handleBookingSubmit = async (bookingData: BookingInsert) => {
    try {
      if (editingBooking) {
        // Update existing booking
        const { data, error } = await supabase
          .from('property_bookings')
          .update(bookingData)
          .eq('booking_id', editingBooking.booking_id)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success",
          description: "Booking updated successfully",
        });
      } else {
        // Create new booking
        const { data, error } = await supabase
          .from('property_bookings')
          .insert([bookingData])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success",
          description: "Booking created successfully",
        });
      }

      // Close dialog and refresh
      setShowBookingDialog(false);
      setEditingBooking(null);
      queryClient.invalidateQueries({ queryKey: bookingQueryKeys.property(propertyId) });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save booking",
        variant: "destructive",
      });
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleExportCalendar = () => {
    if (propertyBookings.length === 0) {
      toast({
        title: 'No bookings',
        description: 'There are no bookings to export',
        variant: 'destructive',
      });
      return;
    }

    // Generate iCal format
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mikaza Sukaza PMS//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    propertyBookings.forEach((booking) => {
      const startDate = new Date(booking.check_in_date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = new Date(booking.check_out_date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      icalContent.push(
        'BEGIN:VEVENT',
        `UID:${booking.booking_id}@mikaza-sukaza.com`,
        `DTSTAMP:${startDate}`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${booking.guest_name} - Booking`,
        `DESCRIPTION:Guests: ${booking.number_of_guests || 0}\\nPrice: $${booking.total_amount || 0}\\nStatus: ${booking.booking_status || 'pending'}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icalContent.push('END:VCALENDAR');

    const blob = new Blob([icalContent.join('\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `property-${propertyId}-bookings.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Calendar exported successfully',
    });
  };

  const getBookedDates = () => {
    const booked = new Set<string>();
    propertyBookings.forEach((booking) => {
      const start = new Date(booking.check_in_date);
      const end = new Date(booking.check_out_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        booked.add(d.toISOString().split('T')[0]);
      }
    });
    return booked;
  };

  const bookedDates = getBookedDates();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <TabLoadingSpinner message="Loading booking settings..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-4">
          <CalendarDays className="h-12 w-12 mx-auto mb-2" />
          <p>Failed to load booking settings</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: bookingKeys.all(propertyId) })}>
          Try Again
        </Button>
      </div>
    );
  }

  const paymentMethods = [
    { key: 'cash_payment', label: 'Cash', icon: Banknote, color: 'bg-green-500' },
    { key: 'credit_card_payment', label: 'Credit Card', icon: CreditCard, color: 'bg-blue-500' },
    { key: 'debit_card_payment', label: 'Debit Card', icon: CreditCard, color: 'bg-purple-500' },
    { key: 'stripe_payment', label: 'Stripe', icon: Wallet, color: 'bg-indigo-500' },
    { key: 'deposit_payment', label: 'Deposit', icon: DollarSign, color: 'bg-amber-500' },
  ];

  const enabledPaymentMethods = paymentMethods.filter(method => formData[method.key as keyof BookingRates]);

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay for background fetching */}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
          <TabLoadingSpinner message="Updating booking settings..." />
        </div>
      )}

      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Booking Management
          </h2>
          <p className="text-muted-foreground">
            Set rates, payment methods, and manage property calendar
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveRatesMutation.isPending}
          className="bg-primary hover:bg-primary/90 shadow-lg"
        >
          <Save className="mr-2 h-4 w-4" />
          {saveRatesMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-900">${formData.low_season_rate}</p>
            <p className="text-sm text-green-700">Low Season</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-900">${formData.holiday_rate}</p>
            <p className="text-sm text-amber-700">Holiday Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <Percent className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-900">{formData.pm_commission}%</p>
            <p className="text-sm text-blue-700">Commission</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <CreditCard className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-900">{enabledPaymentMethods.length}</p>
            <p className="text-sm text-purple-700">Payment Methods</p>
          </CardContent>
        </Card>
      </div>

      {/* Booking Rates */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
          <CardTitle className="flex items-center gap-3 text-green-900">
            <DollarSign className="h-5 w-5" />
            Seasonal Rates & Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Seasonal Rates */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Seasonal Rates (per night)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="low_season_rate" className="text-sm font-medium flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Low Season Rate
                </Label>
                <Input
                  id="low_season_rate"
                  type="number"
                  step="0.01"
                  value={formData.low_season_rate}
                  onChange={(e) => handleInputChange('low_season_rate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medium_season_rate" className="text-sm font-medium flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  Medium Season Rate
                </Label>
                <Input
                  id="medium_season_rate"
                  type="number"
                  step="0.01"
                  value={formData.medium_season_rate}
                  onChange={(e) => handleInputChange('medium_season_rate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="high_season_rate" className="text-sm font-medium flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  High Season Rate
                </Label>
                <Input
                  id="high_season_rate"
                  type="number"
                  step="0.01"
                  value={formData.high_season_rate}
                  onChange={(e) => handleInputChange('high_season_rate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday_rate" className="text-sm font-medium flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  Holiday Rate
                </Label>
                <Input
                  id="holiday_rate"
                  type="number"
                  step="0.01"
                  value={formData.holiday_rate}
                  onChange={(e) => handleInputChange('holiday_rate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Additional Pricing */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Additional Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="extra_guest_price" className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Extra Guest Price
                </Label>
                <Input
                  id="extra_guest_price"
                  type="number"
                  step="0.01"
                  value={formData.extra_guest_price}
                  onChange={(e) => handleInputChange('extra_guest_price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm_commission" className="text-sm font-medium flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  PM Commission (%)
                </Label>
                <Input
                  id="pm_commission"
                  type="number"
                  step="0.01"
                  value={formData.pm_commission}
                  onChange={(e) => handleInputChange('pm_commission', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardTitle className="flex items-center gap-3 text-blue-900">
            <CreditCard className="h-5 w-5" />
            Accepted Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isEnabled = formData[method.key as keyof BookingRates] as boolean;

              return (
                <div
                  key={method.key}
                  className={`p-4 border rounded-lg transition-all cursor-pointer ${
                    isEnabled
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-muted-foreground/20 hover:border-primary/50'
                  }`}
                  onClick={() => handleInputChange(method.key as keyof BookingRates, !isEnabled)}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`p-2 rounded-lg ${isEnabled ? method.color : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${isEnabled ? 'text-white' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-medium ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {method.label}
                      </p>
                      <Checkbox
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleInputChange(method.key as keyof BookingRates, checked)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Section */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-purple-900">
              <CalendarDays className="h-5 w-5" />
              Booking Calendar - {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              modifiers={{
                booked: (date) => bookedDates.has(date.toISOString().split('T')[0]),
              }}
              modifiersStyles={{
                booked: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'white',
                  fontWeight: 'bold',
                },
              }}
              className="rounded-md border border-border/50 bg-background/50 backdrop-blur-sm pointer-events-auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <BookingsTable
        bookings={propertyBookings}
        onEdit={handleEditBooking}
        emptyMessage="No bookings for this property yet. Create a new booking to get started."
      />

      {/* New Booking & Calendar Sync */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* New Booking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full bg-accent hover:bg-accent-hover text-accent-foreground"
              onClick={handleCreateBooking}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Booking
            </Button>
            <div className="text-sm text-muted-foreground text-center">
              {propertyBookings.length} active booking{propertyBookings.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Calendar Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Import Calendar
            </Button>
            <Button variant="outline" className="w-full" onClick={handleExportCalendar}>
              <Download className="mr-2 h-4 w-4" />
              Export Calendar ({propertyBookings.length} bookings)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notice */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Note:</strong> Remember to save your changes before leaving this page. Your pricing and payment settings will affect all future bookings.
        </AlertDescription>
      </Alert>

      {/* Booking Dialog */}
      <BookingDialogEnhanced
        open={showBookingDialog}
        onOpenChange={setShowBookingDialog}
        onSubmit={handleBookingSubmit}
        isSubmitting={isCreating || isUpdating}
        propertyId={propertyId}
        booking={editingBooking}
      />
    </div>
  );
}