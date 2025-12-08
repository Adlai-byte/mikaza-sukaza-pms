import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Plus, X, Mail } from 'lucide-react';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  useCreateReportSchedule,
  useUpdateReportSchedule,
  REPORT_TYPES,
  DAYS_OF_WEEK,
  ReportSchedule,
  ReportScheduleInsert,
  ReportType,
} from '@/hooks/useReportSchedules';
import { reportScheduleSchema, COMMON_TIMEZONES } from '@/lib/schemas';

interface AddReportScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ReportSchedule | null;
}

export function AddReportScheduleDialog({
  open,
  onOpenChange,
  schedule,
}: AddReportScheduleDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!schedule;

  const createSchedule = useCreateReportSchedule();
  const updateSchedule = useUpdateReportSchedule();

  // Email input state
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  const form = useForm<ReportScheduleInsert>({
    resolver: zodResolver(reportScheduleSchema),
    defaultValues: {
      schedule_name: '',
      report_type: 'current_balance',
      day_of_week: 5, // Friday
      hour_of_day: 19, // 7 PM
      minute_of_hour: 0,
      timezone: 'America/New_York',
      recipient_emails: [],
      is_enabled: true,
      report_filters: {},
    },
  });

  // Reset form when dialog opens/closes or schedule changes
  useEffect(() => {
    if (open && schedule) {
      form.reset({
        schedule_name: schedule.schedule_name,
        report_type: schedule.report_type,
        day_of_week: schedule.day_of_week,
        hour_of_day: schedule.hour_of_day,
        minute_of_hour: schedule.minute_of_hour,
        timezone: schedule.timezone,
        recipient_emails: schedule.recipient_emails,
        is_enabled: schedule.is_enabled,
        report_filters: schedule.report_filters,
      });
    } else if (open && !schedule) {
      form.reset({
        schedule_name: '',
        report_type: 'current_balance',
        day_of_week: 5,
        hour_of_day: 19,
        minute_of_hour: 0,
        timezone: 'America/New_York',
        recipient_emails: [],
        is_enabled: true,
        report_filters: {},
      });
    }
    setEmailInput('');
    setEmailError('');
  }, [open, schedule, form]);

  // Add email to list
  const addEmail = () => {
    const email = emailInput.trim();
    if (!email) return;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError(t('validation.invalidEmail', 'Invalid email address'));
      return;
    }

    const currentEmails = form.getValues('recipient_emails') || [];
    if (currentEmails.includes(email)) {
      setEmailError(t('validation.emailAlreadyAdded', 'Email already added'));
      return;
    }

    form.setValue('recipient_emails', [...currentEmails, email]);
    setEmailInput('');
    setEmailError('');
  };

  // Remove email from list
  const removeEmail = (index: number) => {
    const currentEmails = form.getValues('recipient_emails') || [];
    form.setValue(
      'recipient_emails',
      currentEmails.filter((_, i) => i !== index)
    );
  };

  // Handle key press for email input
  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  // Handle form submission
  const onSubmit = (data: ReportScheduleInsert) => {
    if (isEditing && schedule) {
      updateSchedule.mutate(
        { scheduleId: schedule.schedule_id, updates: data },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createSchedule.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isSubmitting = createSchedule.isPending || updateSchedule.isPending;
  const recipientEmails = form.watch('recipient_emails') || [];

  // Generate hour options
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const period = i >= 12 ? 'PM' : 'AM';
    const hour12 = i % 12 || 12;
    return {
      value: i,
      label: `${hour12}:00 ${period}`,
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('automation.editSchedule', 'Edit Schedule')
              : t('automation.addSchedule', 'Add Schedule')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'automation.scheduleDialogDescription',
              'Configure an automated report to be sent weekly via email'
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Schedule Name */}
            <FormField
              control={form.control}
              name="schedule_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('automation.scheduleName', 'Schedule Name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('automation.scheduleNamePlaceholder', 'e.g., Weekly Balance Report')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Report Type */}
            <FormField
              control={form.control}
              name="report_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('automation.reportType', 'Report Type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('automation.selectReportType', 'Select report type')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(REPORT_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Schedule Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="day_of_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('automation.dayOfWeek', 'Day of Week')}</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('automation.selectDay', 'Select day')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
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
                name="hour_of_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('automation.time', 'Time')}</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('automation.selectTime', 'Select time')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {hourOptions.map((hour) => (
                          <SelectItem key={hour.value} value={hour.value.toString()}>
                            {hour.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Timezone */}
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('automation.timezone', 'Timezone')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('automation.selectTimezone', 'Select timezone')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMMON_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recipients */}
            <FormField
              control={form.control}
              name="recipient_emails"
              render={() => (
                <FormItem>
                  <FormLabel>{t('automation.recipients', 'Recipients')}</FormLabel>
                  <div className="space-y-2">
                    {/* Email input */}
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder={t('automation.enterEmail', 'Enter email address')}
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value);
                          setEmailError('');
                        }}
                        onKeyPress={handleEmailKeyPress}
                      />
                      <Button type="button" variant="outline" onClick={addEmail}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {emailError && <p className="text-sm text-destructive">{emailError}</p>}

                    {/* Email list */}
                    {recipientEmails.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50">
                        {recipientEmails.map((email, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 px-2 py-1 bg-background rounded-md border"
                          >
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{email}</span>
                            <button
                              type="button"
                              onClick={() => removeEmail(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormDescription>
                    {t(
                      'automation.recipientsDescription',
                      'Enter email addresses and press Enter or click + to add'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Enabled Toggle */}
            <FormField
              control={form.control}
              name="is_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>{t('automation.enableSchedule', 'Enable Schedule')}</FormLabel>
                    <FormDescription>
                      {t(
                        'automation.enableScheduleDescription',
                        'When enabled, reports will be sent automatically'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t('common.saving', 'Saving...')
                  : isEditing
                  ? t('common.save', 'Save')
                  : t('common.create', 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
