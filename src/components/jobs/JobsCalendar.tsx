// JobsCalendar - Monthly grid calendar view for employee tasks
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { JobCalendarDayCell } from "./JobCalendarDayCell";

interface JobWithRelations {
  job_id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string | null;
  scheduled_date?: string | null;
  property?: { property_id: string; property_name: string } | null;
  assigned_user?: { user_id: string; first_name: string; last_name: string } | null;
  [key: string]: unknown;
}

interface JobsCalendarProps {
  jobs: JobWithRelations[];
  isLoading: boolean;
  onViewJob: (job: JobWithRelations) => void;
}

type DateFieldType = 'due_date' | 'scheduled_date';

// Priority color mapping
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'normal': return 'bg-blue-500';
    case 'low': return 'bg-gray-400';
    default: return 'bg-gray-400';
  }
};

// Priority badge variant
const getPriorityVariant = (priority: string): "destructive" | "default" | "secondary" | "outline" => {
  switch (priority) {
    case 'urgent': return 'destructive';
    case 'high': return 'default';
    default: return 'secondary';
  }
};

// Status badge variant
const getStatusVariant = (status: string): "destructive" | "default" | "secondary" | "outline" => {
  switch (status) {
    case 'completed': return 'default';
    case 'in_progress': return 'secondary';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

// Weekday headers
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function JobsCalendar({ jobs, isLoading, onViewJob }: JobsCalendarProps) {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dateField, setDateField] = useState<DateFieldType>('due_date');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedDayJobs, setSelectedDayJobs] = useState<JobWithRelations[]>([]);

  // Generate calendar days for the current month view (6 weeks × 7 days = 42 days)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group jobs by date based on selected date field
  const jobsByDate = useMemo(() => {
    const map = new Map<string, JobWithRelations[]>();
    jobs.forEach((job) => {
      const dateValue = dateField === 'scheduled_date' ? job.scheduled_date : job.due_date;
      if (dateValue) {
        try {
          const key = format(parseISO(dateValue), 'yyyy-MM-dd');
          const existing = map.get(key) || [];
          map.set(key, [...existing, job]);
        } catch (e) {
          // Invalid date, skip
        }
      }
    });
    return map;
  }, [jobs, dateField]);

  // Count jobs without the selected date field
  const unscheduledCount = useMemo(() => {
    return jobs.filter((job) => {
      const dateValue = dateField === 'scheduled_date' ? job.scheduled_date : job.due_date;
      return !dateValue;
    }).length;
  }, [jobs, dateField]);

  // Navigation handlers
  const goToPreviousMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Day click handler
  const handleDayClick = (date: Date, dayJobs: JobWithRelations[]) => {
    setSelectedDate(date);
    setSelectedDayJobs(dayJobs);
    setPopoverOpen(true);
  };

  // Job click handler
  const handleJobClick = (job: JobWithRelations, event: React.MouseEvent) => {
    event.stopPropagation();
    setPopoverOpen(false);
    onViewJob(job);
  };

  // Get jobs for a specific date
  const getJobsForDate = (date: Date): JobWithRelations[] => {
    const key = format(date, 'yyyy-MM-dd');
    return jobsByDate.get(key) || [];
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg font-semibold min-w-[160px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              {t('jobs.calendar.today', 'Today')}
            </Button>
          </div>

          {/* Date Field Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('jobs.calendar.viewBy', 'View by')}:
            </span>
            <Select value={dateField} onValueChange={(v) => setDateField(v as DateFieldType)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date">
                  {t('jobs.calendar.dueDate', 'Due Date')}
                </SelectItem>
                <SelectItem value="scheduled_date">
                  {t('jobs.calendar.scheduledDate', 'Scheduled Date')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            <CalendarDays className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Calendar Grid */}
            <div className="border rounded-lg overflow-hidden">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 bg-muted/50 border-b">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((date) => {
                  const dayJobs = getJobsForDate(date);
                  return (
                    <JobCalendarDayCell
                      key={date.toISOString()}
                      date={date}
                      jobs={dayJobs}
                      isCurrentMonth={isSameMonth(date, currentMonth)}
                      isToday={isToday(date)}
                      onDayClick={handleDayClick}
                      onJobClick={handleJobClick}
                    />
                  );
                })}
              </div>
            </div>

            {/* Legend & Info */}
            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t">
              {/* Priority Legend */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground font-medium">
                  {t('jobs.calendar.legend', 'Legend')}:
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span>{t('jobs.priority.urgent', 'Urgent')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>{t('jobs.priority.high', 'High')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>{t('jobs.priority.normal', 'Normal')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-gray-400" />
                  <span>{t('jobs.priority.low', 'Low')}</span>
                </div>
              </div>

              {/* Unscheduled Jobs Count */}
              {unscheduledCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {unscheduledCount} {t('jobs.calendar.unscheduled', 'unscheduled')}
                </Badge>
              )}
            </div>
          </>
        )}

        {/* Day Popover for job details */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <span className="hidden" />
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="center">
            {selectedDate && (
              <>
                <div className="p-3 border-b bg-muted/30">
                  <h4 className="font-semibold">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedDayJobs.length} {selectedDayJobs.length === 1 ? t('jobs.calendar.task', 'task') : t('jobs.calendar.tasks', 'tasks')}
                  </p>
                </div>
                <ScrollArea className="max-h-[300px]">
                  <div className="p-2 space-y-2">
                    {selectedDayJobs.map((job) => (
                      <button
                        key={job.job_id}
                        onClick={(e) => handleJobClick(job, e)}
                        className="w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(job.priority)}`} />
                              <span className="font-medium text-sm truncate">
                                {job.title}
                              </span>
                            </div>
                            {job.property && (
                              <p className="text-xs text-muted-foreground truncate">
                                {job.property.property_name}
                              </p>
                            )}
                            {job.assigned_user && (
                              <p className="text-xs text-muted-foreground">
                                {job.assigned_user.first_name} {job.assigned_user.last_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <Badge variant={getPriorityVariant(job.priority)} className="text-[10px] px-1.5 py-0">
                              {t(`jobs.priority.${job.priority}`, job.priority)}
                            </Badge>
                            <Badge variant={getStatusVariant(job.status)} className="text-[10px] px-1.5 py-0">
                              {t(`jobs.status.${job.status}`, job.status)}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}
