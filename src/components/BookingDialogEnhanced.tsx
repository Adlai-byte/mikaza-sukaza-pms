import React, { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import {
  Calendar as CalendarIcon,
  User,
  Mail,
  Phone,
  Users,
  DollarSign,
  CreditCard,
  FileText,
  AlertCircle,
  Save,
  X,
  Building,
  Plus,
  Check,
  Sparkles,
} from 'lucide-react';
import { Booking, BookingInsert } from '@/lib/schemas';
import { format, parseISO, differenceInDays } from 'date-fns';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';

interface AdditionalOption {
  id: string;
  label: string;
  description: string;
  price: number;
  icon: React.ElementType;
  selected: boolean;
}

interface BookingDialogEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BookingInsert) => void;
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

  const [formData, setFormData] = useState<BookingInsert>({
    property_id: propertyId || booking?.property_id || '',
    guest_name: booking?.guest_name || '',
    guest_email: booking?.guest_email || '',
    guest_phone: booking?.guest_phone || '',
    check_in_date: booking?.check_in_date || defaultCheckIn || '',
    check_out_date: booking?.check_out_date || defaultCheckOut || '',
    number_of_guests: booking?.number_of_guests || 1,
    total_amount: booking?.total_amount || 0,
    deposit_amount: booking?.deposit_amount || 0,
    payment_method: booking?.payment_method || '',
    booking_status: (booking?.booking_status as any) || 'pending',
    special_requests: booking?.special_requests || '',
  });

  const [additionalOptions, setAdditionalOptions] = useState<AdditionalOption[]>([
    {
      id: 'extra_cleaning',
      label: 'Extra Cleaning',
      description: 'Deep cleaning service before arrival',
      price: 75,
      icon: Sparkles,
      selected: false,
    },
    {
      id: 'airport_pickup',
      label: 'Airport Pickup',
      description: 'Private transfer from airport',
      price: 85,
      icon: CreditCard,
      selected: false,
    },
    {
      id: 'late_checkin',
      label: 'Late Check-in',
      description: 'Check-in after 10 PM',
      price: 50,
      icon: CalendarIcon,
      selected: false,
    },
    {
      id: 'early_checkout',
      label: 'Early Check-out',
      description: 'Check-out before 8 AM',
      price: 40,
      icon: CalendarIcon,
      selected: false,
    },
    {
      id: 'pet_fee',
      label: 'Pet Friendly',
      description: 'Bring your furry friend',
      price: 100,
      icon: Users,
      selected: false,
    },
    {
      id: 'parking',
      label: 'Parking Space',
      description: 'Reserved parking spot',
      price: 30,
      icon: CreditCard,
      selected: false,
    },
    {
      id: 'breakfast',
      label: 'Breakfast Included',
      description: 'Daily breakfast service',
      price: 25,
      icon: DollarSign,
      selected: false,
    },
    {
      id: 'extra_keys',
      label: 'Extra Keys',
      description: 'Additional set of keys',
      price: 15,
      icon: Plus,
      selected: false,
    },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [baseAmount, setBaseAmount] = useState(0);

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setFormData({
        property_id: propertyId || booking?.property_id || '',
        guest_name: booking?.guest_name || '',
        guest_email: booking?.guest_email || '',
        guest_phone: booking?.guest_phone || '',
        check_in_date: booking?.check_in_date || defaultCheckIn || '',
        check_out_date: booking?.check_out_date || defaultCheckOut || '',
        number_of_guests: booking?.number_of_guests || 1,
        total_amount: booking?.total_amount || 0,
        deposit_amount: booking?.deposit_amount || 0,
        payment_method: booking?.payment_method || '',
        booking_status: (booking?.booking_status as any) || 'pending',
        special_requests: booking?.special_requests || '',
      });
      setErrors({});

      // Parse special requests if it contains options JSON
      if (booking?.special_requests) {
        try {
          const parsed = JSON.parse(booking.special_requests);
          if (parsed.options && Array.isArray(parsed.options)) {
            setAdditionalOptions(prev =>
              prev.map(opt => ({
                ...opt,
                selected: parsed.options.includes(opt.id)
              }))
            );
          }
        } catch (e) {
          // Not JSON, just regular text
        }
      } else {
        // Reset options
        setAdditionalOptions(prev => prev.map(opt => ({ ...opt, selected: false })));
      }
    }
  }, [open, booking, propertyId, defaultCheckIn, defaultCheckOut]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.property_id) {
      newErrors.property_id = 'Please select a property';
    }

    if (!formData.guest_name.trim()) {
      newErrors.guest_name = 'Guest name is required';
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

    if (formData.total_amount && formData.total_amount < 0) {
      newErrors.total_amount = 'Amount cannot be negative';
    }

    if (formData.deposit_amount && formData.deposit_amount < 0) {
      newErrors.deposit_amount = 'Deposit cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Encode selected options into special_requests
    const selectedOptionIds = additionalOptions.filter(opt => opt.selected).map(opt => opt.id);
    const optionsData = {
      options: selectedOptionIds,
      notes: formData.special_requests || ''
    };

    const submissionData = {
      ...formData,
      special_requests: JSON.stringify(optionsData),
      total_amount: calculateTotalAmount(),
    };

    onSubmit(submissionData);
  };

  const handleChange = (field: keyof BookingInsert, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleOptionToggle = (optionId: string) => {
    setAdditionalOptions(prev =>
      prev.map(opt =>
        opt.id === optionId ? { ...opt, selected: !opt.selected } : opt
      )
    );
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

  const calculateOptionsTotal = () => {
    return additionalOptions
      .filter(opt => opt.selected)
      .reduce((sum, opt) => sum + opt.price, 0);
  };

  const calculateTotalAmount = () => {
    const optionsTotal = calculateOptionsTotal();
    return (formData.total_amount || 0) + optionsTotal;
  };

  const nights = calculateNights();
  const optionsTotal = calculateOptionsTotal();
  const grandTotal = calculateTotalAmount();

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
              : 'Select property, fill in guest details, and choose additional options'}
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

          {/* Guest Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Guest Information
            </h3>

            <div className="space-y-2">
              <Label htmlFor="guest_name" className="required">
                Guest Name *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guest_name"
                  value={formData.guest_name}
                  onChange={(e) => handleChange('guest_name', e.target.value)}
                  placeholder="John Doe"
                  className={`pl-10 ${errors.guest_name ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.guest_name && (
                <p className="text-sm text-red-500">{errors.guest_name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guest_email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest_email"
                    type="email"
                    value={formData.guest_email || ''}
                    onChange={(e) => handleChange('guest_email', e.target.value)}
                    placeholder="john@example.com"
                    className={`pl-10 ${errors.guest_email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.guest_email && (
                  <p className="text-sm text-red-500">{errors.guest_email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest_phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest_phone"
                    type="tel"
                    value={formData.guest_phone || ''}
                    onChange={(e) => handleChange('guest_phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Booking Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Booking Dates
            </h3>

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
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Additional Options
            </h3>
            <p className="text-sm text-muted-foreground">
              Enhance your stay with these optional services
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {additionalOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      option.selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-muted-foreground/20 hover:border-primary/50'
                    }`}
                    onClick={() => handleOptionToggle(option.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={option.selected}
                        onCheckedChange={() => handleOptionToggle(option.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{option.label}</span>
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            +${option.price}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {optionsTotal > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <Plus className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{additionalOptions.filter(o => o.selected).length}</strong> option{additionalOptions.filter(o => o.selected).length > 1 ? 's' : ''} selected •
                  Additional: <strong>${optionsTotal.toFixed(2)}</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Pricing & Payment
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="total_amount">Base Amount ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_amount || ''}
                    onChange={(e) => handleChange('total_amount', parseFloat(e.target.value) || 0)}
                    className={`pl-10 ${errors.total_amount ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.total_amount && (
                  <p className="text-sm text-red-500">{errors.total_amount}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit_amount">Deposit ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="deposit_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deposit_amount || ''}
                    onChange={(e) => handleChange('deposit_amount', parseFloat(e.target.value) || 0)}
                    className={`pl-10 ${errors.deposit_amount ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.deposit_amount && (
                  <p className="text-sm text-red-500">{errors.deposit_amount}</p>
                )}
              </div>
            </div>

            {/* Total Summary */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Base Amount:</span>
                    <span className="font-medium">${(formData.total_amount || 0).toFixed(2)}</span>
                  </div>
                  {optionsTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Additional Options:</span>
                      <span className="font-medium text-primary">+${optionsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total:</span>
                    <span className="text-primary">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="booking_status">Status</Label>
                <Select
                  value={formData.booking_status || 'pending'}
                  onValueChange={(value) => handleChange('booking_status', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

          <DialogFooter className="gap-2">
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
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
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
    </Dialog>
  );
}
