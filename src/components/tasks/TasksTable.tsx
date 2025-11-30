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
  CheckSquare,
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Building,
  Calendar,
  AlertTriangle,
  Flag,
  Clock,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { Task } from '@/lib/schemas';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TasksTableProps {
  tasks: Task[];
  onView?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  emptyMessage?: string;
  isDeleting?: boolean;
}

export function TasksTable({
  tasks,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  emptyMessage = 'No tasks found',
  isDeleting = false,
}: TasksTableProps) {
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { label: 'Urgent', className: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle };
      case 'high':
        return { label: 'High', className: 'bg-orange-100 text-orange-800 border-orange-300', icon: Flag };
      case 'medium':
        return { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Flag };
      case 'low':
        return { label: 'Low', className: 'bg-gray-100 text-gray-800 border-gray-300', icon: Flag };
      default:
        return { label: priority, className: 'bg-gray-100 text-gray-800 border-gray-300', icon: Flag };
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
    if (!dateString) return '—';
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    try {
      const dueDate = parseISO(task.due_date);
      return isPast(dueDate) && !isToday(dueDate);
    } catch {
      return false;
    }
  };

  const isDueToday = (task: Task) => {
    if (!task.due_date) return false;
    try {
      const dueDate = parseISO(task.due_date);
      return isToday(dueDate);
    } catch {
      return false;
    }
  };

  const handleDeleteConfirm = () => {
    if (taskToDelete && onDelete) {
      onDelete(taskToDelete.task_id!);
      setTaskToDelete(null);
    }
  };

  const getUserInitials = (user: any) => {
    if (!user) return '?';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks Found</h3>
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
            <CheckSquare className="h-5 w-5" />
            Tasks List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const priorityConfig = getPriorityConfig(task.priority);
                  const statusConfig = getStatusConfig(task.status);
                  const overdue = isOverdue(task);
                  const dueToday = isDueToday(task);
                  const PriorityIcon = priorityConfig.icon;

                  return (
                    <TableRow key={task.task_id} className={overdue ? 'bg-red-50/50' : ''}>
                      <TableCell>
                        <div className={`w-1 h-10 rounded ${
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-gray-300'
                        }`} />
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <div className="font-medium flex items-center gap-2">
                            {task.title}
                            {overdue && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Overdue!</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {dueToday && !overdue && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                                Due Today
                              </Badge>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {task.property ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{task.property.property_name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {task.assigned_user ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={task.assigned_user.photo_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {getUserInitials(task.assigned_user)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">
                                    {task.assigned_user.first_name} {task.assigned_user.last_name}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{task.assigned_user.email}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(task.category)}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={statusConfig.className}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={priorityConfig.className}>
                          <PriorityIcon className="h-3 w-3 mr-1" />
                          {priorityConfig.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className={overdue ? 'text-red-600 font-medium' : ''}>
                            {formatDate(task.due_date)}
                          </span>
                          {task.due_time && (
                            <>
                              <Clock className="h-3 w-3 text-muted-foreground ml-1" />
                              <span>{task.due_time.substring(0, 5)}</span>
                            </>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {onView && (
                              <DropdownMenuItem onClick={() => onView(task)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            )}
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(task)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Task
                              </DropdownMenuItem>
                            )}
                            {onStatusChange && task.status !== 'completed' && (
                              <DropdownMenuItem onClick={() => onStatusChange(task.task_id!, 'completed')}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                            {onStatusChange && task.status === 'pending' && (
                              <DropdownMenuItem onClick={() => onStatusChange(task.task_id!, 'in_progress')}>
                                <Clock className="mr-2 h-4 w-4" />
                                Start Task
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setTaskToDelete(task)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Task
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Task?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the task "{taskToDelete?.title}"? This action cannot be undone and will also delete all associated checklist items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Task'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
