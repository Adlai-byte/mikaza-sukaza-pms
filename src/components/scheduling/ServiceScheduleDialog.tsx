import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Wrench, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  ScheduledService,
  ScheduledServiceInsert,
  SERVICE_TYPE_CONFIG,
} from '@/lib/schemas';
import {
  useCreateScheduledService,
  useUpdateScheduledService,
} from '@/hooks/useServiceScheduling';
import { usePropertyProviders } from '@/hooks/usePropertyProviders';
import { z } from 'zod';

interface ServiceScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ScheduledService | null;
  defaultDate?: Date | null;
  properties: Array<{ property_id: string; property_name: string }>;
}

// Simplified form schema - only essential fields for scheduling
const formSchema = z.object({
  property_id: z.string().min(1, "Please select a property"),
  service_type: z.string().min(1, "Please select a service type"),
  custom_service_name: z.string().optional().nullable(),
  vendor_id: z.string().min(1, "Please select an assigned provider"),
  scheduled_date: z.string().min(1, "Please select a date"),
  scheduled_time: z.string().optional().nullable(),
  status: z.string().default('scheduled'),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function ServiceScheduleDialog({
  // Dialog for scheduling services with assigned providers
  open,
  onOpenChange,
  service,
  defaultDate,
  properties,
}: ServiceScheduleDialogProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const isEditing = !!service;

  const createService = useCreateScheduledService();
  const updateService = useUpdateScheduledService();

  // Fetch assigned providers for the selected property
  const {
    assignedProviders,
    isLoading: isLoadingProviders,
  } = usePropertyProviders(selectedPropertyId || '');

  // Group assigned providers by category (service vs utility)
  const { serviceProviders, utilityProviders } = useMemo(() => {
    if (!assignedProviders || assignedProviders.length === 0) {
      return { serviceProviders: [], utilityProviders: [] };
    }
    const serviceProviders = assignedProviders.filter(
      a => a.provider?.category === 'service'
    );
    const utilityProviders = assignedProviders.filter(
      a => a.provider?.category === 'utility'
    );
    return { serviceProviders, utilityProviders };
  }, [assignedProviders]);

  const hasAssignedProviders = serviceProviders.length > 0 || utilityProviders.length > 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      property_id: '',
      service_type: 'cleaning',
      custom_service_name: null,
      vendor_id: '',
      scheduled_date: format(new Date(), 'yyyy-MM-dd'),
      scheduled_time: '09:00',
      status: 'scheduled',
      notes: null,
    },
  });

  // Reset form when dialog opens/closes or service changes
  useEffect(() => {
    if (open) {
      if (service) {
        setSelectedPropertyId(service.property_id);
        form.reset({
          property_id: service.property_id,
          service_type: service.service_type,
          custom_service_name: service.custom_service_name || null,
          vendor_id: service.vendor_id || '',
          scheduled_date: service.scheduled_date,
          scheduled_time: service.scheduled_time?.slice(0, 5) || '09:00',
          status: service.status,
          notes: service.notes || null,
        });
      } else {
        setSelectedPropertyId('');
        form.reset({
          property_id: '',
          service_type: 'cleaning',
          custom_service_name: null,
          vendor_id: '',
          scheduled_date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          scheduled_time: '09:00',
          status: 'scheduled',
          notes: null,
        });
      }
    }
  }, [open, service, defaultDate, form]);

  const onSubmit = async (values: FormValues) => {
    console.log('📋 Form submitted with values:', values);

    // Only include fields that exist in the database table
    const serviceData = {
      property_id: values.property_id,
      service_type: values.service_type,
      custom_service_name: values.custom_service_name || null,
      vendor_id: values.vendor_id || null,
      scheduled_date: values.scheduled_date,
      scheduled_time: values.scheduled_time || null,
      status: values.status || 'scheduled',
      notes: values.notes || null,
      // Set allocation status based on vendor selection
      allocation_status: values.vendor_id ? 'assigned' : 'unassigned',
    };

    console.log('📤 Service data to save:', serviceData);

    try {
      if (isEditing) {
        console.log('✏️ Updating service:', service?.schedule_id);
        await updateService.mutateAsync({
          scheduleId: service!.schedule_id,
          updates: serviceData,
        });
      } else {
        console.log('➕ Creating new service');
        await createService.mutateAsync(serviceData);
      }
      console.log('✅ Service saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Failed to save service:', error);
    }
  };

  // Log form errors
  const formErrors = form.formState.errors;
  if (Object.keys(formErrors).length > 0) {
    console.log('⚠️ Form validation errors:', formErrors);
  }

  const isLoading = createService.isPending || updateService.isPending;
  const watchServiceType = form.watch('service_type');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Scheduled Service' : 'Schedule New Service'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details of this scheduled service.'
              : 'Schedule a new vendor service for a property.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Property and Service Type */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedPropertyId(value);
                        // Clear vendor when property changes
                        form.setValue('vendor_id', '');
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((prop) => (
                          <SelectItem key={prop.property_id} value={prop.property_id}>
                            {prop.property_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SERVICE_TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Custom Service Name (only for "other" type) */}
            {watchServiceType === 'other' && (
              <FormField
                control={form.control}
                name="custom_service_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Service Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Enter service name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Assigned Provider */}
            <FormField
              control={form.control}
              name="vendor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Provider *</FormLabel>
                  {!selectedPropertyId ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please select a property first to see assigned providers
                      </AlertDescription>
                    </Alert>
                  ) : isLoadingProviders ? (
                    <div className="text-sm text-muted-foreground py-2">
                      Loading assigned providers...
                    </div>
                  ) : !hasAssignedProviders ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No providers assigned to this property. Please assign providers in the property settings first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assigned provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceProviders.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              Service Providers
                            </SelectLabel>
                            {serviceProviders.map((assignment) => (
                              <SelectItem
                                key={assignment.provider_id}
                                value={assignment.provider_id}
                              >
                                {assignment.provider?.provider_name}
                                {assignment.is_preferred_for_property && ' ⭐'}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {utilityProviders.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              Utility Providers
                            </SelectLabel>
                            {utilityProviders.map((assignment) => (
                              <SelectItem
                                key={assignment.provider_id}
                                value={assignment.provider_id}
                              >
                                {assignment.provider?.provider_name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ''}
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status (only when editing) */}
            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      placeholder="Add any notes or special instructions..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update Service' : 'Schedule Service'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
