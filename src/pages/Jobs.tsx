// Jobs Management Module - Property work orders and maintenance tracking
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import {
  Plus,
  Clock,
  AlertTriangle,
  RefreshCw,
  BriefcaseIcon,
  Search,
  Filter,
  XCircle,
  CheckCircle,
  History,
  List,
  LayoutGrid,
  CalendarDays,
} from "lucide-react";
import { useJobs, useJobStats, useCreateJob, useUpdateJob, useDeleteJob, JobFilters } from "@/hooks/useJobs";
import { format, parseISO } from "date-fns";
import { useState, useMemo } from "react";
import { JobDialog } from "@/components/jobs/JobDialog";
import { JobDetailsDialog } from "@/components/jobs/JobDetailsDialog";
import { JobsTable } from "@/components/jobs/JobsTable";
import { JobsKanban } from "@/components/jobs/JobsKanban";
import { JobsCalendar } from "@/components/jobs/JobsCalendar";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

// Job type for local state
interface JobType {
  job_id: string;
  status: string;
  [key: string]: unknown;
}

export default function Jobs() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { properties } = usePropertiesOptimized();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // All useState hooks must be called unconditionally at the top
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<JobType | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobType | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'board' | 'calendar' | 'history'>('calendar');

  // Build filters object
  const filters: JobFilters = useMemo(() => ({
    status: statusFilter.length > 0 ? statusFilter[0] : undefined,
    priority: priorityFilter.length > 0 ? priorityFilter[0] : undefined,
    job_type: jobTypeFilter || undefined,
    property_id: propertyFilter || undefined,
    assigned_to: assignedFilter || undefined,
    search: searchQuery || undefined,
  }), [statusFilter, priorityFilter, jobTypeFilter, propertyFilter, assignedFilter, searchQuery]);

  // Fetch history jobs separately (always fetch completed/cancelled regardless of filters)
  const historyFilters: JobFilters = useMemo(() => ({
    priority: priorityFilter.length > 0 ? priorityFilter[0] : undefined,
    job_type: jobTypeFilter || undefined,
    property_id: propertyFilter || undefined,
    assigned_to: assignedFilter || undefined,
    search: searchQuery || undefined,
  }), [priorityFilter, jobTypeFilter, propertyFilter, assignedFilter, searchQuery]);

  // All custom hooks and useQuery hooks
  const { data: jobs = [], isLoading, isFetching, refetch } = useJobs(filters);
  const stats = useJobStats(filters);
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  // Fetch users for filter
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-jobs-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: allHistoryJobs = [] } = useQuery({
    queryKey: ['jobs-history', historyFilters],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          property:properties(property_id, property_name),
          assigned_user:users!jobs_assigned_to_fkey(user_id, first_name, last_name, email),
          created_user:users!jobs_created_by_fkey(user_id, first_name, last_name)
        `)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false });

      // Apply non-status filters
      if (historyFilters.priority) {
        query = query.eq('priority', historyFilters.priority);
      }
      if (historyFilters.job_type) {
        query = query.eq('job_type', historyFilters.job_type);
      }
      if (historyFilters.assigned_to) {
        query = query.eq('assigned_to', historyFilters.assigned_to);
      }
      if (historyFilters.property_id) {
        query = query.eq('property_id', historyFilters.property_id);
      }
      if (historyFilters.search) {
        query = query.or(`title.ilike.%${historyFilters.search}%,description.ilike.%${historyFilters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching history jobs:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Separate active jobs from history (completed/cancelled)
  const activeJobs = useMemo(() =>
    jobs.filter((job: JobType) => job.status !== 'completed' && job.status !== 'cancelled'),
    [jobs]
  );

  // Permission check - Jobs is admin only (after all hooks)
  const canViewJobs = hasPermission(PERMISSIONS.JOBS_VIEW);
  if (!canViewJobs) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              {t('jobs.accessDenied')}
            </CardTitle>
            <CardDescription>
              {t('jobs.noPermission')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const historyJobs = allHistoryJobs;

  // Handlers
  const handleCreateJob = () => {
    setEditingJob(null);
    setShowJobDialog(true);
  };

  const handleEditJob = (job: JobType) => {
    setEditingJob(job);
    setShowJobDialog(true);
  };

  const handleViewJob = (job: JobType) => {
    setSelectedJob(job);
    setShowDetailsDialog(true);
  };

  const handleStatusChange = async (jobId: string, status: string) => {
    try {
      await updateJob.mutateAsync({
        jobId,
        updates: { status },
      });
      toast({
        title: t('common.statusUpdated'),
        description: t('jobs.statusChanged', { status: t(`jobs.status.${status}`) }),
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      toast({
        title: t('common.error'),
        description: t('jobs.statusChangeFailed'),
        variant: "destructive",
      });
    }
  };

  const handleJobSubmit = async (jobData: Record<string, unknown>) => {
    try {
      if (editingJob) {
        await updateJob.mutateAsync({
          jobId: editingJob.job_id,
          updates: jobData, // Don't modify created_by on update
        });
      } else {
        await createJob.mutateAsync({
          ...jobData,
          created_by: user?.user_id,
        });
      }
      setShowJobDialog(false);
      setEditingJob(null);
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [status]
    );
  };

  const togglePriorityFilter = (priority: string) => {
    setPriorityFilter(prev =>
      prev.includes(priority) ? prev.filter(p => p !== priority) : [priority]
    );
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setPriorityFilter([]);
    setJobTypeFilter('');
    setPropertyFilter('');
    setAssignedFilter('');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter.length > 0 ||
    priorityFilter.length > 0 ||
    jobTypeFilter ||
    propertyFilter ||
    assignedFilter ||
    searchQuery;

  // Refresh both active and history jobs
  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['jobs-history'] });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('jobs.title')}
        subtitle={t('jobs.subtitle')}
        icon={BriefcaseIcon}
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button
              className="bg-gradient-primary hover:bg-gradient-secondary"
              onClick={handleCreateJob}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('jobs.newJob')}
            </Button>
          </>
        }
      />

      {/* Jobs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">{t('jobs.totalJobs')}</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">{isLoading ? '...' : stats.total}</h3>
                <p className="text-xs text-blue-600 mt-1">{t('jobs.allWorkOrders')}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <BriefcaseIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">{t('jobs.inProgressJobs')}</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">{isLoading ? '...' : stats.in_progress}</h3>
                <p className="text-xs text-purple-600 mt-1">{t('jobs.activeAssignments')}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">{t('jobs.pendingJobs')}</p>
                <h3 className="text-3xl font-bold text-orange-900 mt-1">{isLoading ? '...' : stats.pending}</h3>
                <p className="text-xs text-orange-600 mt-1">{t('jobs.awaitingAction')}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">{t('jobs.completedJobs')}</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">{isLoading ? '...' : stats.completed}</h3>
                <p className="text-xs text-green-600 mt-1">
                  {stats.urgent > 0 ? `${stats.urgent} ${t('jobs.priority.urgent')}` : t('jobs.allFinished')}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('jobs.filtersAndSearch')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="search">{t('jobs.searchJobs')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={t('jobs.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Property Filter */}
            <div className="space-y-2">
              <Label htmlFor="property">{t('jobs.property')}</Label>
              <Select value={propertyFilter || undefined} onValueChange={(value) => setPropertyFilter(value === 'all' ? '' : value)}>
                <SelectTrigger id="property">
                  <SelectValue placeholder={t('jobs.allProperties')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('jobs.allProperties')}</SelectItem>
                  {properties.map(property => (
                    <SelectItem key={property.property_id} value={property.property_id!}>
                      {property.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Filter */}
            <div className="space-y-2">
              <Label htmlFor="assignee">{t('jobs.assignedTo')}</Label>
              <Select value={assignedFilter || undefined} onValueChange={(value) => setAssignedFilter(value === 'all' ? '' : value)}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder={t('jobs.allUsers')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('jobs.allUsers')}</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.first_name} {u.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="job-type">{t('jobs.jobType')}</Label>
              <Select value={jobTypeFilter || undefined} onValueChange={(value) => setJobTypeFilter(value === 'all' ? '' : value)}>
                <SelectTrigger id="job-type">
                  <SelectValue placeholder={t('jobs.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('jobs.allTypes')}</SelectItem>
                  <SelectItem value="general">{t('jobs.types.general')}</SelectItem>
                  <SelectItem value="maintenance">{t('jobs.types.maintenance')}</SelectItem>
                  <SelectItem value="cleaning">{t('jobs.types.cleaning')}</SelectItem>
                  <SelectItem value="inspection">{t('jobs.types.inspection')}</SelectItem>
                  <SelectItem value="check_in">{t('jobs.types.checkIn')}</SelectItem>
                  <SelectItem value="check_out">{t('jobs.types.checkOut')}</SelectItem>
                  <SelectItem value="repair">{t('jobs.types.repair')}</SelectItem>
                  <SelectItem value="emergency">{t('jobs.types.emergency')}</SelectItem>
                  <SelectItem value="preventive">{t('jobs.types.preventive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Status Filters */}
            <Badge
              variant={statusFilter.includes('pending') ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleStatusFilter('pending')}
            >
              {t('jobs.status.pending')}
            </Badge>
            <Badge
              variant={statusFilter.includes('in_progress') ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleStatusFilter('in_progress')}
            >
              {t('jobs.status.inProgress')}
            </Badge>
            <Badge
              variant={statusFilter.includes('review') ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleStatusFilter('review')}
            >
              {t('jobs.status.review')}
            </Badge>
            <Badge
              variant={statusFilter.includes('completed') ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleStatusFilter('completed')}
            >
              {t('jobs.status.completed')}
            </Badge>

            {/* Priority Filters */}
            <Badge
              variant={priorityFilter.includes('urgent') ? 'destructive' : 'outline'}
              className="cursor-pointer"
              onClick={() => togglePriorityFilter('urgent')}
            >
              {t('jobs.priority.urgent')}
            </Badge>
            <Badge
              variant={priorityFilter.includes('high') ? 'default' : 'outline'}
              className="cursor-pointer bg-orange-500 hover:bg-orange-600"
              onClick={() => togglePriorityFilter('high')}
            >
              {t('jobs.highPriority')}
            </Badge>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7"
              >
                <XCircle className="mr-1 h-3 w-3" />
                {t('jobs.clearAll')}
              </Button>
            )}

            {/* Results Count */}
            <Badge variant="secondary" className="ml-auto">
              {jobs.length} {jobs.length !== 1 ? t('jobs.results') : t('jobs.result')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Tabs for Active Jobs, Board View, Calendar, and History */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'active' | 'board' | 'calendar' | 'history')}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {t('jobs.calendar.title', 'Calendar')}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            {t('jobs.activeJobs')} ({activeJobs.length})
          </TabsTrigger>
          <TabsTrigger value="board" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            {t('jobs.boardView')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {t('jobs.jobHistory')} ({historyJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-0">
          {isLoading ? (
            <Card>
              <CardContent className="p-12 flex flex-col items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
                <span className="text-muted-foreground">{t('jobs.loadingJobs')}</span>
              </CardContent>
            </Card>
          ) : (
            <JobsTable
              jobs={activeJobs}
              onEdit={handleEditJob}
              onView={handleViewJob}
              emptyMessage={t('jobs.noActiveJobs')}
            />
          )}
        </TabsContent>

        <TabsContent value="board" className="mt-0">
          {isLoading ? (
            <Card>
              <CardContent className="p-12 flex flex-col items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
                <span className="text-muted-foreground">{t('jobs.loadingJobs')}</span>
              </CardContent>
            </Card>
          ) : (
            <JobsKanban
              jobs={jobs}
              onEdit={handleEditJob}
              onView={handleViewJob}
              onStatusChange={handleStatusChange}
            />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <JobsCalendar
            jobs={jobs}
            isLoading={isLoading}
            onViewJob={handleViewJob}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <JobsTable
            jobs={historyJobs}
            onView={handleViewJob}
            emptyMessage={t('jobs.noCompletedJobs')}
          />
        </TabsContent>
      </Tabs>

      {/* Job Dialog */}
      <JobDialog
        open={showJobDialog}
        onOpenChange={setShowJobDialog}
        onSubmit={handleJobSubmit}
        job={editingJob}
        isSubmitting={createJob.isPending || updateJob.isPending}
      />

      {/* Job Details Dialog */}
      <JobDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        job={selectedJob}
        onEdit={handleEditJob}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}