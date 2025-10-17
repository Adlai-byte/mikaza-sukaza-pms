import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteAllRead,
} from '@/hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationItem } from './NotificationItem';
import { CheckCheck, Trash2, BellOff } from 'lucide-react';

interface NotificationDropdownProps {
  children: React.ReactNode;
}

export function NotificationDropdown({ children }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, loading } = useNotifications(20);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteAllRead = useDeleteAllRead();

  const handleNotificationClick = (notification: any) => {
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleDeleteAllRead = () => {
    deleteAllRead.mutate();
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const hasUnread = unreadNotifications.length > 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center gap-1">
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleDeleteAllRead}
              disabled={deleteAllRead.isPending}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <BellOff className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.notification_id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onMarkAsRead={() => handleMarkAsRead(notification.notification_id!)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  // TODO: Add dedicated notifications page
                  setOpen(false);
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
