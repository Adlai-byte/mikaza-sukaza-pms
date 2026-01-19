import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building,
  Calendar,
  Clock,
  User,
  Edit,
  AlertTriangle,
  Flag,
  CheckCircle2,
  GripVertical,
} from 'lucide-react';
import { Task } from '@/lib/schemas';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

interface TasksKanbanProps {
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: string) => void;
}

type TaskStatus = 'pending' | 'in_progress' | 'completed';

export function TasksKanban({ tasks, onEdit, onStatusChange }: TasksKanbanProps) {
  const { t } = useTranslation();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.task_id || '');
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column, not entering a child element
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedTask && draggedTask.status !== status && onStatusChange && draggedTask.task_id) {
      onStatusChange(draggedTask.task_id, status);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-300';
      default: return 'bg-gray-300';
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

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd');
    } catch {
      return dateString;
    }
  };

  const getUserInitials = (user: any) => {
    if (!user) return '?';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const overdue = isOverdue(task);
    const dueToday = isDueToday(task);
    const isDragging = draggedTask?.task_id === task.task_id;

    return (
      <Card
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        className={`mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 ${
          overdue ? 'border-l-4 border-l-red-500' : ''
        } ${isDragging ? 'opacity-50 scale-95 ring-2 ring-primary' : 'opacity-100'}`}
      >
        <CardContent className="p-4">
          {/* Drag handle indicator */}
          <div className="flex items-center justify-between mb-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            <div className={`flex-1 h-1 rounded ml-2 ${getPriorityColor(task.priority)}`} />
          </div>

          {/* Title */}
          <h4 className="font-medium mb-2 flex items-center justify-between">
            <span className="line-clamp-2">{task.title}</span>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onEdit(task)}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </h4>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {task.description}
            </p>
          )}

          {/* Property */}
          {task.property && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Building className="h-3 w-3" />
              <span className="line-clamp-1">{task.property.property_name}</span>
            </div>
          )}

          {/* Due date */}
          {task.due_date && (
            <div className={`flex items-center gap-2 text-xs mb-2 ${
              overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
            }`}>
              <Calendar className="h-3 w-3" />
              <span>{formatDate(task.due_date)}</span>
              {task.due_time && (
                <>
                  <Clock className="h-3 w-3 ml-1" />
                  <span>{task.due_time.substring(0, 5)}</span>
                </>
              )}
              {overdue && (
                <AlertTriangle className="h-3 w-3 text-red-600 ml-1" />
              )}
              {dueToday && !overdue && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-orange-50 text-orange-700">
                  Today
                </Badge>
              )}
            </div>
          )}

          {/* Category */}
          <Badge variant="outline" className="text-[10px] mb-3">
            {task.category.replace('_', ' ')}
          </Badge>

          {/* Assigned user */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            {task.assigned_user ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={task.assigned_user.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getUserInitials(task.assigned_user)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">
                        {task.assigned_user.first_name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{task.assigned_user.first_name} {task.assigned_user.last_name}</p>
                    <p className="text-xs text-muted-foreground">{task.assigned_user.email}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-xs text-muted-foreground">{t('common.unassigned', 'Unassigned')}</span>
            )}

            {/* Quick actions */}
            <div className="flex gap-1">
              {onStatusChange && task.status === 'pending' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onStatusChange(task.task_id!, 'in_progress')}
                      >
                        <Clock className="h-3 w-3 text-blue-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('common.startTask', 'Start Task')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {onStatusChange && task.status !== 'completed' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onStatusChange(task.task_id!, 'completed')}
                      >
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('common.markComplete', 'Mark Complete')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const Column = ({
    title,
    tasks,
    count,
    color,
    status
  }: {
    title: string;
    tasks: Task[];
    count: number;
    color: string;
    status: TaskStatus;
  }) => {
    const isDropTarget = dragOverColumn === status;
    const canDrop = draggedTask && draggedTask.status !== status;

    return (
      <div
        className="flex-1 min-w-[300px]"
        onDragOver={(e) => handleDragOver(e, status)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, status)}
      >
        <Card className={`h-full transition-all duration-200 ${color} ${
          isDropTarget && canDrop
            ? 'ring-2 ring-primary ring-offset-2 shadow-lg scale-[1.02]'
            : ''
        } ${isDropTarget && !canDrop ? 'opacity-50' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span>{title}</span>
              <Badge variant="secondary" className="ml-2">
                {count}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
            {tasks.length === 0 ? (
              <div className={`text-center text-muted-foreground text-sm py-8 border-2 border-dashed rounded-lg ${
                isDropTarget && canDrop ? 'border-primary bg-primary/5' : 'border-transparent'
              }`}>
                {isDropTarget && canDrop ? t('todos.dropHere', 'Drop here') : t('todos.noTasks', 'No tasks')}
              </div>
            ) : (
              <>
                {tasks.map(task => <TaskCard key={task.task_id} task={task} />)}
                {isDropTarget && canDrop && (
                  <div className="text-center text-primary text-sm py-4 border-2 border-dashed border-primary rounded-lg bg-primary/5">
                    {t('todos.dropHere', 'Drop here')}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Column
        title={t('todos.pending', 'Pending')}
        tasks={pendingTasks}
        count={pendingTasks.length}
        color="bg-yellow-50/50"
        status="pending"
      />
      <Column
        title={t('common.inProgress', 'In Progress')}
        tasks={inProgressTasks}
        count={inProgressTasks.length}
        color="bg-blue-50/50"
        status="in_progress"
      />
      <Column
        title={t('todos.completed', 'Completed')}
        tasks={completedTasks}
        count={completedTasks.length}
        color="bg-green-50/50"
        status="completed"
      />
    </div>
  );
}
