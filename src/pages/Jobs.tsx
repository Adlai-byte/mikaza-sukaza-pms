import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Clock,
  MapPin,
  User,
  CheckCircle,
  Calendar,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Timer,
  BriefcaseIcon,
  Search,
  Filter,
  XCircle,
  CheckSquare
} from "lucide-react";
import { useJobs, useJobStats, useCreateJob, useUpdateJob, useDeleteJob, JobFilters } from "@/hooks/useJobs";
import { format, parseISO } from "date-fns";
import { useState, useMemo } from "react";
import { JobDialog } from "@/components/jobs/JobDialog";
import { useAuth } from "@/contexts/AuthContext";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateTask } from "@/hooks/useTasks";
import { useToast } from "@/hooks/use-toast";

export default function Jobs() {
  const { user } = useAuth();
  const { properties } = usePropertiesOptimized();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

  // Build filters object
  const filters: JobFilters = useMemo(() => ({
    status: statusFilter.length > 0 ? statusFilter[0] : undefined,
    priority: priorityFilter.length > 0 ? priorityFilter[0] : undefined,
    job_type: jobTypeFilter || undefined,
    property_id: propertyFilter || undefined,
    assigned_to: assignedFilter || undefined,
    search: searchQuery || undefined,
  }), [statusFilter, priorityFilter, jobTypeFilter, propertyFilter, assignedFilter, searchQuery]);

  const { data: jobs = [], isLoading, isFetching, refetch } = useJobs(filters);
  const stats = useJobStats(filters);
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const createTask = useCreateTask();
  const { toast } = useToast();

  const [showJobDialog, setShowJobDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);

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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
      case "pending":
        return <Badge className="bg-orange-500 text-white">Pending</Badge>;
      case "review":
        return <Badge className="bg-purple-500 text-white">Review</Badge>;
      case "completed":
        return <Badge className="bg-green-600 text-white">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-destructive";
      case "high":
        return "text-orange-500";
      case "normal":
        return "text-blue-500";
      case "low":
        return "text-accent";
      default:
        return "text-muted-foreground";
    }
  };

  // Format dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "No due date";
    try {
      return format(parseISO(dateString), "MMM dd, yyyy h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Handlers
  const handleCreateJob = () => {
    setEditingJob(null);
    setShowJobDialog(true);
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job);
    setShowJobDialog(true);
  };

  const handleJobSubmit = async (jobData: any) => {
    try {
      if (editingJob) {
        await updateJob.mutateAsync({
          jobId: editingJob.job_id,
          updates: {
            ...jobData,
            created_by: user?.user_id,
          },
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

  // Create Task from Job
  const handleCreateTaskFromJob = async (job: any) => {
    try {
      // Map job type to task category
      const categoryMap: Record<string, string> = {
        'cleaning': 'cleaning',
        'maintenance': 'maintenance',
        'check_in': 'check_in_prep',
        'check_out': 'check_out_prep',
        'inspection': 'inspection',
        'repair': 'repair',
        'general': 'other',
        'emergency': 'repair',
        'preventive': 'maintenance',
      };

      // Map priority (job priorities: urgent, high, normal, low -> task priorities: low, medium, high, urgent)
      const priorityMap: Record<string, string> = {
        'urgent': 'urgent',
        'high': 'high',
        'normal': 'medium',
        'low': 'low',
      };

      const taskData = {
        title: `[JOB] ${job.title}`,
        description: `Task created from Job ${job.job_id?.slice(0, 8)}:\n\n${job.description || 'No description'}\n\n---\nJob Details:\n- Type: ${job.job_type}\n- Location: ${job.location_notes || 'N/A'}\n- Estimated Hours: ${job.estimated_hours || 'N/A'}\n- Estimated Cost: $${job.estimated_cost || '0'}`,
        property_id: job.property_id,
        assigned_to: job.assigned_to || null,
        status: 'pending' as const,
        priority: (priorityMap[job.priority] || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
        category: (categoryMap[job.job_type] || 'other') as any,
        due_date: job.due_date ? format(parseISO(job.due_date), 'yyyy-MM-dd') : null,
        due_time: job.due_date ? format(parseISO(job.due_date), 'HH:mm:ss') : null,
      };

      await createTask.mutateAsync(taskData);

      toast({
        title: "Task Created",
        description: `Task "${taskData.title}" created successfully from job`,
      });
    } catch (error) {
      console.error('Error creating task from job:', error);
      toast({
        title: "Error",
        description: "Failed to create task from job",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Active Jobs</h1>
          <p className="text-muted-foreground">
            Property work orders and maintenance tracking (Admin Only)
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            className="bg-gradient-primary hover:bg-gradient-secondary"
            onClick={handleCreateJob}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Job
          </Button>
        </div>
      </div>

      {/* Jobs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Jobs</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">{isLoading ? '...' : stats.total}</h3>
                <p className="text-xs text-blue-600 mt-1">All work orders</p>
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
                <p className="text-sm font-medium text-purple-700">In Progress</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">{isLoading ? '...' : stats.in_progress}</h3>
                <p className="text-xs text-purple-600 mt-1">Active assignments</p>
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
                <p className="text-sm font-medium text-orange-700">Pending</p>
                <h3 className="text-3xl font-bold text-orange-900 mt-1">{isLoading ? '...' : stats.pending}</h3>
                <p className="text-xs text-orange-600 mt-1">Awaiting action</p>
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
                <p className="text-sm font-medium text-green-700">Completed</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">{isLoading ? '...' : stats.completed}</h3>
                <p className="text-xs text-green-600 mt-1">
                  {stats.urgent > 0 ? `${stats.urgent} urgent` : 'All finished'}
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
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="search">Search Jobs</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Property Filter */}
            <div className="space-y-2">
              <Label htmlFor="property">Property</Label>
              <Select value={propertyFilter || undefined} onValueChange={(value) => setPropertyFilter(value === 'all' ? '' : value)}>
                <SelectTrigger id="property">
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
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
              <Label htmlFor="assignee">Assigned To</Label>
              <Select value={assignedFilter || undefined} onValueChange={(value) => setAssignedFilter(value === 'all' ? '' : value)}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
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
              <Label htmlFor="job-type">Job Type</Label>
              <Select value={jobTypeFilter || undefined} onValueChange={(value) => setJobTypeFilter(value === 'all' ? '' : value)}>
                <SelectTrigger id="job-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="check_in">Check In</SelectItem>
                  <SelectItem value="check_out">Check Out</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
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
              Pending
            </Badge>
            <Badge
              variant={statusFilter.includes('in_progress') ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleStatusFilter('in_progress')}
            >
              In Progress
            </Badge>
            <Badge
              variant={statusFilter.includes('review') ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleStatusFilter('review')}
            >
              Review
            </Badge>
            <Badge
              variant={statusFilter.includes('completed') ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleStatusFilter('completed')}
            >
              Completed
            </Badge>

            {/* Priority Filters */}
            <Badge
              variant={priorityFilter.includes('urgent') ? 'destructive' : 'outline'}
              className="cursor-pointer"
              onClick={() => togglePriorityFilter('urgent')}
            >
              Urgent
            </Badge>
            <Badge
              variant={priorityFilter.includes('high') ? 'default' : 'outline'}
              className="cursor-pointer bg-orange-500 hover:bg-orange-600"
              onClick={() => togglePriorityFilter('high')}
            >
              High Priority
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
                Clear All
              </Button>
            )}

            {/* Results Count */}
            <Badge variant="secondary" className="ml-auto">
              {jobs.length} result{jobs.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Active Jobs List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">Loading jobs...</span>
            </CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BriefcaseIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first work order
              </p>
              <Button
                className="bg-gradient-primary hover:bg-gradient-secondary"
                onClick={handleCreateJob}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.job_id} className="hover:shadow-card transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{job.title}</h3>
                      {getStatusBadge(job.status)}
                      <Badge variant="outline" className={getPriorityColor(job.priority)}>
                        {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)} Priority
                      </Badge>
                      {job.job_type && (
                        <Badge variant="secondary">
                          {job.job_type.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="font-medium text-primary">
                          {job.property?.property_name || 'No property assigned'}
                        </span>
                        {job.location_notes && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{job.location_notes}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span>
                          Assigned to:{' '}
                          {job.assigned_user
                            ? `${job.assigned_user.first_name} ${job.assigned_user.last_name}`
                            : 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Due: {formatDate(job.due_date)}</span>
                      </div>
                      {(job.estimated_cost || job.actual_cost) && (
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2" />
                          <span>
                            Cost: {job.actual_cost ? `$${job.actual_cost}` : `Est. $${job.estimated_cost || 0}`}
                          </span>
                        </div>
                      )}
                      {(job.estimated_hours || job.actual_hours) && (
                        <div className="flex items-center">
                          <Timer className="h-4 w-4 mr-2" />
                          <span>
                            Time: {job.actual_hours ? `${job.actual_hours}h` : `Est. ${job.estimated_hours || 0}h`}
                          </span>
                        </div>
                      )}
                    </div>

                    {job.description && (
                      <p className="text-sm mt-2 text-muted-foreground">{job.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Job ID: {job.job_id?.slice(0, 8)}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateTaskFromJob(job)}
                      disabled={createTask.isPending}
                    >
                      <CheckSquare className="h-3 w-3 mr-1" />
                      Create Task
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditJob(job)}
                    >
                      Edit Job
                    </Button>
                    <Button
                      size="sm"
                      className="bg-accent hover:bg-accent-hover"
                      onClick={() => handleEditJob(job)}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Job Dialog */}
      <JobDialog
        open={showJobDialog}
        onOpenChange={setShowJobDialog}
        onSubmit={handleJobSubmit}
        job={editingJob}
        isSubmitting={createJob.isPending || updateJob.isPending}
      />
    </div>
  );
}