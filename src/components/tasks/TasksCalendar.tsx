// TasksCalendar - Monthly grid calendar view for tasks
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
  isToday,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
import { TaskCalendarDayCell } from "./TaskCalendarDayCell";
import { Task } from "@/lib/schemas";

interface TasksCalendarProps {
  tasks: Task[];
  isLoading: boolean;
  onViewTask: (task: Task) => void;
}

// Priority color mapping (tasks use 'medium' instead of 'normal')
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-blue-500';
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

export function TasksCalendar({ tasks, isLoading, onViewTask }: TasksCalendarProps) {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([]);

  // Generate calendar days for the current month view (6 weeks × 7 days = 42 days)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group tasks by due_date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.due_date) {
        try {
          const key = format(parseISO(task.due_date), 'yyyy-MM-dd');
          const existing = map.get(key) || [];
          map.set(key, [...existing, task]);
        } catch (e) {
          // Invalid date, skip
        }
      }
    });
    return map;
  }, [tasks]);

  // Count tasks without due date
  const unscheduledCount = useMemo(() => {
    return tasks.filter((task) => !task.due_date).length;
  }, [tasks]);

  // Navigation handlers
  const goToPreviousMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Day click handler
  const handleDayClick = (date: Date, dayTasks: Task[]) => {
    setSelectedDate(date);
    setSelectedDayTasks(dayTasks);
    setDialogOpen(true);
  };

  // Task click handler
  const handleTaskClick = (task: Task, event: React.MouseEvent) => {
    event.stopPropagation();
    setDialogOpen(false);
    onViewTask(task);
  };

  // Get tasks for a specific date
  const getTasksForDate = (date: Date): Task[] => {
    const key = format(date, 'yyyy-MM-dd');
    return tasksByDate.get(key) || [];
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
              {t('todos.calendar.today', 'Today')}
            </Button>
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
                  const dayTasks = getTasksForDate(date);
                  return (
                    <TaskCalendarDayCell
                      key={date.toISOString()}
                      date={date}
                      tasks={dayTasks}
                      isCurrentMonth={isSameMonth(date, currentMonth)}
                      isToday={isToday(date)}
                      onDayClick={handleDayClick}
                      onTaskClick={handleTaskClick}
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
                  {t('todos.calendar.legend', 'Legend')}:
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span>{t('todos.priority.urgent', 'Urgent')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>{t('todos.priority.high', 'High')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>{t('todos.priority.medium', 'Medium')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-gray-400" />
                  <span>{t('todos.priority.low', 'Low')}</span>
                </div>
              </div>

              {/* Unscheduled Tasks Count */}
              {unscheduledCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {unscheduledCount} {t('todos.calendar.noDueDate', 'without due date')}
                </Badge>
              )}
            </div>
          </>
        )}

      </CardContent>

      {/* Day Dialog for task details */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedDate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedDayTasks.length} {selectedDayTasks.length === 1 ? t('todos.calendar.task', 'task') : t('todos.calendar.tasks', 'tasks')}
                </p>
              </DialogHeader>
              <ScrollArea className="max-h-[400px] mt-4">
                <div className="space-y-3 pr-4">
                  {selectedDayTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('todos.calendar.noTasks', 'No tasks for this day')}
                    </p>
                  ) : (
                    selectedDayTasks.map((task) => (
                      <button
                        key={task.task_id}
                        onClick={(e) => handleTaskClick(task, e)}
                        className="w-full p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${getPriorityColor(task.priority)}`} />
                              <span className="font-medium text-sm">
                                {task.title}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {task.description}
                              </p>
                            )}
                            {task.property && (
                              <p className="text-xs text-muted-foreground">
                                📍 {task.property.property_name}
                              </p>
                            )}
                            {task.assigned_user && (
                              <p className="text-xs text-muted-foreground">
                                👤 {task.assigned_user.first_name} {task.assigned_user.last_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                            <Badge variant={getPriorityVariant(task.priority)} className="text-xs">
                              {t(`todos.priority.${task.priority}`, task.priority)}
                            </Badge>
                            <Badge variant={getStatusVariant(task.status)} className="text-xs">
                              {t(`todos.status.${task.status}`, task.status)}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
