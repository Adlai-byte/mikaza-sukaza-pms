import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import {
  Calendar as CalendarIcon,
  User,
  Mail,
  Phone,
  Users,
  Save,
  X,
  Building,
  Check,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  Home,
  AlertTriangle,
} from 'lucide-react';
import { Booking, BookingInsert, Guest, BookingJobConfig, defaultBookingJobConfigs, CustomBookingTask, Task } from '@/lib/schemas';
import { CreateBookingParams } from '@/hooks/useBookings';
import { useBookingTasks } from '@/hooks/useBookingTasks';
import { BookingJobsSection } from '@/components/booking/BookingJobsSection';
import { format, parseISO, differenceInDays, eachDayOfInterval, isSameDay, addMonths } from 'date-fns';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useBillTemplates } from '@/hooks/useBillTemplates';
import { useBookingConflicts } from '@/hooks/useBookingConflicts';
import { useGuests } from '@/hooks/useGuests';
import { usePropertyBookings } from '@/hooks/useBookings';
import { BookingConflictAlert } from '@/components/BookingConflictAlert';
import { GuestDialog } from '@/components/GuestDialog';
import { UserPlus, ListTodo } from 'lucide-react';

interface BookingDialogEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateBookingParams) => void;
  isSubmitting?: boolean;
  propertyId?: string;
  booking?: Booking | null;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
}

export function BookingDialogEnhanced({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  propertyId,
  booking,
  defaultCheckIn,
  defaultCheckOut,
}: BookingDialogEnhancedProps) {
  const isEditing = !!booking;
  const { properties, loading: loadingProperties } = usePropertiesOptimized();
  const { data: guests, isLoading: loadingGuests } = useGuests();

  // Fetch existing tasks for the booking (when editing)
  const { data: existingTasks = [], isLoading: loadingTasks } = useBookingTasks(
    isEditing && booking?.booking_id ? booking.booking_id : null
  );

  const [formData, setFormData] = useState<BookingInsert>({
    property_id: propertyId || booking?.property_id || '',
    unit_id: booking?.unit_id || null,
    guest_id: booking?.guest_id || null,
    guest_name: booking?.guest_name || '',
    guest_email: booking?.guest_email || '',
    guest_phone: booking?.guest_phone || '',
    check_in_date: booking?.check_in_date || defaultCheckIn || '',
    check_out_date: booking?.check_out_date || defaultCheckOut || '',
    number_of_guests: booking?.number_of_guests || 1,
    total_amount: null, // Pricing handled in invoice
    deposit_amount: null, // Deposits handled in invoice/payment
    payment_method: booking?.payment_method || '',
    booking_status: (booking?.booking_status as any) || 'pending',
    special_requests: booking?.special_requests || '',
    booking_channel: booking?.booking_channel || undefined,
    payment_status: booking?.payment_status || 'pending',
    bill_template_id: booking?.bill_template_id || null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    booking?.bill_template_id || null
  );
  const [softConflictAcknowledged, setSoftConflictAcknowledged] = useState(false);
  const [showCreateGuestDialog, setShowCreateGuestDialog] = useState(false);
  const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false);

  // Job configs for auto-generating tasks (only for new bookings)
  const [jobConfigs, setJobConfigs] = useState<BookingJobConfig[]>([...defaultBookingJobConfigs]);
  const [autoGenerateJobs, setAutoGenerateJobs] = useState(true);
  // Custom tasks (always available, independent of auto-generate)
  const [customTasks, setCustomTasks] = useState<CustomBookingTask[]>([]);

  // Active booking warning state for job generation
  const [showActiveBookingWarning, setShowActiveBookingWarning] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<CreateBookingParams | null>(null);

  // Fetch property bookings for calendar view
  const { bookings: propertyBookings, loading: loadingPropertyBookings } = usePropertyBookings(
    formData.property_id || ''
  );

  // Calculate booked dates for the calendar
  const bookedDates = useMemo(() => {
    if (!propertyBookings || propertyBookings.length === 0) return [];

    const dates: Date[] = [];
    propertyBookings.forEach((b) => {
      // Skip cancelled bookings and the current booking being edited
      if (b.booking_status === 'cancelled') return;
      if (booking?.booking_id && b.booking_id === booking.booking_id) return;

      if (b.check_in_date && b.check_out_date) {
        try {
          const interval = eachDayOfInterval({
            start: parseISO(b.check_in_date),
            end: parseISO(b.check_out_date),
          });
          dates.push(...interval);
        } catch (e) {
          console.error('Error parsing booking dates:', e);
        }
      }
    });
    return dates;
  }, [propertyBookings, booking?.booking_id]);

  // Group bookings by status for legend
  const bookingsByStatus = useMemo(() => {
    if (!propertyBookings) return { confirmed: 0, pending: 0, checked_in: 0 };

    return propertyBookings.reduce((acc, b) => {
      if (b.booking_status === 'cancelled') return acc;
      if (booking?.booking_id && b.booking_id === booking.booking_id) return acc;

      if (b.booking_status === 'confirmed') acc.confirmed++;
      else if (b.booking_status === 'pending') acc.pending++;
      else if (b.booking_status === 'checked_in') acc.checked_in++;
      return acc;
    }, { confirmed: 0, pending: 0, checked_in: 0 });
  }, [propertyBookings, booking?.booking_id]);

  // Fetch bill templates for selected property
  const { data: billTemplates, isLoading: loadingTemplates } = useBillTemplates(
    formData.property_id || undefined
  );

  // Check for booking conflicts (unit-aware)
  const { conflictStatus, isChecking: isCheckingConflicts } = useBookingConflicts(
    formData.property_id,
    formData.check_in_date,
    formData.check_out_date,
    formData.unit_id,  // Unit-aware conflict checking
    booking?.booking_id // Exclude current booking when editing
  );

  // Reset form when dialog opens with new data
  useEffect(() => {
    console.log('🎭 BookingDialogEnhanced - open state changed:', {
      open,
      isEditing,
      propertyId,
      defaultCheckIn,
      defaultCheckOut,
      hasBooking: !!booking
    });

    if (open) {
      setFormData({
        property_id: propertyId || booking?.property_id || '',
        unit_id: booking?.unit_id || null,
        guest_id: booking?.guest_id || null,
        guest_name: booking?.guest_name || '',
        guest_email: booking?.guest_email || '',
        guest_phone: booking?.guest_phone || '',
        check_in_date: booking?.check_in_date || defaultCheckIn || '',
        check_out_date: booking?.check_out_date || defaultCheckOut || '',
        number_of_guests: booking?.number_of_guests || 1,
        total_amount: null, // Pricing handled in invoice
        deposit_amount: null, // Deposits handled in invoice/payment
        payment_method: booking?.payment_method || '',
        booking_status: (booking?.booking_status as any) || 'pending',
        special_requests: booking?.special_requests || '',
        booking_channel: booking?.booking_channel || undefined,
        payment_status: booking?.payment_status || 'pending',
        bill_template_id: booking?.bill_template_id || null,
      });
      setSelectedTemplateId(booking?.bill_template_id || null);
      setSoftConflictAcknowledged(false);
      setErrors({});
      // Reset custom tasks when opening dialog
      setCustomTasks([]);
    }
  }, [open, booking, propertyId, defaultCheckIn, defaultCheckOut, isEditing]);

  // Handle guest selection
  const handleGuestSelect = (guestId: string) => {
    if (guestId === 'create-new') {
      setShowCreateGuestDialog(true);
      return;
    }

    const selectedGuest = guests?.find((g: Guest) => g.guest_id === guestId);
    if (selectedGuest) {
      setFormData(prev => ({
        ...prev,
        guest_id: selectedGuest.guest_id!,
        guest_name: `${selectedGuest.first_name} ${selectedGuest.last_name}`,
        guest_email: selectedGuest.email,
        guest_phone: selectedGuest.phone_primary || '',
      }));
    }
  };

  // Reset soft conflict acknowledgment when dates or property change
  useEffect(() => {
    setSoftConflictAcknowledged(false);
  }, [formData.property_id, formData.check_in_date, formData.check_out_date]);

  // Handle bill template selection
  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      setSelectedTemplateId(null);
      setFormData({ ...formData, bill_template_id: null });
      return;
    }

    // Simply store the template ID - pricing will be applied during invoice generation
    setSelectedTemplateId(templateId);
    setFormData({ ...formData, bill_template_id: templateId });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.property_id) {
      newErrors.property_id = 'Please select a property';
    }

    if (!formData.guest_id && !formData.guest_name.trim()) {
      newErrors.guest_id = 'Please select a guest';
    }

    if (formData.guest_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) {
      newErrors.guest_email = 'Invalid email format';
    }

    if (!formData.check_in_date) {
      newErrors.check_in_date = 'Check-in date is required';
    }

    if (!formData.check_out_date) {
      newErrors.check_out_date = 'Check-out date is required';
    }

    if (formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date);
      const checkOut = new Date(formData.check_out_date);

      if (checkOut <= checkIn) {
        newErrors.check_out_date = 'Check-out must be after check-in';
      }

      if (checkIn < new Date(new Date().setHours(0, 0, 0, 0)) && !isEditing) {
        newErrors.check_in_date = 'Check-in cannot be in the past';
      }
    }

    if (formData.number_of_guests && formData.number_of_guests < 1) {
      newErrors.number_of_guests = 'At least 1 guest required';
    }

    console.log('🔍 validateForm result:', { newErrors, isValid: Object.keys(newErrors).length === 0 });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 handleSubmit called', { formData, errors, conflictStatus, softConflictAcknowledged });

    if (!validateForm()) {
      console.log('❌ Form validation failed', errors);
      return;
    }

    // Check for booking conflicts
    if (conflictStatus.type === 'hard') {
      console.log('❌ Hard conflict detected, cannot proceed');
      // Cannot proceed with hard conflicts
      return;
    }

    if (conflictStatus.type === 'soft' && !softConflictAcknowledged) {
      console.log('⚠️ Soft conflict not acknowledged');
      // User must acknowledge soft conflicts before proceeding
      return;
    }

    // Include job configs when auto-generating jobs (for both create and edit)
    // Also include custom tasks (always, as they're independent of auto-generate toggle)
    const validCustomTasks = customTasks.filter(t => t.title.trim() !== '');
    const submitData: CreateBookingParams = {
      ...formData,
      jobConfigs: autoGenerateJobs ? jobConfigs.filter(j => j.enabled) : undefined,
      customTasks: validCustomTasks.length > 0 ? validCustomTasks : undefined,
    };

    // Check for active bookings when auto-generating jobs (except check_in/check_out)
    if (autoGenerateJobs) {
      const enabledJobTypes = jobConfigs.filter(j => j.enabled).map(j => j.jobType);
      const skipWarningTypes = ['check_in', 'check_out'];
      const hasNonSkipJobs = enabledJobTypes.some(t => !skipWarningTypes.includes(t));

      if (hasNonSkipJobs && propertyBookings) {
        const activeBookings = propertyBookings.filter(b =>
          ['confirmed', 'checked_in'].includes(b.booking_status) &&
          b.booking_id !== booking?.booking_id
        );

        if (activeBookings.length > 0) {
          console.log('⚠️ Active bookings found, showing warning', activeBookings);
          setPendingSubmitData(submitData);
          setShowActiveBookingWarning(true);
          return;
        }
      }
    }

    console.log('✅ Submitting booking data:', submitData);
    onSubmit(submitData);
  };

  // Handler for proceeding with submission despite active booking warning
  const handleProceedWithActiveBooking = () => {
    if (pendingSubmitData) {
      console.log('✅ Proceeding with booking despite active bookings');
      onSubmit(pendingSubmitData);
      setShowActiveBookingWarning(false);
      setPendingSubmitData(null);
    }
  };

  // Handler for acknowledging soft conflicts
  const handleProceedWithConflict = () => {
    setSoftConflictAcknowledged(true);
  };

  // Handler for changing dates (clears date fields to let user select new ones)
  const handleChangeDates = () => {
    setFormData({
      ...formData,
      check_in_date: '',
      check_out_date: '',
    });
    setSoftConflictAcknowledged(false);
  };

  const handleChange = (field: keyof BookingInsert, value: any) => {
    // Reset unit_id when property changes (new property may have different units)
    if (field === 'property_id') {
      setFormData(prev => ({ ...prev, [field]: value, unit_id: null }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculateNights = () => {
    if (formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date);
      const checkOut = new Date(formData.check_out_date);
      const nights = differenceInDays(checkOut, checkIn);
      return nights > 0 ? nights : 0;
    }
    return 0;
  };

  const nights = calculateNights();

  const selectedProperty = properties.find(p => p.property_id === formData.property_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CalendarIcon className="h-6 w-6 text-primary" />
            {isEditing ? 'Edit Booking' : 'Create New Booking'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the booking details below'
              : 'Select property and fill in guest details'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Selection */}
          {!propertyId && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Select Property
              </h3>
              <div className="space-y-2">
                <Label htmlFor="property_id" className="required">
                  Property *
                </Label>
                <Select
                  value={formData.property_id}
                  onValueChange={(value) => handleChange('property_id', value)}
                  disabled={loadingProperties}
                >
                  <SelectTrigger className={`w-full ${errors.property_id ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Choose a property..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.property_id} value={property.property_id!}>
                        {property.property_name} - {property.property_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.property_id && (
                  <p className="text-sm text-red-500">{errors.property_id}</p>
                )}
                {selectedProperty && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-blue-900">{selectedProperty.property_name}</p>
                          <p className="text-blue-700">
                            Capacity: {selectedProperty.capacity} guests • {selectedProperty.num_bedrooms} bed • {selectedProperty.num_bathrooms} bath
                          </p>
                        </div>
                        <Check className="h-5 w-5 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Unit Selection - Only show if property has units */}
          {formData.property_id && selectedProperty?.units && selectedProperty.units.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Select Unit
              </h3>
              <div className="space-y-2">
                <Label htmlFor="unit_id">
                  Unit
                </Label>
                <Select
                  value={formData.unit_id || "entire_property"}
                  onValueChange={(value) => handleChange('unit_id', value === "entire_property" ? null : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a unit or entire property..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entire_property">
                      Entire Property (All {selectedProperty.units.length} Units)
                    </SelectItem>
                    {selectedProperty.units.map((unit: any) => (
                      <SelectItem key={unit.unit_id} value={unit.unit_id}>
                        {unit.property_name || `Unit ${unit.unit_id?.slice(0, 8)}`}
                        {unit.license_number && ` - ${unit.license_number}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.unit_id
                    ? "Booking this specific unit only"
                    : "Booking the entire property will block all units"
                  }
                </p>
              </div>
            </div>
          )}

          {/* Bill Template Selector */}
          {formData.property_id && billTemplates && billTemplates.length > 0 && !isEditing && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Pricing Template
              </h3>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-900">
                  Select a template (optional) to use when creating the invoice. Pricing details will be applied during invoice generation.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="bill_template_id">Template (Optional)</Label>
                <Select
                  value={selectedTemplateId || 'none'}
                  onValueChange={handleTemplateSelect}
                  disabled={loadingTemplates}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a pricing template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No template - Set pricing in invoice</span>
                    </SelectItem>
                    {billTemplates
                      ?.filter(t => t.is_active)
                      .map((template) => (
                        <SelectItem key={template.template_id} value={template.template_id!}>
                          {template.template_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Guest Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Guest Information
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateGuestDialog(true)}
                disabled={loadingGuests}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create New Guest
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest_id" className="required">
                Select Guest *
              </Label>
              <Select
                value={formData.guest_id || ''}
                onValueChange={handleGuestSelect}
                disabled={loadingGuests}
              >
                <SelectTrigger className={`w-full ${errors.guest_id ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Choose a guest..." />
                </SelectTrigger>
                <SelectContent>
                  {guests?.map((guest: Guest) => (
                    <SelectItem key={guest.guest_id} value={guest.guest_id!}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {guest.first_name} {guest.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">{guest.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.guest_id && (
                <p className="text-sm text-red-500">{errors.guest_id}</p>
              )}
            </div>

            {/* Display selected guest info */}
            {formData.guest_id && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">{formData.guest_name}</span>
                    </div>
                    {formData.guest_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <a
                          href={`mailto:${formData.guest_email}`}
                          className="text-blue-700 hover:underline"
                        >
                          {formData.guest_email}
                        </a>
                      </div>
                    )}
                    {formData.guest_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <a
                          href={`tel:${formData.guest_phone}`}
                          className="text-blue-700 hover:underline"
                        >
                          {formData.guest_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Booking Dates
            </h3>

            {/* Property Availability Calendar */}
            {formData.property_id && (
              <Collapsible open={showAvailabilityCalendar} onOpenChange={setShowAvailabilityCalendar}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View Property Availability
                      {propertyBookings && propertyBookings.length > 0 && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {propertyBookings.filter(b => b.booking_status !== 'cancelled' && b.booking_id !== booking?.booking_id).length} bookings
                        </span>
                      )}
                    </span>
                    {showAvailabilityCalendar ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <Card className="border-dashed">
                    <CardContent className="p-4">
                      {loadingPropertyBookings ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="ml-2 text-muted-foreground">Loading bookings...</span>
                        </div>
                      ) : (
                        <>
                          {/* Legend */}
                          <div className="flex flex-wrap gap-4 mb-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-red-200 border border-red-400"></div>
                              <span className="text-muted-foreground">Booked dates</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-accent border border-border"></div>
                              <span className="text-muted-foreground">Today</span>
                            </div>
                            {(bookingsByStatus.confirmed > 0 || bookingsByStatus.pending > 0 || bookingsByStatus.checked_in > 0) && (
                              <div className="ml-auto text-xs text-muted-foreground">
                                {bookingsByStatus.confirmed > 0 && <span className="mr-2">Confirmed: {bookingsByStatus.confirmed}</span>}
                                {bookingsByStatus.pending > 0 && <span className="mr-2">Pending: {bookingsByStatus.pending}</span>}
                                {bookingsByStatus.checked_in > 0 && <span>Checked In: {bookingsByStatus.checked_in}</span>}
                              </div>
                            )}
                          </div>

                          {/* Calendar */}
                          <div className="flex justify-center">
                            <Calendar
                              mode="multiple"
                              selected={bookedDates}
                              numberOfMonths={2}
                              defaultMonth={new Date()}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              modifiers={{
                                booked: bookedDates,
                              }}
                              modifiersStyles={{
                                booked: {
                                  backgroundColor: 'rgb(254 202 202)',
                                  color: 'rgb(153 27 27)',
                                  fontWeight: '500',
                                },
                              }}
                              className="rounded-md border"
                            />
                          </div>

                          {/* Upcoming Bookings List */}
                          {propertyBookings && propertyBookings.filter(b =>
                            b.booking_status !== 'cancelled' &&
                            b.booking_id !== booking?.booking_id &&
                            new Date(b.check_out_date) >= new Date()
                          ).length > 0 && (
                            <div className="mt-4 space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">Upcoming Bookings:</p>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {propertyBookings
                                  .filter(b =>
                                    b.booking_status !== 'cancelled' &&
                                    b.booking_id !== booking?.booking_id &&
                                    new Date(b.check_out_date) >= new Date()
                                  )
                                  .sort((a, b) => new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime())
                                  .slice(0, 5)
                                  .map((b) => (
                                    <div
                                      key={b.booking_id}
                                      className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5"
                                    >
                                      <span className="font-medium truncate max-w-[150px]">
                                        {b.guest_name || 'Guest'}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {format(parseISO(b.check_in_date), 'MMM d')} - {format(parseISO(b.check_out_date), 'MMM d, yyyy')}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                                        b.booking_status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        b.booking_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        b.booking_status === 'checked_in' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {b.booking_status}
                                      </span>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          )}

                          {bookedDates.length === 0 && (
                            <Alert className="mt-4 bg-green-50 border-green-200">
                              <Check className="h-4 w-4 text-green-600" />
                              <AlertDescription className="text-green-800">
                                No existing bookings found. All dates are available!
                              </AlertDescription>
                            </Alert>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_in_date" className="required">
                  Check-in Date *
                </Label>
                <Input
                  id="check_in_date"
                  type="date"
                  value={formData.check_in_date}
                  onChange={(e) => handleChange('check_in_date', e.target.value)}
                  className={errors.check_in_date ? 'border-red-500' : ''}
                />
                {errors.check_in_date && (
                  <p className="text-sm text-red-500">{errors.check_in_date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="check_out_date" className="required">
                  Check-out Date *
                </Label>
                <Input
                  id="check_out_date"
                  type="date"
                  value={formData.check_out_date}
                  onChange={(e) => handleChange('check_out_date', e.target.value)}
                  className={errors.check_out_date ? 'border-red-500' : ''}
                />
                {errors.check_out_date && (
                  <p className="text-sm text-red-500">{errors.check_out_date}</p>
                )}
              </div>
            </div>

            {nights > 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>{nights}</strong> night{nights > 1 ? 's' : ''}
                </AlertDescription>
              </Alert>
            )}

            {/* Booking Conflict Alert */}
            {(conflictStatus.type === 'hard' || (conflictStatus.type === 'soft' && !softConflictAcknowledged)) && (
              <BookingConflictAlert
                conflict={conflictStatus}
                onChangeDates={handleChangeDates}
                onProceedAnyway={conflictStatus.type === 'soft' ? handleProceedWithConflict : undefined}
                onCancel={() => onOpenChange(false)}
              />
            )}

            {/* Soft conflict acknowledged notice */}
            {conflictStatus.type === 'soft' && softConflictAcknowledged && (
              <Alert className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Proceeding with booking</strong> - You've acknowledged the potential conflict.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Booking Details
            </h3>

            <div className="space-y-2">
              <Label htmlFor="number_of_guests">Number of Guests</Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="number_of_guests"
                  type="number"
                  min="1"
                  value={formData.number_of_guests || ''}
                  onChange={(e) => handleChange('number_of_guests', parseInt(e.target.value) || 0)}
                  className={`pl-10 ${errors.number_of_guests ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.number_of_guests && (
                <p className="text-sm text-red-500">{errors.number_of_guests}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booking_channel">Booking Channel</Label>
                <Select
                  value={formData.booking_channel || ''}
                  onValueChange={(value) => handleChange('booking_channel', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">📞 Direct Booking</SelectItem>
                    <SelectItem value="airbnb">🏠 Airbnb</SelectItem>
                    <SelectItem value="booking">🏨 Booking.com</SelectItem>
                    <SelectItem value="vrbo">🏖️ VRBO</SelectItem>
                    <SelectItem value="expedia">✈️ Expedia</SelectItem>
                    <SelectItem value="homeaway">🏡 HomeAway</SelectItem>
                    <SelectItem value="tripadvisor">🔍 TripAdvisor</SelectItem>
                    <SelectItem value="other">📋 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method || ''}
                  onValueChange={(value) => handleChange('payment_method', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select
                  value={formData.payment_status || 'pending'}
                  onValueChange={(value) => handleChange('payment_status', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">💳 Pending</SelectItem>
                    <SelectItem value="paid">✅ Paid</SelectItem>
                    <SelectItem value="partially_paid">⏳ Partially Paid</SelectItem>
                    <SelectItem value="refunded">↩️ Refunded</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking_status">Booking Status</Label>
              <Select
                value={formData.booking_status || 'pending'}
                onValueChange={(value) => handleChange('booking_status', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inquiry">💬 Inquiry</SelectItem>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                  <SelectItem value="confirmed">✅ Confirmed</SelectItem>
                  <SelectItem value="checked_in">🔑 Checked In</SelectItem>
                  <SelectItem value="checked_out">👋 Checked Out</SelectItem>
                  <SelectItem value="completed">✔️ Completed</SelectItem>
                  <SelectItem value="blocked">🚫 Blocked (Maintenance)</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_requests">Special Requests / Notes</Label>
              <Textarea
                id="special_requests"
                value={formData.special_requests || ''}
                onChange={(e) => handleChange('special_requests', e.target.value)}
                placeholder="Any special requests or notes..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          {/* Auto-Generate Jobs Section - Available for both new and existing bookings */}
          <BookingJobsSection
            jobConfigs={jobConfigs}
            onJobConfigsChange={setJobConfigs}
            autoGenerate={autoGenerateJobs}
            onAutoGenerateChange={setAutoGenerateJobs}
            checkInDate={formData.check_in_date}
            checkOutDate={formData.check_out_date}
            disabled={isSubmitting}
            customTasks={customTasks}
            onCustomTasksChange={setCustomTasks}
            existingTasks={existingTasks}
            isLoadingTasks={loadingTasks}
          />

          <DialogFooter className="gap-2">
            {/* Debug info - remove after fixing */}
            <div className="text-xs text-gray-400 mr-auto">
              {conflictStatus.type !== 'none' && `Conflict: ${conflictStatus.type}`}
              {isSubmitting && ' | Submitting'}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                conflictStatus.type === 'hard' ||
                (conflictStatus.type === 'soft' && !softConflictAcknowledged)
              }
              className="bg-primary hover:bg-primary/90"
              onClick={() => console.log('🔘 Submit button clicked', { isSubmitting, conflictStatus, softConflictAcknowledged })}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                  ? 'Update Booking'
                  : 'Create Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Guest Creation Dialog */}
      <GuestDialog
        open={showCreateGuestDialog}
        onClose={() => setShowCreateGuestDialog(false)}
        guestId={null}
      />

      {/* Active Booking Warning Dialog for Job Generation */}
      <AlertDialog open={showActiveBookingWarning} onOpenChange={setShowActiveBookingWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Active Booking Warning
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This property has active bookings (confirmed or checked-in). Creating jobs
                  for this booking may affect guests currently staying at the property.
                </p>
                {propertyBookings && (
                  <div className="bg-amber-50 dark:bg-amber-950 rounded-md p-3 text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                      Active bookings:
                    </p>
                    <ul className="list-disc list-inside text-amber-700 dark:text-amber-300 space-y-1">
                      {propertyBookings
                        .filter(b =>
                          ['confirmed', 'checked_in'].includes(b.booking_status) &&
                          b.booking_id !== booking?.booking_id
                        )
                        .slice(0, 3)
                        .map(b => (
                          <li key={b.booking_id}>
                            {b.guest_name} ({b.booking_status === 'checked_in' ? 'Checked In' : 'Confirmed'})
                            {b.check_in_date && b.check_out_date && (
                              <span className="text-xs ml-1">
                                ({format(parseISO(b.check_in_date), 'MMM d')} - {format(parseISO(b.check_out_date), 'MMM d')})
                              </span>
                            )}
                          </li>
                        ))}
                    </ul>
                    {propertyBookings.filter(b =>
                      ['confirmed', 'checked_in'].includes(b.booking_status) &&
                      b.booking_id !== booking?.booking_id
                    ).length > 3 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        And {propertyBookings.filter(b =>
                          ['confirmed', 'checked_in'].includes(b.booking_status) &&
                          b.booking_id !== booking?.booking_id
                        ).length - 3} more...
                      </p>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Do you want to proceed with creating this booking and its jobs?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowActiveBookingWarning(false);
              setPendingSubmitData(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleProceedWithActiveBooking}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
