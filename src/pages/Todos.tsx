import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  List,
  LayoutGrid,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, TaskFilters } from '@/hooks/useTasks';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { TasksTable } from '@/components/tasks/TasksTable';
import { TasksKanban } from '@/components/tasks/TasksKanban';
import { Task, TaskInsert, TaskChecklistInsert } from '@/lib/schemas';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isPast, isToday, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function Todos() {
  const { user } = useAuth();
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [assignedFilter, setAssignedFilter] = useState<string>('');
  const [showOverdue, setShowOverdue] = useState(false);

  // Build filters object
  const filters: TaskFilters = useMemo(() => {
    const baseFilters: TaskFilters = {
      status: statusFilter.length > 0 ? statusFilter : undefined,
      priority: priorityFilter.length > 0 ? priorityFilter : undefined,
      category: categoryFilter.length > 0 ? categoryFilter : undefined,
      property_id: propertyFilter || undefined,
      search: searchQuery || undefined,
      overdue: showOverdue || undefined,
    };

    // If manual assignee filter is set, use it
    if (assignedFilter) {
      baseFilters.assigned_to = assignedFilter;
    } else {
      // For ops users, only show tasks assigned to them by default
      // For admin users, show all tasks
      if (user?.user_type === 'ops' && user?.user_id) {
        baseFilters.assigned_to = user.user_id;
      }
      // Admin users see all tasks (no filter)
    }

    return baseFilters;
  }, [statusFilter, priorityFilter, categoryFilter, propertyFilter, assignedFilter, searchQuery, showOverdue, user]);

  const { tasks, loading } = useTasks(filters);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { properties } = usePropertiesOptimized();

  // Fetch users for filter
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
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

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const overdue = tasks.filter(t =>
      t.due_date &&
      isPast(parseISO(t.due_date)) &&
      !isToday(parseISO(t.due_date)) &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
    ).length;
    const completedToday = tasks.filter(t =>
      t.status === 'completed' &&
      t.completed_at &&
      isToday(parseISO(t.completed_at))
    ).length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;

    return { total, overdue, completedToday, inProgress };
  }, [tasks]);

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskDialog(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskDialog(true);
  };

  const handleTaskSubmit = async (taskData: TaskInsert, checklists: TaskChecklistInsert[]) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({
          taskId: editingTask.task_id!,
          updates: taskData,
        });
      } else {
        const newTask = await createTask.mutateAsync(taskData);

        // Create checklist items if any
        if (checklists.length > 0 && newTask.task_id) {
          for (const item of checklists) {
            await supabase
              .from('task_checklists')
              .insert([{ ...item, task_id: newTask.task_id }]);
          }
        }
      }
      setShowTaskDialog(false);
      setEditingTask(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask.mutateAsync(taskId);
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    await updateTask.mutateAsync({
      taskId,
      updates: { status: status as any },
    });
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const togglePriorityFilter = (priority: string) => {
    setPriorityFilter(prev =>
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    );
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setPriorityFilter([]);
    setCategoryFilter([]);
    setPropertyFilter('');
    setAssignedFilter('');
    setSearchQuery('');
    setShowOverdue(false);
  };

  const hasActiveFilters = statusFilter.length > 0 ||
    priorityFilter.length > 0 ||
    categoryFilter.length > 0 ||
    propertyFilter ||
    assignedFilter ||
    searchQuery ||
    showOverdue;

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-3">
              <CheckSquare className="h-8 w-8 text-primary" />
              Task Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage tasks, track progress, and organize your workflow
            </p>
          </div>
          <Button onClick={handleCreateTask} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Tasks</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</h3>
                  <p className="text-xs text-blue-600 mt-1">All tasks</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <CheckSquare className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Overdue</p>
                  <h3 className="text-3xl font-bold text-red-900 mt-1">{stats.overdue}</h3>
                  <p className="text-xs text-red-600 mt-1">Requires attention</p>
                </div>
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Completed Today</p>
                  <h3 className="text-3xl font-bold text-green-900 mt-1">{stats.completedToday}</h3>
                  <p className="text-xs text-green-600 mt-1">Today's achievements</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">In Progress</p>
                  <h3 className="text-3xl font-bold text-purple-900 mt-1">{stats.inProgress}</h3>
                  <p className="text-xs text-purple-600 mt-1">Currently active</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm mb-6">
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
                <Label htmlFor="search">Search Tasks</Label>
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
                <Select value={propertyFilter || undefined} onValueChange={(value) => setPropertyFilter(value || '')}>
                  <SelectTrigger id="property">
                    <SelectValue placeholder="All properties" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(property => (
                      <SelectItem key={property.property_id} value={property.property_id!}>
                        {property.property_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Filter - Show for all users */}
              <div className="space-y-2">
                <Label htmlFor="assignee">Assigned To</Label>
                <Select value={assignedFilter || 'all'} onValueChange={(value) => setAssignedFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger id="assignee">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    {user?.user_id && (
                      <SelectItem value={user.user_id}>My Tasks</SelectItem>
                    )}
                    {users.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.first_name} {u.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryFilter[0] || undefined} onValueChange={(value) => setCategoryFilter(value ? [value] : [])}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="check_in_prep">Check-in Prep</SelectItem>
                    <SelectItem value="check_out_prep">Check-out Prep</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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

              {/* Overdue Toggle */}
              <Badge
                variant={showOverdue ? 'destructive' : 'outline'}
                className="cursor-pointer"
                onClick={() => setShowOverdue(!showOverdue)}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Overdue Only
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
                {tasks.length} result{tasks.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'kanban')} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Board View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            <TasksTable
              tasks={tasks}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              emptyMessage="No tasks found. Create your first task to get started."
              isDeleting={deleteTask.isPending}
            />
          </TabsContent>

          <TabsContent value="kanban" className="mt-0">
            <TasksKanban
              tasks={tasks}
              onEdit={handleEditTask}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>
        </Tabs>

        {/* Task Dialog */}
        <TaskDialog
          open={showTaskDialog}
          onOpenChange={setShowTaskDialog}
          onSubmit={handleTaskSubmit}
          isSubmitting={createTask.isPending || updateTask.isPending}
          task={editingTask}
        />
    </div>
  );
}
