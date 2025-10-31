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
import { Alert, AlertDescription } from '@/components/ui/alert';
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
} from 'lucide-react';
import { Booking, BookingInsert } from '@/lib/schemas';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BookingInsert) => void;
  isSubmitting?: boolean;
  propertyId?: string;
  booking?: Booking | null;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
}

export function BookingDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  propertyId,
  booking,
  defaultCheckIn,
  defaultCheckOut,
}: BookingDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!booking;

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

  const [errors, setErrors] = useState<Record<string, string>>({});

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
    }
  }, [open, booking, propertyId, defaultCheckIn, defaultCheckOut]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.guest_name.trim()) {
      newErrors.guest_name = t('bookingDialog.validation.guestNameRequired');
    }

    if (formData.guest_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) {
      newErrors.guest_email = t('bookingDialog.validation.invalidEmail');
    }

    if (!formData.check_in_date) {
      newErrors.check_in_date = t('bookingDialog.validation.checkInRequired');
    }

    if (!formData.check_out_date) {
      newErrors.check_out_date = t('bookingDialog.validation.checkOutRequired');
    }

    if (formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date);
      const checkOut = new Date(formData.check_out_date);

      if (checkOut <= checkIn) {
        newErrors.check_out_date = t('bookingDialog.validation.checkOutAfterCheckIn');
      }

      if (checkIn < new Date(new Date().setHours(0, 0, 0, 0)) && !isEditing) {
        newErrors.check_in_date = t('bookingDialog.validation.checkInPast');
      }
    }

    if (formData.number_of_guests && formData.number_of_guests < 1) {
      newErrors.number_of_guests = t('bookingDialog.validation.minGuests');
    }

    if (formData.total_amount && formData.total_amount < 0) {
      newErrors.total_amount = t('bookingDialog.validation.negativeAmount');
    }

    if (formData.deposit_amount && formData.deposit_amount < 0) {
      newErrors.deposit_amount = t('bookingDialog.validation.negativeDeposit');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const handleChange = (field: keyof BookingInsert, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CalendarIcon className="h-6 w-6 text-primary" />
            {isEditing ? t('bookingDialog.title.edit') : t('bookingDialog.title.create')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('bookingDialog.description.edit')
              : t('bookingDialog.description.create')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('bookingDialog.sections.guestInformation')}
            </h3>

            <div className="space-y-2">
              <Label htmlFor="guest_name" className="required">
                {t('bookingDialog.fields.guestName')} {t('bookingDialog.required')}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guest_name"
                  value={formData.guest_name}
                  onChange={(e) => handleChange('guest_name', e.target.value)}
                  placeholder={t('bookingDialog.placeholders.guestName')}
                  className={`pl-10 ${errors.guest_name ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.guest_name && (
                <p className="text-sm text-red-500">{errors.guest_name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guest_email">{t('bookingDialog.fields.guestEmail')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest_email"
                    type="email"
                    value={formData.guest_email || ''}
                    onChange={(e) => handleChange('guest_email', e.target.value)}
                    placeholder={t('bookingDialog.placeholders.guestEmail')}
                    className={`pl-10 ${errors.guest_email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.guest_email && (
                  <p className="text-sm text-red-500">{errors.guest_email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest_phone">{t('bookingDialog.fields.guestPhone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest_phone"
                    type="tel"
                    value={formData.guest_phone || ''}
                    onChange={(e) => handleChange('guest_phone', e.target.value)}
                    placeholder={t('bookingDialog.placeholders.guestPhone')}
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
              {t('bookingDialog.sections.bookingDates')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_in_date" className="required">
                  {t('bookingDialog.fields.checkInDate')} {t('bookingDialog.required')}
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
                  {t('bookingDialog.fields.checkOutDate')} {t('bookingDialog.required')}
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
                  <strong>{nights}</strong> {nights === 1 ? t('bookingDialog.nights.one') : t('bookingDialog.nights.other')}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('bookingDialog.sections.bookingDetails')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number_of_guests">{t('bookingDialog.fields.numberOfGuests')}</Label>
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
                <Label htmlFor="total_amount">{t('bookingDialog.fields.totalAmount')}</Label>
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
                <Label htmlFor="deposit_amount">{t('bookingDialog.fields.depositAmount')}</Label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">{t('bookingDialog.fields.paymentMethod')}</Label>
                <Select
                  value={formData.payment_method || ''}
                  onValueChange={(value) => handleChange('payment_method', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('bookingDialog.placeholders.paymentMethod')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('bookingDialog.paymentMethods.cash')}</SelectItem>
                    <SelectItem value="credit_card">{t('bookingDialog.paymentMethods.creditCard')}</SelectItem>
                    <SelectItem value="debit_card">{t('bookingDialog.paymentMethods.debitCard')}</SelectItem>
                    <SelectItem value="stripe">{t('bookingDialog.paymentMethods.stripe')}</SelectItem>
                    <SelectItem value="bank_transfer">{t('bookingDialog.paymentMethods.bankTransfer')}</SelectItem>
                    <SelectItem value="other">{t('bookingDialog.paymentMethods.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking_status">{t('bookingDialog.fields.bookingStatus')}</Label>
                <Select
                  value={formData.booking_status || 'pending'}
                  onValueChange={(value) => handleChange('booking_status', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('bookingDialog.placeholders.bookingStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inquiry">💬 {t('bookingDialog.statuses.inquiry')}</SelectItem>
                    <SelectItem value="pending">⏳ {t('bookingDialog.statuses.pending')}</SelectItem>
                    <SelectItem value="confirmed">✅ {t('bookingDialog.statuses.confirmed')}</SelectItem>
                    <SelectItem value="checked_in">🔑 {t('bookingDialog.statuses.checkedIn')}</SelectItem>
                    <SelectItem value="checked_out">👋 {t('bookingDialog.statuses.checkedOut')}</SelectItem>
                    <SelectItem value="completed">✔️ {t('bookingDialog.statuses.completed')}</SelectItem>
                    <SelectItem value="blocked">🚫 {t('bookingDialog.statuses.blocked')}</SelectItem>
                    <SelectItem value="cancelled">❌ {t('bookingDialog.statuses.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_requests">{t('bookingDialog.fields.specialRequests')}</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="special_requests"
                  value={formData.special_requests || ''}
                  onChange={(e) => handleChange('special_requests', e.target.value)}
                  placeholder={t('bookingDialog.placeholders.specialRequests')}
                  className="pl-10 min-h-[100px]"
                />
              </div>
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
              {t('bookingDialog.buttons.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting
                ? isEditing
                  ? t('bookingDialog.buttons.updating')
                  : t('bookingDialog.buttons.creating')
                : isEditing
                  ? t('bookingDialog.buttons.update')
                  : t('bookingDialog.buttons.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
