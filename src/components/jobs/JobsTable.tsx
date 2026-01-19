// Jobs Table Component - Display jobs in tabular format with pagination
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BriefcaseIcon,
  MoreHorizontal,
  Edit,
  Eye,
  MapPin,
  User,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { JobWithRelations } from '@/hooks/useJobs';
import { useTranslation } from 'react-i18next';

interface JobsTableProps {
  jobs: JobWithRelations[];
  onEdit?: (job: JobWithRelations) => void;
  onView?: (job: JobWithRelations) => void;
  emptyMessage?: string;
}

const ITEMS_PER_PAGE = 10;

export function JobsTable({
  jobs,
  onEdit,
  onView,
  emptyMessage = 'No jobs found',
}: JobsTableProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination logic
  const totalPages = Math.ceil(jobs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedJobs = jobs.slice(startIndex, endIndex);

  // Reset to page 1 when jobs change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [jobs.length]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Badge className="bg-blue-500 text-white">{t('jobs.status.inProgress')}</Badge>;
      case "pending":
        return <Badge className="bg-orange-500 text-white">{t('jobs.status.pending')}</Badge>;
      case "review":
        return <Badge className="bg-purple-500 text-white">{t('jobs.status.review')}</Badge>;
      case "completed":
        return <Badge className="bg-green-600 text-white">{t('jobs.status.completed')}</Badge>;
      case "cancelled":
        return <Badge variant="destructive">{t('jobs.status.cancelled')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">{t('jobs.priority.urgent')}</Badge>;
      case "high":
        return <Badge className="bg-orange-500 text-white">{t('jobs.priority.high')}</Badge>;
      case "normal":
        return <Badge className="bg-blue-500 text-white">{t('jobs.priority.medium')}</Badge>;
      case "low":
        return <Badge variant="secondary">{t('jobs.priority.low')}</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-l-red-500";
      case "high":
        return "border-l-orange-500";
      case "normal":
        return "border-l-blue-500";
      case "low":
        return "border-l-gray-400";
      default:
        return "border-l-primary";
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('jobs.noDueDate');
    try {
      return format(parseISO(dateString), "MMM dd, yyyy");
    } catch (error) {
      return t('jobs.invalidDate');
    }
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <BriefcaseIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('jobs.noJobsYet')}</h3>
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BriefcaseIcon className="h-5 w-5" />
            {t('jobs.jobsList')}
          </CardTitle>
          <CardDescription>
            {t('jobs.showing')} {startIndex + 1}-{Math.min(endIndex, jobs.length)} {t('jobs.of')} {jobs.length} {jobs.length !== 1 ? t('jobs.jobsPlural') : t('jobs.job')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('jobs.jobId')}</TableHead>
                  <TableHead>{t('jobs.titleColumn')}</TableHead>
                  <TableHead>{t('jobs.property')}</TableHead>
                  <TableHead>{t('jobs.assignedTo')}</TableHead>
                  <TableHead>{t('jobs.dueDate')}</TableHead>
                  <TableHead>{t('jobs.priorityLabel')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('jobs.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedJobs.map((job) => (
                  <TableRow key={job.job_id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {job.job_id?.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium">{job.title}</div>
                        {job.job_type && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {job.job_type.replace(/_/g, ' ').toUpperCase()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{job.property?.property_name || t('jobs.noProperty')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {job.assigned_user
                            ? `${job.assigned_user.first_name} ${job.assigned_user.last_name}`
                            : t('jobs.unassigned')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(job.due_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(job.priority)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(job.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{t('jobs.openMenu')}</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('jobs.actions')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {onView && (
                            <DropdownMenuItem onClick={() => onView(job)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('jobs.viewDetails')}
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(job)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('jobs.editJob')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {paginatedJobs.map((job) => (
              <Card key={job.job_id} className={`border-l-4 ${getPriorityBorderColor(job.priority)}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Header: Title and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{job.title}</h3>
                      {job.job_type && (
                        <p className="text-sm text-muted-foreground">
                          {job.job_type.replace(/_/g, ' ').toUpperCase()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {getStatusBadge(job.status)}
                      {getPriorityBadge(job.priority)}
                    </div>
                  </div>

                  {/* Property and Assignee */}
                  <div className="grid grid-cols-2 gap-3 py-2 border-t border-b">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">{t('jobs.property')}</div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {job.property?.property_name || t('jobs.noProperty')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">{t('jobs.assignedTo')}</div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {job.assigned_user
                            ? `${job.assigned_user.first_name} ${job.assigned_user.last_name}`
                            : t('jobs.unassigned')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('jobs.dueDate')}: {formatDate(job.due_date)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-t pt-3">
                    {onView && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onView(job)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {t('jobs.viewDetails')}
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onEdit(job)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        {t('jobs.editJob')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {t('jobs.page')} {currentPage} {t('jobs.of')} {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                >
                  <ChevronFirst className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
