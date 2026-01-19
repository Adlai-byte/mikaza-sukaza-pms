import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { History, CheckCircle, XCircle, Clock, Send, Mail, Timer, FileSpreadsheet } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  useReportScheduleHistory,
  useReportSchedule,
  ReportEmailHistory,
} from '@/hooks/useReportSchedules';

interface ReportScheduleHistoryDialogProps {
  scheduleId: string | null;
  onClose: () => void;
}

const STATUS_CONFIG: Record<
  ReportEmailHistory['status'],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  sending: { label: 'Sending', icon: Send, color: 'bg-blue-100 text-blue-800' },
  sent: { label: 'Sent', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

export function ReportScheduleHistoryDialog({
  scheduleId,
  onClose,
}: ReportScheduleHistoryDialogProps) {
  const { t } = useTranslation();
  const { data: schedule } = useReportSchedule(scheduleId);
  const { data: history, isLoading } = useReportScheduleHistory(scheduleId);

  return (
    <Dialog open={!!scheduleId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('automation.emailHistory', 'Email History')}
          </DialogTitle>
          <DialogDescription>
            {schedule?.schedule_name && (
              <span>
                {t('automation.historyFor', 'History for')}{' '}
                <strong>{schedule.schedule_name}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                {t('automation.noHistory', 'No history yet')}
              </h3>
              <p className="text-muted-foreground">
                {t(
                  'automation.noHistoryDescription',
                  'No reports have been sent for this schedule yet'
                )}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('automation.sentAt', 'Sent At')}</TableHead>
                  <TableHead>{t('automation.status', 'Status')}</TableHead>
                  <TableHead>{t('automation.recipients', 'Recipients')}</TableHead>
                  <TableHead>{t('automation.rows', 'Rows')}</TableHead>
                  <TableHead>{t('automation.duration', 'Duration')}</TableHead>
                  <TableHead>{t('automation.details', 'Details')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => {
                  const statusConfig = STATUS_CONFIG[entry.status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow key={entry.history_id}>
                      <TableCell className="font-medium">
                        {format(new Date(entry.sent_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{entry.recipient_emails.length}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                {entry.recipient_emails.map((email, i) => (
                                  <div key={i}>{email}</div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {entry.report_row_count !== null ? (
                          <div className="flex items-center gap-1">
                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                            <span>{entry.report_row_count}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.report_generation_time_ms !== null ? (
                          <div className="flex items-center gap-1">
                            <Timer className="h-4 w-4 text-muted-foreground" />
                            <span>{(entry.report_generation_time_ms / 1000).toFixed(2)}s</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.status === 'failed' && entry.error_message ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-destructive cursor-help underline">
                                  {t('automation.viewError', 'View Error')}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[300px]">
                                <p className="text-sm">{entry.error_message}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : entry.email_provider_id ? (
                          <span className="text-xs text-muted-foreground font-mono">
                            {entry.email_provider_id.slice(0, 8)}...
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
