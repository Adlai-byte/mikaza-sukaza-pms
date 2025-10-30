import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  Download,
  BarChart3,
} from "lucide-react";
import { useJobs, useJobStats, JobFilters, useUpdateJob } from "@/hooks/useJobs";
import { format, parseISO } from "date-fns";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { JobDetailsDialog } from "@/components/jobs/JobDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface PipelineStats {
  totalValue: number;
  pendingValue: number;
  inProgressValue: number;
  completedValue: number;
  averageJobValue: number;
  conversionRate: number;
}

export default function ServicePipeline() {
  const { user } = useAuth();
  const { properties } = usePropertiesOptimized();
  const { toast } = useToast();
  const updateJob = useUpdateJob();

  // Dialog states
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [timeRange, setTimeRange] = useState('30'); // days

  // Build filters
  const filters: JobFilters = useMemo(() => {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(timeRange));

    return {
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      property_id: propertyFilter || undefined,
      due_date_from: timeRange !== 'all' ? dateLimit.toISOString().split('T')[0] : undefined,
    };
  }, [statusFilter, priorityFilter, propertyFilter, timeRange]);

  const { data: jobs = [], isLoading, isFetching, refetch } = useJobs(filters);
  const stats = useJobStats(filters);

  // Calculate pipeline statistics
  const pipelineStats: PipelineStats = useMemo(() => {
    // Assuming job types have associated estimated costs
    const getJobValue = (job: any) => {
      // This would ideally come from a cost field in the database
      // For now, using a simplified estimation based on job type and priority
      const baseValues: Record<string, number> = {
        'maintenance': 500,
        'cleaning': 200,
        'inspection': 150,
        'repair': 800,
        'emergency': 1200,
        'installation': 1500,
        'other': 300,
      };

      const priorityMultiplier: Record<string, number> = {
        'urgent': 1.5,
        'high': 1.3,
        'medium': 1.0,
        'low': 0.8,
      };

      const base = baseValues[job.job_type?.toLowerCase()] || 300;
      const multiplier = priorityMultiplier[job.priority?.toLowerCase()] || 1.0;

      return base * multiplier;
    };

    const totalValue = jobs.reduce((sum, job) => sum + getJobValue(job), 0);
    const pendingJobs = jobs.filter(j => j.status === 'pending');
    const inProgressJobs = jobs.filter(j => j.status === 'in_progress');
    const completedJobs = jobs.filter(j => j.status === 'completed');

    const pendingValue = pendingJobs.reduce((sum, job) => sum + getJobValue(job), 0);
    const inProgressValue = inProgressJobs.reduce((sum, job) => sum + getJobValue(job), 0);
    const completedValue = completedJobs.reduce((sum, job) => sum + getJobValue(job), 0);

    const averageJobValue = jobs.length > 0 ? totalValue / jobs.length : 0;
    const conversionRate = (pendingJobs.length + inProgressJobs.length) > 0
      ? (completedJobs.length / (completedJobs.length + pendingJobs.length + inProgressJobs.length)) * 100
      : 0;

    return {
      totalValue,
      pendingValue,
      inProgressValue,
      completedValue,
      averageJobValue,
      conversionRate,
    };
  }, [jobs]);

  // Group jobs by status for pipeline view
  const jobsByStatus = useMemo(() => {
    return {
      pending: jobs.filter(j => j.status === 'pending'),
      in_progress: jobs.filter(j => j.status === 'in_progress'),
      review: jobs.filter(j => j.status === 'review'),
      completed: jobs.filter(j => j.status === 'completed'),
    };
  }, [jobs]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return colors[priority?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Handlers
  const handleJobClick = (job: any) => {
    setSelectedJob(job);
    setShowDetailsDialog(true);
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await updateJob.mutateAsync({
        job_id: jobId,
        status: newStatus,
      });
      toast({
        title: "Success",
        description: "Job status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Job ID', 'Title', 'Property', 'Status', 'Priority', 'Type', 'Due Date', 'Assigned To'];
    const rows = jobs.map(job => [
      job.job_id,
      job.title,
      job.property?.property_name || 'N/A',
      job.status,
      job.priority,
      job.job_type,
      job.due_date ? format(parseISO(job.due_date), 'yyyy-MM-dd') : 'N/A',
      job.assigned_user ? `${job.assigned_user.first_name} ${job.assigned_user.last_name}` : 'Unassigned'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-pipeline-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Pipeline data exported successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold"><Skeleton className="h-9 w-64" /></h1>
            <p className="text-muted-foreground mt-1"><Skeleton className="h-5 w-96" /></p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Service Pipeline</h1>
          <p className="text-muted-foreground">
            Track service jobs and revenue opportunities through delivery stages
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={priorityFilter || "all"} onValueChange={(v) => setPriorityFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Property</label>
              <Select value={propertyFilter || "all"} onValueChange={(v) => setPropertyFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {properties?.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id}>
                      {property.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Pipeline Value</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {formatCurrency(pipelineStats.totalValue)}
                </h3>
                <p className="text-xs text-blue-600 mt-1">{jobs.length} jobs</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Pending Value</p>
                <h3 className="text-3xl font-bold text-orange-900 mt-1">
                  {formatCurrency(pipelineStats.pendingValue)}
                </h3>
                <p className="text-xs text-orange-600 mt-1">{jobsByStatus.pending.length} jobs</p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">In Progress</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  {formatCurrency(pipelineStats.inProgressValue)}
                </h3>
                <p className="text-xs text-purple-600 mt-1">{jobsByStatus.in_progress.length} jobs</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Completed Value</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {formatCurrency(pipelineStats.completedValue)}
                </h3>
                <p className="text-xs text-green-600 mt-1">{jobsByStatus.completed.length} jobs</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Job Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pipelineStats.averageJobValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per job</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipelineStats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Jobs completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobsByStatus.pending.length + jobsByStatus.in_progress.length + jobsByStatus.review.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending + In Progress + Review</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>Jobs organized by status with revenue potential</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Pending Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-orange-700 mr-2" />
                  <span className="font-medium text-orange-900">Pending</span>
                </div>
                <Badge variant="secondary" className="bg-orange-200 text-orange-900">
                  {jobsByStatus.pending.length}
                </Badge>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {jobsByStatus.pending.map((job) => (
                    <Card
                      key={job.job_id}
                      className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleJobClick(job)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm line-clamp-2">{job.title}</h4>
                          <Badge className={getPriorityColor(job.priority || 'medium')} variant="secondary">
                            {job.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {job.property?.property_name}
                        </p>
                        {job.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {format(parseISO(job.due_date), 'MMM d')}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* In Progress Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-purple-700 mr-2" />
                  <span className="font-medium text-purple-900">In Progress</span>
                </div>
                <Badge variant="secondary" className="bg-purple-200 text-purple-900">
                  {jobsByStatus.in_progress.length}
                </Badge>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {jobsByStatus.in_progress.map((job) => (
                    <Card
                      key={job.job_id}
                      className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleJobClick(job)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm line-clamp-2">{job.title}</h4>
                          <Badge className={getPriorityColor(job.priority || 'medium')} variant="secondary">
                            {job.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {job.property?.property_name}
                        </p>
                        {job.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {format(parseISO(job.due_date), 'MMM d')}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Review Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-blue-700 mr-2" />
                  <span className="font-medium text-blue-900">Review</span>
                </div>
                <Badge variant="secondary" className="bg-blue-200 text-blue-900">
                  {jobsByStatus.review.length}
                </Badge>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {jobsByStatus.review.map((job) => (
                    <Card
                      key={job.job_id}
                      className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleJobClick(job)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm line-clamp-2">{job.title}</h4>
                          <Badge className={getPriorityColor(job.priority || 'medium')} variant="secondary">
                            {job.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {job.property?.property_name}
                        </p>
                        {job.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {format(parseISO(job.due_date), 'MMM d')}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Completed Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-700 mr-2" />
                  <span className="font-medium text-green-900">Completed</span>
                </div>
                <Badge variant="secondary" className="bg-green-200 text-green-900">
                  {jobsByStatus.completed.length}
                </Badge>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {jobsByStatus.completed.map((job) => (
                    <Card
                      key={job.job_id}
                      className="p-3 hover:shadow-md transition-shadow bg-green-50/50 cursor-pointer"
                      onClick={() => handleJobClick(job)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm line-clamp-2">{job.title}</h4>
                          <Badge className={getPriorityColor(job.priority || 'medium')} variant="secondary">
                            {job.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {job.property?.property_name}
                        </p>
                        {job.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Completed: {format(parseISO(job.due_date), 'MMM d')}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Details Dialog */}
      {selectedJob && (
        <JobDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          job={selectedJob}
          onEdit={() => {}}
          onCreateTask={() => {}}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
