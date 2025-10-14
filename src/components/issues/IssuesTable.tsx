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
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash2,
  Building,
  User,
  Image as ImageIcon,
  DollarSign,
  MapPin,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Issue } from '@/lib/schemas';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface IssuesTableProps {
  issues: Issue[];
  onEdit?: (issue: Issue) => void;
  onDelete?: (issueId: string) => void;
  onStatusChange?: (issueId: string, status: string) => void;
  onViewPhotos?: (issue: Issue) => void;
  emptyMessage?: string;
  isDeleting?: boolean;
}

export function IssuesTable({
  issues,
  onEdit,
  onDelete,
  onStatusChange,
  onViewPhotos,
  emptyMessage = 'No issues found',
  isDeleting = false,
}: IssuesTableProps) {
  const [issueToDelete, setIssueToDelete] = useState<Issue | null>(null);

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
      case 'open':
        return { label: 'Open', className: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'in_progress':
        return { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 'resolved':
        return { label: 'Resolved', className: 'bg-green-100 text-green-800 border-green-300' };
      case 'closed':
        return { label: 'Closed', className: 'bg-gray-100 text-gray-800 border-gray-300' };
      case 'on_hold':
        return { label: 'On Hold', className: 'bg-purple-100 text-purple-800 border-purple-300' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'maintenance': return 'Maintenance';
      case 'damage': return 'Damage';
      case 'repair_needed': return 'Repair Needed';
      case 'cleaning': return 'Cleaning';
      case 'plumbing': return 'Plumbing';
      case 'electrical': return 'Electrical';
      case 'appliance': return 'Appliance';
      case 'hvac': return 'HVAC';
      case 'other': return 'Other';
      default: return category;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleDeleteConfirm = () => {
    if (issueToDelete && onDelete) {
      onDelete(issueToDelete.issue_id!);
      setIssueToDelete(null);
    }
  };

  const getUserInitials = (user: any) => {
    if (!user) return '?';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Issues Found</h3>
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
            <AlertTriangle className="h-5 w-5" />
            Issues List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => {
                  const priorityConfig = getPriorityConfig(issue.priority);
                  const statusConfig = getStatusConfig(issue.status);
                  const photoCount = issue.photos?.length || 0;

                  return (
                    <TableRow key={issue.issue_id}>
                      <TableCell>
                        <div className={`w-1 h-10 rounded ${
                          issue.priority === 'urgent' ? 'bg-red-500' :
                          issue.priority === 'high' ? 'bg-orange-500' :
                          issue.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-gray-300'
                        }`} />
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <div className="font-medium">{issue.title}</div>
                          {issue.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {issue.description}
                            </p>
                          )}
                          {issue.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              {issue.location}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {issue.property ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{issue.property.property_name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(issue.category)}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={statusConfig.className}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={priorityConfig.className}>
                          {priorityConfig.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {issue.assigned_user ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {getUserInitials(issue.assigned_user)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">
                                    {issue.assigned_user.first_name}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{issue.assigned_user.first_name} {issue.assigned_user.last_name}</p>
                                <p className="text-xs text-muted-foreground">{issue.assigned_user.email}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {issue.estimated_cost !== null && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              <span>Est: ${issue.estimated_cost.toFixed(2)}</span>
                            </div>
                          )}
                          {issue.actual_cost !== null && (
                            <div className="flex items-center gap-1 text-green-600 font-medium">
                              <DollarSign className="h-3 w-3" />
                              <span>Act: ${issue.actual_cost.toFixed(2)}</span>
                            </div>
                          )}
                          {issue.estimated_cost === null && issue.actual_cost === null && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {photoCount > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewPhotos?.(issue)}
                            className="h-7"
                          >
                            <ImageIcon className="h-4 w-4 mr-1" />
                            {photoCount}
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">0</span>
                        )}
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
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(issue)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Issue
                              </DropdownMenuItem>
                            )}
                            {onStatusChange && issue.status !== 'resolved' && (
                              <DropdownMenuItem onClick={() => onStatusChange(issue.issue_id!, 'resolved')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Resolved
                              </DropdownMenuItem>
                            )}
                            {onStatusChange && issue.status === 'open' && (
                              <DropdownMenuItem onClick={() => onStatusChange(issue.issue_id!, 'in_progress')}>
                                <Clock className="mr-2 h-4 w-4" />
                                Start Working
                              </DropdownMenuItem>
                            )}
                            {photoCount > 0 && onViewPhotos && (
                              <DropdownMenuItem onClick={() => onViewPhotos(issue)}>
                                <ImageIcon className="mr-2 h-4 w-4" />
                                View Photos ({photoCount})
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setIssueToDelete(issue)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Issue
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
      <AlertDialog open={!!issueToDelete} onOpenChange={() => setIssueToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Issue?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the issue "{issueToDelete?.title}"? This action cannot be undone and will also delete all associated photos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Issue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
