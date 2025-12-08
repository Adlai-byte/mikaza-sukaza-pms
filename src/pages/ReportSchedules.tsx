import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Clock,
  Plus,
  RefreshCw,
  Play,
  History,
  Edit,
  Trash2,
  Mail,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useReportSchedules,
  useDeleteReportSchedule,
  useToggleReportSchedule,
  useSendReportNow,
  REPORT_TYPES,
  DAYS_OF_WEEK,
  ReportSchedule,
} from '@/hooks/useReportSchedules';
import { AddReportScheduleDialog } from '@/components/automation/AddReportScheduleDialog';
import { ReportScheduleHistoryDialog } from '@/components/automation/ReportScheduleHistoryDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export default function ReportSchedules() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PERMISSIONS.AUTOMATION_CREATE);
  const canEdit = hasPermission(PERMISSIONS.AUTOMATION_EDIT);
  const canDelete = hasPermission(PERMISSIONS.AUTOMATION_DELETE);

  // State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [historyScheduleId, setHistoryScheduleId] = useState<string | null>(null);

  // Data fetching
  const { schedules, isLoading, refetch } = useReportSchedules();
  const deleteSchedule = useDeleteReportSchedule();
  const toggleSchedule = useToggleReportSchedule();
  const sendReportNow = useSendReportNow();

  // Format time for display
  const formatScheduleTime = (schedule: ReportSchedule) => {
    const day = DAYS_OF_WEEK.find((d) => d.value === schedule.day_of_week)?.label || 'Unknown';
    const hour = schedule.hour_of_day.toString().padStart(2, '0');
    const minute = schedule.minute_of_hour.toString().padStart(2, '0');
    const period = schedule.hour_of_day >= 12 ? 'PM' : 'AM';
    const hour12 = schedule.hour_of_day % 12 || 12;
    return `${day} at ${hour12}:${minute} ${period}`;
  };

  // Handle toggle
  const handleToggle = (schedule: ReportSchedule) => {
    toggleSchedule.mutate({
      scheduleId: schedule.schedule_id,
      isEnabled: !schedule.is_enabled,
    });
  };

  // Handle delete
  const handleDelete = () => {
    if (deleteScheduleId) {
      deleteSchedule.mutate(deleteScheduleId, {
        onSuccess: () => setDeleteScheduleId(null),
      });
    }
  };

  // Handle send now
  const handleSendNow = (scheduleId: string) => {
    sendReportNow.mutate(scheduleId);
  };

  // Stats
  const activeCount = schedules.filter((s) => s.is_enabled).length;
  const totalCount = schedules.length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" />
            {t('automation.reportSchedules', 'Report Schedules')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('automation.reportSchedulesDescription', 'Schedule automated report emails to be sent weekly')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
          {canCreate && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('automation.addSchedule', 'Add Schedule')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('automation.totalSchedules', 'Total Schedules')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('automation.activeSchedules', 'Active Schedules')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('automation.pausedSchedules', 'Paused Schedules')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{totalCount - activeCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t('automation.scheduledReports', 'Scheduled Reports')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t('automation.noSchedules', 'No schedules yet')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('automation.noSchedulesDescription', 'Create your first automated report schedule')}
              </p>
              {canCreate && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('automation.addSchedule', 'Add Schedule')}
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('automation.scheduleName', 'Name')}</TableHead>
                  <TableHead>{t('automation.reportType', 'Report Type')}</TableHead>
                  <TableHead>{t('automation.schedule', 'Schedule')}</TableHead>
                  <TableHead>{t('automation.recipients', 'Recipients')}</TableHead>
                  <TableHead>{t('automation.status', 'Status')}</TableHead>
                  <TableHead>{t('automation.lastSent', 'Last Sent')}</TableHead>
                  <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.schedule_id}>
                    <TableCell className="font-medium">{schedule.schedule_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {REPORT_TYPES[schedule.report_type] || schedule.report_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatScheduleTime(schedule)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{schedule.recipient_emails.length} recipient(s)</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              {schedule.recipient_emails.map((email, i) => (
                                <div key={i}>{email}</div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.is_enabled}
                          onCheckedChange={() => handleToggle(schedule)}
                          disabled={!canEdit}
                        />
                        <Badge variant={schedule.is_enabled ? 'default' : 'secondary'}>
                          {schedule.is_enabled
                            ? t('common.enabled', 'Enabled')
                            : t('common.disabled', 'Disabled')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {schedule.last_sent_at
                        ? format(new Date(schedule.last_sent_at), 'MMM d, yyyy HH:mm')
                        : t('automation.never', 'Never')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSendNow(schedule.schedule_id)}
                                disabled={sendReportNow.isPending}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('automation.sendNow', 'Send Now')}</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setHistoryScheduleId(schedule.schedule_id)}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('automation.viewHistory', 'View History')}</TooltipContent>
                          </Tooltip>

                          {canEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingSchedule(schedule)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('common.edit', 'Edit')}</TooltipContent>
                            </Tooltip>
                          )}

                          {canDelete && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteScheduleId(schedule.schedule_id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('common.delete', 'Delete')}</TooltipContent>
                            </Tooltip>
                          )}
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <AddReportScheduleDialog
        open={isAddDialogOpen || !!editingSchedule}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingSchedule(null);
          }
        }}
        schedule={editingSchedule}
      />

      {/* History Dialog */}
      <ReportScheduleHistoryDialog
        scheduleId={historyScheduleId}
        onClose={() => setHistoryScheduleId(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteScheduleId} onOpenChange={() => setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('automation.deleteScheduleTitle', 'Delete Schedule')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'automation.deleteScheduleDescription',
                'Are you sure you want to delete this schedule? This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
