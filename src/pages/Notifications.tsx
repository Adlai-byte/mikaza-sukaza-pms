import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  CheckCheck,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  UserPlus,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  DollarSign,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

export default function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showClearDialog, setShowClearDialog] = useState(false);

  const { notifications, loading, refetch } = useNotifications(500);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllRead = useDeleteAllRead();

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (statusFilter === 'unread' && n.is_read) return false;
    if (statusFilter === 'read' && !n.is_read) return false;
    if (typeFilter !== 'all' && !n.type.includes(typeFilter)) return false;
    return true;
  });

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.notification_id!);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification.mutate(notificationId);
  };

  const handleDeleteAllRead = () => {
    deleteAllRead.mutate();
    setShowClearDialog(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
      case 'issue_assigned':
        return <UserPlus className="h-5 w-5 text-blue-600" />;
      case 'task_completed':
      case 'issue_resolved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'task_due_soon':
      case 'task_overdue':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'task_status_changed':
      case 'issue_status_changed':
        return <Clock className="h-5 w-5 text-purple-600" />;
      case 'task_comment':
      case 'issue_comment':
      case 'mention':
        return <MessageSquare className="h-5 w-5 text-indigo-600" />;
      case 'booking_created':
      case 'booking_updated':
      case 'booking_status_changed':
        return <CalendarDays className="h-5 w-5 text-purple-600" />;
      case 'booking_confirmed':
        return <CalendarCheck className="h-5 w-5 text-green-600" />;
      case 'booking_cancelled':
        return <CalendarX className="h-5 w-5 text-red-600" />;
      case 'booking_check_in_reminder':
      case 'booking_check_out_reminder':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'booking_payment_received':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('common.notifications')}
        subtitle={`Manage all your notifications and alerts`}
        icon={Bell}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Read</p>
                <p className="text-2xl font-bold">{notifications.length - unreadCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Filtered</p>
                <p className="text-2xl font-bold">{filteredNotifications.length}</p>
              </div>
              <Filter className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread Only</SelectItem>
                  <SelectItem value="read">Read Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="issue">Issues</SelectItem>
                  <SelectItem value="booking">Bookings</SelectItem>
                  <SelectItem value="mention">Mentions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={loading}
                className="flex-1 sm:flex-initial"
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                {t('common.refresh')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending || unreadCount === 0}
                className="flex-1 sm:flex-initial"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearDialog(true)}
                disabled={deleteAllRead.isPending || notifications.every((n) => !n.is_read)}
                className="flex-1 sm:flex-initial text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Read
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Bell className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">No notifications found</p>
              <p className="text-sm">
                {notifications.length === 0
                  ? "You're all caught up!"
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
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
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-600" />
                  )}

                  <div className="flex gap-4 pl-5">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4
                            className={cn(
                              'text-sm mb-1',
                              !notification.is_read && 'font-semibold'
                            )}
                          >
                            {notification.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <p className="text-xs text-muted-foreground">
                              {formatTime(notification.created_at)}
                            </p>
                            {notification.action_user && (
                              <p className="text-xs text-muted-foreground">
                                by {notification.action_user.first_name}{' '}
                                {notification.action_user.last_name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {!notification.is_read && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              New
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDelete(e, notification.notification_id!)}
                            disabled={deleteNotification.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clear Read Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete All Read Notifications?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all read notifications. This action cannot be undone.
              Unread notifications will remain in your inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllRead}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Read
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
