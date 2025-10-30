import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckSquare,
  User,
  Building,
  Calendar,
  Flag,
  Clock,
  FileText,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { Task } from '@/lib/schemas';
import { format, parseISO } from 'date-fns';

interface TaskViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

export function TaskViewDialog({ open, onOpenChange, task }: TaskViewDialogProps) {
  if (!task) return null;

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { label: 'Urgent', className: 'bg-red-100 text-red-800 border-red-300' };
      case 'high':
        return { label: 'High', className: 'bg-orange-100 text-orange-800 border-orange-300' };
      case 'medium':
        return { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 'low':
        return { label: 'Low', className: 'bg-gray-100 text-gray-800 border-gray-300' };
      default:
        return { label: priority, className: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 'in_progress':
        return { label: 'In Progress', className: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'completed':
        return { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-300' };
      case 'cancelled':
        return { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 border-gray-300' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'cleaning': return 'Cleaning';
      case 'maintenance': return 'Maintenance';
      case 'check_in_prep': return 'Check-in Prep';
      case 'check_out_prep': return 'Check-out Prep';
      case 'inspection': return 'Inspection';
      case 'repair': return 'Repair';
      case 'other': return 'Other';
      default: return category;
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return format(parseISO(dateString), 'MMMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return format(parseISO(dateString), 'MMMM dd, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const priorityConfig = getPriorityConfig(task.priority || 'medium');
  const statusConfig = getStatusConfig(task.status || 'pending');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CheckSquare className="h-6 w-6 text-primary" />
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status and Priority Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={statusConfig.className} variant="outline">
              {statusConfig.label}
            </Badge>
            <Badge className={priorityConfig.className} variant="outline">
              <Flag className="h-3 w-3 mr-1" />
              {priorityConfig.label}
            </Badge>
            {task.category && (
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                <Tag className="h-3 w-3 mr-1" />
                {getCategoryLabel(task.category)}
              </Badge>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Task Details Grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Task Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Assigned To */}
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <p className="text-sm font-medium">
                      {task.assigned_user
                        ? `${task.assigned_user.first_name} ${task.assigned_user.last_name}`
                        : 'Unassigned'}
                    </p>
                  </div>
                </div>

                {/* Property */}
                {task.property && (
                  <div className="flex items-start gap-3">
                    <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Property</p>
                      <p className="text-sm font-medium truncate">
                        {task.property.property_name || task.property.property_type}
                      </p>
                    </div>
                  </div>
                )}

                {/* Due Date */}
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className="text-sm font-medium">{formatDate(task.due_date)}</p>
                  </div>
                </div>

                {/* Created */}
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">{formatDateTime(task.created_at)}</p>
                  </div>
                </div>

                {/* Created By */}
                {task.created_user && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Created By</p>
                      <p className="text-sm font-medium">
                        {task.created_user.first_name} {task.created_user.last_name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Completed At */}
                {task.completed_at && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-sm font-medium">{formatDateTime(task.completed_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
