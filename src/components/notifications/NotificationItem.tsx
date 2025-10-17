import { AppNotification } from '@/lib/schemas';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckSquare,
  AlertTriangle,
  CalendarDays,
  User,
  MessageSquare,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: AppNotification;
  onClick: () => void;
  onMarkAsRead?: () => void;
}

function getNotificationIcon(type: string) {
  const iconMap: Record<string, React.ReactNode> = {
    task_assigned: <CheckSquare className="h-4 w-4 text-blue-500" />,
    task_status_changed: <CheckSquare className="h-4 w-4 text-blue-500" />,
    task_completed: <CheckSquare className="h-4 w-4 text-green-500" />,
    task_due_soon: <CheckSquare className="h-4 w-4 text-amber-500" />,
    task_overdue: <CheckSquare className="h-4 w-4 text-red-500" />,
    task_comment: <MessageSquare className="h-4 w-4 text-blue-500" />,
    issue_assigned: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    issue_status_changed: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    issue_resolved: <AlertTriangle className="h-4 w-4 text-green-500" />,
    issue_comment: <MessageSquare className="h-4 w-4 text-orange-500" />,
    booking_created: <CalendarDays className="h-4 w-4 text-purple-500" />,
    booking_confirmed: <CalendarDays className="h-4 w-4 text-green-500" />,
    booking_cancelled: <CalendarDays className="h-4 w-4 text-red-500" />,
    booking_updated: <CalendarDays className="h-4 w-4 text-blue-500" />,
    booking_status_changed: <CalendarDays className="h-4 w-4 text-blue-500" />,
    booking_check_in_reminder: <CalendarDays className="h-4 w-4 text-amber-500" />,
    booking_check_out_reminder: <CalendarDays className="h-4 w-4 text-amber-500" />,
    booking_payment_received: <CalendarDays className="h-4 w-4 text-green-500" />,
    mention: <User className="h-4 w-4 text-blue-500" />,
  };

  return iconMap[type] || <Bell className="h-4 w-4 text-gray-500" />;
}

export function NotificationItem({ notification, onClick, onMarkAsRead }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead();
    }
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left px-4 py-3 hover:bg-accent transition-colors',
        'border-b border-border last:border-b-0',
        !notification.is_read && 'bg-blue-50/50 hover:bg-blue-100/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              'text-sm font-medium',
              !notification.is_read && 'font-semibold'
            )}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {notification.message}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at!), { addSuffix: true })}
            </span>
            {notification.action_user && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  by {notification.action_user.first_name} {notification.action_user.last_name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
