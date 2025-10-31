import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MapPin,
  User,
  Calendar,
  MoreHorizontal,
  Edit,
  Eye,
  CheckSquare,
  Clock,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { JobWithRelations } from '@/hooks/useJobs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';

interface JobsKanbanProps {
  jobs: JobWithRelations[];
  onEdit?: (job: JobWithRelations) => void;
  onView?: (job: JobWithRelations) => void;
  onStatusChange?: (jobId: string, newStatus: string) => void;
}

type JobStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';

interface Column {
  id: JobStatus;
  title: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

export function JobsKanban({
  jobs,
  onEdit,
  onView,
  onStatusChange,
}: JobsKanbanProps) {
  const { t } = useTranslation();
  const [draggedJob, setDraggedJob] = useState<JobWithRelations | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<JobStatus | null>(null);

  const columns: Column[] = [
    {
      id: 'pending',
      title: t('jobs.status.pending'),
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      icon: <Clock className="h-4 w-4" />,
    },
    {
      id: 'in_progress',
      title: t('jobs.status.inProgress'),
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      icon: <PlayCircle className="h-4 w-4" />,
    },
    {
      id: 'review',
      title: t('jobs.status.review'),
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      icon: <PauseCircle className="h-4 w-4" />,
    },
    {
      id: 'completed',
      title: t('jobs.status.completed'),
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      icon: <CheckCircle className="h-4 w-4" />,
    },
    {
      id: 'cancelled',
      title: t('jobs.status.cancelled'),
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      icon: <XCircle className="h-4 w-4" />,
    },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive" className="text-xs">{t('jobs.priority.urgent')}</Badge>;
      case "high":
        return <Badge className="bg-orange-500 text-white text-xs">{t('jobs.priority.high')}</Badge>;
      case "normal":
        return <Badge className="bg-blue-500 text-white text-xs">{t('jobs.priority.medium')}</Badge>;
      case "low":
        return <Badge variant="secondary" className="text-xs">{t('jobs.priority.low')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{priority}</Badge>;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('jobs.noDueDate');
    try {
      return format(parseISO(dateString), "MMM dd");
    } catch (error) {
      return t('jobs.invalidDate');
    }
  };

  const getJobsByStatus = (status: JobStatus) => {
    return jobs.filter(job => job.status === status);
  };

  const handleDragStart = (e: React.DragEvent, job: JobWithRelations) => {
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: JobStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: JobStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedJob && draggedJob.status !== status && onStatusChange) {
      onStatusChange(draggedJob.job_id!, status);
    }
    setDraggedJob(null);
  };

  const handleDragEnd = () => {
    setDraggedJob(null);
    setDragOverColumn(null);
  };

  const handleStatusChangeFromMenu = (job: JobWithRelations, newStatus: string) => {
    if (onStatusChange && job.job_id) {
      onStatusChange(job.job_id, newStatus);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnJobs = getJobsByStatus(column.id);

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-80"
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <Card className={`${column.bgColor} border-0 shadow-md transition-all ${
              dragOverColumn === column.id ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${column.color}`}>
                  {column.icon}
                  {column.title}
                  <Badge variant="secondary" className="ml-auto">
                    {columnJobs.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="space-y-3 pr-4">
                    {columnJobs.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No jobs in {column.title.toLowerCase()}
                      </div>
                    ) : (
                      columnJobs.map((job) => (
                        <Card
                          key={job.job_id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, job)}
                          onDragEnd={handleDragEnd}
                          className={`cursor-move hover:shadow-lg transition-all duration-200 bg-white border-l-4 ${
                            draggedJob?.job_id === job.job_id ? 'opacity-50' : 'opacity-100'
                          }`}
                          style={{
                            borderLeftColor:
                              job.priority === 'urgent' ? '#ef4444' :
                              job.priority === 'high' ? '#f97316' :
                              job.priority === 'normal' ? '#3b82f6' :
                              '#94a3b8'
                          }}
                        >
                          <CardContent className="p-4 space-y-3">
                            {/* Title and Priority */}
                            <div className="space-y-2">
                              <div className="font-semibold text-sm line-clamp-2">
                                {job.title}
                              </div>
                              <div className="flex items-center gap-2">
                                {getPriorityBadge(job.priority)}
                                {job.job_type && (
                                  <Badge variant="outline" className="text-xs">
                                    {job.job_type.replace(/_/g, ' ').toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Property and Assigned User */}
                            <div className="space-y-1.5 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="truncate">
                                  {job.property?.property_name || t('jobs.noProperty')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                <span className="truncate">
                                  {job.assigned_user
                                    ? `${job.assigned_user.first_name} ${job.assigned_user.last_name}`
                                    : t('jobs.unassigned')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{formatDate(job.due_date)}</span>
                              </div>
                            </div>

                            {/* Job ID */}
                            <div className="text-xs text-muted-foreground font-mono">
                              ID: {job.job_id?.slice(0, 8)}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              {onView && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 flex-1 text-xs"
                                  onClick={() => onView(job)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{t('jobs.actions')}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {onEdit && (
                                    <DropdownMenuItem onClick={() => onEdit(job)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      {t('jobs.editJob')}
                                    </DropdownMenuItem>
                                  )}

                                  {onStatusChange && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                                        {t('jobs.changeStatus')}
                                      </DropdownMenuLabel>
                                      {job.status !== 'pending' && (
                                        <DropdownMenuItem onClick={() => handleStatusChangeFromMenu(job, 'pending')}>
                                          <Clock className="mr-2 h-4 w-4" />
                                          {t('jobs.moveToPending')}
                                        </DropdownMenuItem>
                                      )}
                                      {job.status !== 'in_progress' && (
                                        <DropdownMenuItem onClick={() => handleStatusChangeFromMenu(job, 'in_progress')}>
                                          <PlayCircle className="mr-2 h-4 w-4" />
                                          {t('jobs.moveToInProgress')}
                                        </DropdownMenuItem>
                                      )}
                                      {job.status !== 'review' && (
                                        <DropdownMenuItem onClick={() => handleStatusChangeFromMenu(job, 'review')}>
                                          <PauseCircle className="mr-2 h-4 w-4" />
                                          {t('jobs.moveToReview')}
                                        </DropdownMenuItem>
                                      )}
                                      {job.status !== 'completed' && (
                                        <DropdownMenuItem onClick={() => handleStatusChangeFromMenu(job, 'completed')}>
                                          <CheckCircle className="mr-2 h-4 w-4" />
                                          {t('jobs.markAsCompleted')}
                                        </DropdownMenuItem>
                                      )}
                                      {job.status !== 'cancelled' && (
                                        <DropdownMenuItem onClick={() => handleStatusChangeFromMenu(job, 'cancelled')}>
                                          <XCircle className="mr-2 h-4 w-4" />
                                          {t('jobs.cancelJob')}
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
