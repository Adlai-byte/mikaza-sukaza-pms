import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCheck,
  Trash2,
  X,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteAllRead,
} from '@/hooks/useNotifications';
import { AppNotification } from '@/lib/schemas';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationPanelProps {
  onClose?: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, loading } = useNotifications(50);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllRead = useDeleteAllRead();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: AppNotification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead.mutate(notification.notification_id!);
    }

    // Navigate to link if provided
    if (notification.link) {
      navigate(notification.link);
      onClose?.();
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleDeleteAllRead = () => {
    if (confirm('Delete all read notifications?')) {
      deleteAllRead.mutate();
    }
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification.mutate(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
      case 'issue_assigned':
        return <UserPlus className="h-4 w-4 text-blue-600" />;
      case 'task_completed':
      case 'issue_resolved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'task_due_soon':
      case 'task_overdue':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'task_status_changed':
      case 'issue_status_changed':
        return <Clock className="h-4 w-4 text-purple-600" />;
      case 'task_comment':
      case 'issue_comment':
      case 'mention':
        return <MessageSquare className="h-4 w-4 text-indigo-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (notification: AppNotification) => {
    const metadata = notification.metadata as any;
    const priority = metadata?.priority || notification.task?.priority || notification.issue?.priority;

    if (!priority) return null;

    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge variant="outline" className={cn('text-xs ml-2', colors[priority as keyof typeof colors] || colors.medium)}>
        {priority}
      </Badge>
    );
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Notifications</h3>
          {notifications.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {notifications.filter(n => !n.is_read).length} new
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending || notifications.every(n => n.is_read)}
            className="h-8 text-xs"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteAllRead}
            disabled={deleteAllRead.isPending || !notifications.some(n => n.is_read)}
            className="h-8 text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear read
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Bell className="h-12 w-12 mb-2 opacity-20" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={cn(
                  'relative p-4 hover:bg-muted/50 transition-colors cursor-pointer group',
                  !notification.is_read && 'bg-blue-50/50'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Unread indicator */}
                {!notification.is_read && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600" />
                )}

                <div className="flex gap-3 pl-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            'text-sm',
                            !notification.is_read && 'font-semibold'
                          )}>
                            {notification.title}
                          </span>
                          {getPriorityBadge(notification)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDelete(e, notification.notification_id!)}
                        disabled={deleteNotification.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Related info */}
                    {notification.action_user && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <span>by</span>
                        <span className="font-medium">
                          {notification.action_user.first_name} {notification.action_user.last_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t p-3 text-center">
          <Button variant="link" size="sm" className="text-xs" onClick={() => {
            navigate('/notifications');
            onClose?.();
          }}>
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );
}
