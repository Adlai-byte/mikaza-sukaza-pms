import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  User,
  Calendar,
  DollarSign,
  Timer,
  Clock,
  FileText,
  Edit,
  CheckSquare,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface JobDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  onEdit: (job: any) => void;
  onCreateTask: (job: any) => void;
  onStatusChange: (jobId: string, status: string) => void;
}

export function JobDetailsDialog({
  open,
  onOpenChange,
  job,
  onEdit,
  onCreateTask,
  onStatusChange,
}: JobDetailsDialogProps) {
  if (!job) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "No due date";
    try {
      return format(parseISO(dateString), "MMM dd, yyyy h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent Priority</Badge>;
      case "high":
        return <Badge className="bg-orange-500 text-white">High Priority</Badge>;
      case "normal":
        return <Badge className="bg-blue-500 text-white">Normal Priority</Badge>;
      case "low":
        return <Badge variant="secondary">Low Priority</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const canStartJob = job.status === 'pending';
  const canPauseJob = job.status === 'in_progress';
  const canReviewJob = job.status === 'in_progress';
  const canCompleteJob = job.status === 'review' || job.status === 'in_progress';
  const canCancelJob = job.status !== 'completed' && job.status !== 'cancelled';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <FileText className="h-6 w-6" />
            {job.title}
          </DialogTitle>
          <DialogDescription>
            Job ID: {job.job_id?.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-3 flex-wrap">
            {getStatusBadge(job.status)}
            {getPriorityBadge(job.priority)}
            {job.job_type && (
              <Badge variant="outline">
                {job.job_type.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Primary Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Property</p>
                  <p className="text-base font-semibold text-primary">
                    {job.property?.property_name || 'No property assigned'}
                  </p>
                  {job.location_notes && (
                    <p className="text-sm text-muted-foreground mt-1">{job.location_notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                  <p className="text-base">
                    {job.assigned_user
                      ? `${job.assigned_user.first_name} ${job.assigned_user.last_name}`
                      : 'Unassigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                  <p className="text-base">{formatDate(job.due_date)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {(job.estimated_cost || job.actual_cost) && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cost</p>
                    <p className="text-base">
                      {job.actual_cost ? (
                        <>
                          <span className="font-semibold">${job.actual_cost}</span>
                          {job.estimated_cost && (
                            <span className="text-sm text-muted-foreground ml-2">
                              (Est. ${job.estimated_cost})
                            </span>
                          )}
                        </>
                      ) : (
                        <span>Est. ${job.estimated_cost || 0}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {(job.estimated_hours || job.actual_hours) && (
                <div className="flex items-start gap-3">
                  <Timer className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hours</p>
                    <p className="text-base">
                      {job.actual_hours ? (
                        <>
                          <span className="font-semibold">{job.actual_hours}h</span>
                          {job.estimated_hours && (
                            <span className="text-sm text-muted-foreground ml-2">
                              (Est. {job.estimated_hours}h)
                            </span>
                          )}
                        </>
                      ) : (
                        <span>Est. {job.estimated_hours || 0}h</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-base">{formatDate(job.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          {job.description && (
            <>
              <div>
                <h4 className="text-sm font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Actions</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {/* Status Change Actions */}
              {canStartJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(job.job_id, 'in_progress')}
                  className="w-full"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Job
                </Button>
              )}

              {canPauseJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(job.job_id, 'pending')}
                  className="w-full"
                >
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Pause Job
                </Button>
              )}

              {canReviewJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(job.job_id, 'review')}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Send to Review
                </Button>
              )}

              {canCompleteJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(job.job_id, 'completed')}
                  className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Job
                </Button>
              )}

              {canCancelJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(job.job_id, 'cancelled')}
                  className="w-full text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Job
                </Button>
              )}

              {/* Other Actions */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(job);
                  onOpenChange(false);
                }}
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Job
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onCreateTask(job);
                  onOpenChange(false);
                }}
                className="w-full"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
