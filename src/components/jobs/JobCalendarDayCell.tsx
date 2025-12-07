// JobCalendarDayCell - Individual day cell for the Jobs Calendar
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

interface JobCalendarDayCellProps {
  date: Date;
  jobs: JobWithRelations[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onDayClick: (date: Date, jobs: JobWithRelations[]) => void;
  onJobClick: (job: JobWithRelations, event: React.MouseEvent) => void;
}

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

// Get user initials
const getUserInitials = (user?: { first_name: string; last_name: string } | null): string => {
  if (!user) return '?';
  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || '?';
};

export function JobCalendarDayCell({
  date,
  jobs,
  isCurrentMonth,
  isToday,
  onDayClick,
  onJobClick,
}: JobCalendarDayCellProps) {
  const dayNumber = date.getDate();
  const hasJobs = jobs.length > 0;
  const visibleJobs = jobs.slice(0, 3);
  const remainingCount = jobs.length - 3;

  return (
    <div
      onClick={() => hasJobs && onDayClick(date, jobs)}
      className={cn(
        "min-h-[80px] p-1 border-r border-b transition-colors",
        isCurrentMonth ? "bg-background" : "bg-muted/30",
        isToday && "ring-2 ring-primary ring-inset",
        hasJobs && "cursor-pointer hover:bg-accent/50"
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

      {/* Job badges */}
      <div className="flex flex-wrap gap-1">
        <TooltipProvider delayDuration={200}>
          {visibleJobs.map((job) => (
            <Tooltip key={job.job_id}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => onJobClick(job, e)}
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white",
                    "hover:ring-2 hover:ring-offset-1 hover:ring-primary/50 transition-all",
                    getPriorityColor(job.priority)
                  )}
                >
                  {getUserInitials(job.assigned_user)}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <div className="space-y-1">
                  <p className="font-medium text-sm truncate">{job.title}</p>
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
