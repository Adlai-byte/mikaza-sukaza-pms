import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Brush,
  DoorOpen,
  DoorClosed,
  ClipboardCheck,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookingJobConfig } from '@/lib/schemas';
import { calculateJobDueDate } from '@/hooks/useBookingTasks';
import { useUsers } from '@/hooks/useUsers';
import { format, parseISO } from 'date-fns';

interface BookingJobsSectionProps {
  jobConfigs: BookingJobConfig[];
  onJobConfigsChange: (configs: BookingJobConfig[]) => void;
  autoGenerate: boolean;
  onAutoGenerateChange: (value: boolean) => void;
  checkInDate: string;
  checkOutDate: string;
  disabled?: boolean;
}

// Job type icons mapping
const jobTypeIcons: Record<BookingJobConfig['type'], React.ElementType> = {
  cleaning: Brush,
  check_in_prep: DoorOpen,
  check_out_prep: DoorClosed,
  inspection: ClipboardCheck,
  maintenance: Wrench,
};

// Job type labels
const jobTypeLabels: Record<BookingJobConfig['type'], string> = {
  cleaning: 'bookings.jobs.types.cleaning',
  check_in_prep: 'bookings.jobs.types.checkInPrep',
  check_out_prep: 'bookings.jobs.types.checkOutPrep',
  inspection: 'bookings.jobs.types.inspection',
  maintenance: 'bookings.jobs.types.maintenance',
};

export function BookingJobsSection({
  jobConfigs,
  onJobConfigsChange,
  autoGenerate,
  onAutoGenerateChange,
  checkInDate,
  checkOutDate,
  disabled = false,
}: BookingJobsSectionProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(true);

  // Fetch users who can be assigned tasks (admin, ops, provider)
  const { users = [], loading: usersLoading } = useUsers();
  const assignableUsers = users.filter(
    (u) => ['admin', 'ops', 'provider'].includes(u.user_type || '') && u.is_active !== false
  );

  // Update due dates when check-in/out dates change
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const updatedConfigs = jobConfigs.map((job) => ({
        ...job,
        dueDate: calculateJobDueDate(job.type, checkInDate, checkOutDate),
      }));
      onJobConfigsChange(updatedConfigs);
    }
  }, [checkInDate, checkOutDate]);

  const handleJobToggle = (type: BookingJobConfig['type'], enabled: boolean) => {
    const updatedConfigs = jobConfigs.map((job) =>
      job.type === type ? { ...job, enabled } : job
    );
    onJobConfigsChange(updatedConfigs);
  };

  const handleAssigneeChange = (type: BookingJobConfig['type'], assignedTo: string | null) => {
    const updatedConfigs = jobConfigs.map((job) =>
      job.type === type ? { ...job, assignedTo: assignedTo === 'unassigned' ? null : assignedTo } : job
    );
    onJobConfigsChange(updatedConfigs);
  };

  const handlePriorityChange = (type: BookingJobConfig['type'], priority: BookingJobConfig['priority']) => {
    const updatedConfigs = jobConfigs.map((job) =>
      job.type === type ? { ...job, priority } : job
    );
    onJobConfigsChange(updatedConfigs);
  };

  const enabledCount = jobConfigs.filter((j) => j.enabled).length;

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full flex items-center justify-between p-4 h-auto"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span className="font-medium">{t('bookings.jobs.title', 'Auto-Generate Jobs')}</span>
            {enabledCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {enabledCount} {t('common.enabled', 'enabled')}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4">
        <div className="space-y-4">
          {/* Auto-generate toggle */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Checkbox
              id="autoGenerateJobs"
              checked={autoGenerate}
              onCheckedChange={(checked) => onAutoGenerateChange(checked === true)}
              disabled={disabled}
            />
            <Label htmlFor="autoGenerateJobs" className="text-sm cursor-pointer">
              {t('bookings.jobs.autoGenerate', 'Automatically create jobs for this booking')}
            </Label>
          </div>

          {autoGenerate && (
            <>
              {/* Schedule note */}
              {checkInDate && checkOutDate && (
                <p className="text-xs text-muted-foreground">
                  {t('bookings.jobs.scheduleNote', 'Jobs scheduled based on booking dates')}
                </p>
              )}

              {/* Job list */}
              <div className="space-y-3">
                {jobConfigs.map((job) => {
                  const Icon = jobTypeIcons[job.type];
                  return (
                    <div
                      key={job.type}
                      className={`p-3 rounded-lg border ${
                        job.enabled ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Enable checkbox */}
                        <Checkbox
                          id={`job-${job.type}`}
                          checked={job.enabled}
                          onCheckedChange={(checked) =>
                            handleJobToggle(job.type, checked === true)
                          }
                          disabled={disabled}
                          className="mt-1"
                        />

                        {/* Job info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${job.enabled ? 'text-amber-600' : 'text-gray-400'}`} />
                            <Label
                              htmlFor={`job-${job.type}`}
                              className={`font-medium cursor-pointer ${
                                job.enabled ? 'text-amber-900' : 'text-gray-500'
                              }`}
                            >
                              {t(jobTypeLabels[job.type], job.type.replace('_', ' '))}
                            </Label>
                          </div>

                          {job.enabled && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {/* Due Date (read-only) */}
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  {t('bookings.jobs.dueDate', 'Due Date')}
                                </Label>
                                <p className="text-sm font-medium">
                                  {formatDueDate(job.dueDate)}
                                </p>
                              </div>

                              {/* Assignee */}
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  {t('bookings.jobs.assignTo', 'Assign to')}
                                </Label>
                                <Select
                                  value={job.assignedTo || 'unassigned'}
                                  onValueChange={(value) =>
                                    handleAssigneeChange(job.type, value)
                                  }
                                  disabled={disabled}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue
                                      placeholder={t('bookings.jobs.unassigned', 'Unassigned')}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">
                                      {t('bookings.jobs.unassigned', 'Unassigned')}
                                    </SelectItem>
                                    {usersLoading ? (
                                      <SelectItem value="loading" disabled>
                                        {t('common.loading', 'Loading users...')}
                                      </SelectItem>
                                    ) : assignableUsers.length === 0 ? (
                                      <SelectItem value="no-users" disabled>
                                        {t('bookings.jobs.noAssignableUsers', 'No assignable users')}
                                      </SelectItem>
                                    ) : (
                                      assignableUsers.map((user) => (
                                        <SelectItem key={user.user_id} value={user.user_id}>
                                          {user.first_name} {user.last_name} ({user.user_type})
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Priority */}
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  {t('bookings.jobs.priority', 'Priority')}
                                </Label>
                                <Select
                                  value={job.priority}
                                  onValueChange={(value) =>
                                    handlePriorityChange(
                                      job.type,
                                      value as BookingJobConfig['priority']
                                    )
                                  }
                                  disabled={disabled}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">{t('common.low', 'Low')}</SelectItem>
                                    <SelectItem value="medium">{t('common.medium', 'Medium')}</SelectItem>
                                    <SelectItem value="high">{t('common.high', 'High')}</SelectItem>
                                    <SelectItem value="urgent">{t('common.urgent', 'Urgent')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default BookingJobsSection;
