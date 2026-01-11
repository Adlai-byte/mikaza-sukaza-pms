import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { AlertTriangle, CalendarIcon, Loader2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatUserDisplay } from '@/lib/user-display';
import { useTranslation } from 'react-i18next';

// Job form schema
const jobFormSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  unit_id: z.string().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z.string().optional(),
  job_type: z.enum(['general', 'maintenance', 'cleaning', 'inspection', 'check_in', 'check_out', 'repair', 'emergency', 'preventive']),
  status: z.enum(['pending', 'in_progress', 'review', 'completed', 'cancelled']),
  priority: z.enum(['urgent', 'high', 'normal', 'low']),
  assigned_to: z.string().optional(),
  due_date: z.date().optional(),
  scheduled_date: z.date().optional(),
  estimated_hours: z.number().min(0).optional(),
  estimated_cost: z.number().min(0).optional(),
  location_notes: z.string().optional(),
  recurring_schedule: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']).optional(),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

interface JobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  job?: any;
  isSubmitting?: boolean;
}

export function JobDialog({ open, onOpenChange, onSubmit, job, isSubmitting = false }: JobDialogProps) {
  const { t } = useTranslation();
  const { properties } = usePropertiesOptimized();
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [showActiveBookingWarning, setShowActiveBookingWarning] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const [activeBookings, setActiveBookings] = useState<any[]>([]);

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, email, user_type')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      property_id: '',
      unit_id: null,
      title: '',
      description: '',
      job_type: 'general',
      status: 'pending',
      priority: 'normal',
      assigned_to: '',
      location_notes: '',
      recurring_schedule: 'none',
      estimated_hours: 0,
      estimated_cost: 0,
    },
  });

  // Watch property_id to get selected property's units
  const watchedPropertyId = form.watch('property_id');
  const selectedProperty = properties.find(p => p.property_id === watchedPropertyId);

  // Clear unit_id when property changes
  useEffect(() => {
    if (watchedPropertyId && !job) {
      form.setValue('unit_id', null);
    }
  }, [watchedPropertyId, form, job]);

  // Update form when job prop changes
  useEffect(() => {
    if (job) {
      form.reset({
        property_id: job.property_id || '',
        unit_id: job.unit_id || null,
        title: job.title || '',
        description: job.description || '',
        job_type: job.job_type || 'general',
        status: job.status || 'pending',
        priority: job.priority || 'normal',
        assigned_to: job.assigned_to || '',
        location_notes: job.location_notes || '',
        recurring_schedule: job.recurring_schedule || 'none',
        estimated_hours: job.estimated_hours || 0,
        estimated_cost: job.estimated_cost || 0,
      });

      if (job.due_date) {
        setDueDate(new Date(job.due_date));
      }
      if (job.scheduled_date) {
        setScheduledDate(new Date(job.scheduled_date));
      }
    } else {
      form.reset({
        property_id: '',
        unit_id: null,
        title: '',
        description: '',
        job_type: 'general',
        status: 'pending',
        priority: 'normal',
        assigned_to: '',
        location_notes: '',
        recurring_schedule: 'none',
        estimated_hours: 0,
        estimated_cost: 0,
      });
      setDueDate(undefined);
      setScheduledDate(undefined);
    }
  }, [job, form]);

  const handleSubmit = async (values: JobFormValues) => {
    const submitData = {
      ...values,
      due_date: dueDate?.toISOString() || null,
      scheduled_date: scheduledDate?.toISOString() || null,
    };

    // Skip warning for check_in/check_out job types (these are expected)
    const skipWarningTypes = ['check_in', 'check_out'];
    if (skipWarningTypes.includes(values.job_type)) {
      await onSubmit(submitData);
      form.reset();
      setDueDate(undefined);
      setScheduledDate(undefined);
      return;
    }

    // Check for active bookings (confirmed or checked_in) on this property
    const { data: bookings } = await supabase
      .from('property_bookings')
      .select('booking_id, guest_name, check_in_date, check_out_date, booking_status')
      .eq('property_id', values.property_id)
      .in('booking_status', ['confirmed', 'checked_in']);

    if (bookings && bookings.length > 0) {
      setActiveBookings(bookings);
      setPendingSubmitData(submitData);
      setShowActiveBookingWarning(true);
      return;
    }

    await onSubmit(submitData);
    form.reset();
    setDueDate(undefined);
    setScheduledDate(undefined);
  };

  const handleConfirmSubmit = async () => {
    if (pendingSubmitData) {
      await onSubmit(pendingSubmitData);
      form.reset();
      setDueDate(undefined);
      setScheduledDate(undefined);
      setPendingSubmitData(null);
    }
    setShowActiveBookingWarning(false);
    setActiveBookings([]);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? t('jobDialog.editTitle') : t('jobDialog.createTitle')}</DialogTitle>
          <DialogDescription>
            {job ? t('jobDialog.editDescription') : t('jobDialog.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Property Selection */}
              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('jobDialog.property')} {t('jobDialog.requiredField')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('jobDialog.propertyPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.property_id} value={property.property_id!}>
                            {property.property_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Job Type */}
              <FormField
                control={form.control}
                name="job_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('jobDialog.jobType')} {t('jobDialog.requiredField')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('jobDialog.jobTypePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">{t('jobDialog.types.general')}</SelectItem>
                        <SelectItem value="maintenance">{t('jobDialog.types.maintenance')}</SelectItem>
                        <SelectItem value="cleaning">{t('jobDialog.types.cleaning')}</SelectItem>
                        <SelectItem value="inspection">{t('jobDialog.types.inspection')}</SelectItem>
                        <SelectItem value="check_in">{t('jobDialog.types.checkIn')}</SelectItem>
                        <SelectItem value="check_out">{t('jobDialog.types.checkOut')}</SelectItem>
                        <SelectItem value="repair">{t('jobDialog.types.repair')}</SelectItem>
                        <SelectItem value="emergency">{t('jobDialog.types.emergency')}</SelectItem>
                        <SelectItem value="preventive">{t('jobDialog.types.preventive')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Unit Selection - Only show if property has units */}
            {selectedProperty && selectedProperty.units && selectedProperty.units.length > 0 && (
              <FormField
                control={form.control}
                name="unit_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      {t('jobDialog.unit', 'Unit (Optional)')}
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === 'entire_property' ? null : value)}
                      value={field.value || 'entire_property'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('jobDialog.selectUnit', 'Select unit...')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="entire_property">
                          {t('jobDialog.entireProperty', 'Entire Property / Common Areas')}
                        </SelectItem>
                        {selectedProperty.units.map((unit) => (
                          <SelectItem key={unit.unit_id} value={unit.unit_id}>
                            {unit.unit_name || `Unit ${unit.unit_number}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('jobDialog.unitHint', 'Select a specific unit or leave as "Entire Property" for common areas')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('jobDialog.jobTitle')} {t('jobDialog.requiredField')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('jobDialog.jobTitlePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('jobDialog.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('jobDialog.descriptionPlaceholder')}
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Notes */}
            <FormField
              control={form.control}
              name="location_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('jobDialog.locationNotes')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('jobDialog.locationNotesPlaceholder')} {...field} />
                  </FormControl>
                  <FormDescription>{t('jobDialog.locationNotesDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('jobDialog.status')} {t('jobDialog.requiredField')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('jobDialog.statusPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">{t('jobDialog.statuses.pending')}</SelectItem>
                        <SelectItem value="in_progress">{t('jobDialog.statuses.inProgress')}</SelectItem>
                        <SelectItem value="review">{t('jobDialog.statuses.review')}</SelectItem>
                        <SelectItem value="completed">{t('jobDialog.statuses.completed')}</SelectItem>
                        <SelectItem value="cancelled">{t('jobDialog.statuses.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('jobDialog.priority')} {t('jobDialog.requiredField')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('jobDialog.priorityPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="urgent">{t('jobDialog.priorities.urgent')}</SelectItem>
                        <SelectItem value="high">{t('jobDialog.priorities.high')}</SelectItem>
                        <SelectItem value="normal">{t('jobDialog.priorities.normal')}</SelectItem>
                        <SelectItem value="low">{t('jobDialog.priorities.low')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Recurring Schedule */}
              <FormField
                control={form.control}
                name="recurring_schedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('jobDialog.recurring')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('jobDialog.recurringPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t('jobDialog.recurrenceOptions.none')}</SelectItem>
                        <SelectItem value="daily">{t('jobDialog.recurrenceOptions.daily')}</SelectItem>
                        <SelectItem value="weekly">{t('jobDialog.recurrenceOptions.weekly')}</SelectItem>
                        <SelectItem value="biweekly">{t('jobDialog.recurrenceOptions.biweekly')}</SelectItem>
                        <SelectItem value="monthly">{t('jobDialog.recurrenceOptions.monthly')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Assigned To */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('jobDialog.assignTo')}</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === 'unassigned' ? '' : value)} value={field.value || 'unassigned'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('jobDialog.assignToPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">{t('jobDialog.unassigned')}</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {formatUserDisplay(user)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Due Date */}
              <FormItem>
                <FormLabel>{t('jobDialog.dueDate')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !dueDate && 'text-muted-foreground'
                        )}
                      >
                        {dueDate ? format(dueDate, 'PPP') : <span>{t('jobDialog.dueDatePlaceholder')}</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>{t('jobDialog.dueDateDescription')}</FormDescription>
              </FormItem>

              {/* Scheduled Date */}
              <FormItem>
                <FormLabel>{t('jobDialog.scheduledDate')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !scheduledDate && 'text-muted-foreground'
                        )}
                      >
                        {scheduledDate ? format(scheduledDate, 'PPP') : <span>{t('jobDialog.scheduledDatePlaceholder')}</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>{t('jobDialog.scheduledDateDescription')}</FormDescription>
              </FormItem>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estimated Hours */}
              <FormField
                control={form.control}
                name="estimated_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('jobDialog.estimatedHours')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder={t('jobDialog.estimatedHoursPlaceholder')}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>{t('jobDialog.estimatedHoursDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estimated Cost */}
              <FormField
                control={form.control}
                name="estimated_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('jobDialog.estimatedCost')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={t('jobDialog.estimatedCostPlaceholder')}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>{t('jobDialog.estimatedCostDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('jobDialog.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {job ? t('jobDialog.updateJob') : t('jobDialog.createJob')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Active Booking Warning Dialog */}
    <AlertDialog open={showActiveBookingWarning} onOpenChange={setShowActiveBookingWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {t('jobs.activeBookingWarning.title')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {activeBookings.map((booking) => (
                <div key={booking.booking_id} className="mb-2">
                  {t('jobs.activeBookingWarning.message', {
                    guestName: booking.guest_name || t('common.unknown'),
                    checkIn: format(new Date(booking.check_in_date), 'PPP'),
                    checkOut: format(new Date(booking.check_out_date), 'PPP'),
                  })}
                </div>
              ))}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmSubmit}>
            {t('jobs.activeBookingWarning.proceed')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
