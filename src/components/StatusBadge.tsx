import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusBadgeProps {
  status: string;
  tooltip?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

// Status-specific tooltips and styling
const statusConfig: Record<string, { tooltip: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  // Booking statuses
  'confirmed': { tooltip: 'Booking has been confirmed', variant: 'default' },
  'pending': { tooltip: 'Awaiting confirmation', variant: 'secondary' },
  'cancelled': { tooltip: 'Booking was cancelled', variant: 'destructive' },
  'completed': { tooltip: 'Booking has been completed', variant: 'outline' },
  'checked-in': { tooltip: 'Guest has checked in', variant: 'default' },
  'checked-out': { tooltip: 'Guest has checked out', variant: 'outline' },

  // Job statuses
  'open': { tooltip: 'Job is open and awaiting assignment', variant: 'secondary' },
  'in-progress': { tooltip: 'Job is currently being worked on', variant: 'default' },
  'review': { tooltip: 'Job is under review', variant: 'secondary' },
  'done': { tooltip: 'Job has been completed', variant: 'outline' },

  // Priority levels
  'low': { tooltip: 'Low priority', variant: 'secondary' },
  'medium': { tooltip: 'Medium priority', variant: 'default' },
  'high': { tooltip: 'High priority - needs attention', variant: 'destructive' },
  'urgent': { tooltip: 'Urgent - immediate action required', variant: 'destructive' },

  // Payment statuses
  'paid': { tooltip: 'Payment has been received', variant: 'default' },
  'unpaid': { tooltip: 'Payment is pending', variant: 'destructive' },
  'partially_paid': { tooltip: 'Payment partially received', variant: 'secondary' },
  'overdue': { tooltip: 'Payment is overdue', variant: 'destructive' },

  // Issue statuses
  'reported': { tooltip: 'Issue has been reported', variant: 'secondary' },
  'investigating': { tooltip: 'Issue is being investigated', variant: 'default' },
  'resolved': { tooltip: 'Issue has been resolved', variant: 'outline' },
};

export function StatusBadge({ status, tooltip, variant, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-');
  const config = statusConfig[normalizedStatus];

  const badgeVariant = variant || config?.variant || 'default';
  const badgeTooltip = tooltip || config?.tooltip || `Status: ${status}`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={badgeVariant} className={className}>
            {status}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{badgeTooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
