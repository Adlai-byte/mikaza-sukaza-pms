// TaskCalendarDayCell - Individual day cell for the Tasks Calendar
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Task } from "@/lib/schemas";

interface TaskCalendarDayCellProps {
  date: Date;
  tasks: Task[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onDayClick: (date: Date, tasks: Task[]) => void;
  onTaskClick: (task: Task, event: React.MouseEvent) => void;
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

// Get user initials
const getUserInitials = (user?: { first_name: string; last_name: string } | null): string => {
  if (!user) return '?';
  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || '?';
};

export function TaskCalendarDayCell({
  date,
  tasks,
  isCurrentMonth,
  isToday,
  onDayClick,
  onTaskClick,
}: TaskCalendarDayCellProps) {
  const dayNumber = date.getDate();
  const hasTasks = tasks.length > 0;
  const visibleTasks = tasks.slice(0, 3);
  const remainingCount = tasks.length - 3;

  return (
    <div
      onClick={() => hasTasks && onDayClick(date, tasks)}
      className={cn(
        "min-h-[80px] p-1 border-r border-b transition-colors",
        isCurrentMonth ? "bg-background" : "bg-muted/30",
        isToday && "ring-2 ring-primary ring-inset",
        hasTasks && "cursor-pointer hover:bg-accent/50"
      )}
    >
      {/* Day number */}
      <div className={cn(
        "text-sm font-medium mb-1",
        !isCurrentMonth && "text-muted-foreground",
        isToday && "text-primary font-bold"
      )}>
        {dayNumber}
      </div>

      {/* Task badges */}
      <div className="flex flex-wrap gap-1">
        <TooltipProvider delayDuration={200}>
          {visibleTasks.map((task) => (
            <Tooltip key={task.task_id}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => onTaskClick(task, e)}
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white",
                    "hover:ring-2 hover:ring-offset-1 hover:ring-primary/50 transition-all",
                    getPriorityColor(task.priority)
                  )}
                >
                  {getUserInitials(task.assigned_user)}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <div className="space-y-1">
                  <p className="font-medium text-sm truncate">{task.title}</p>
                  {task.property && (
                    <p className="text-xs text-muted-foreground truncate">
                      {task.property.property_name}
                    </p>
                  )}
                  {task.assigned_user && (
                    <p className="text-xs text-muted-foreground">
                      {task.assigned_user.first_name} {task.assigned_user.last_name}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>

        {/* +N more indicator */}
        {remainingCount > 0 && (
          <span className="text-[10px] text-muted-foreground font-medium px-1">
            +{remainingCount}
          </span>
        )}
      </div>
    </div>
  );
}
