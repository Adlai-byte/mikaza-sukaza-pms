import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Brush,
  DoorOpen,
  DoorClosed,
  ClipboardCheck,
  Wrench,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ListTodo,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookingJobConfig, CustomBookingTask, Task } from '@/lib/schemas';
import { calculateJobDueDate } from '@/hooks/useBookingTasks';
import { useUsersOptimized } from '@/hooks/useUsersOptimized';
import { format, parseISO } from 'date-fns';

interface BookingJobsSectionProps {
  jobConfigs: BookingJobConfig[];
  onJobConfigsChange: (configs: BookingJobConfig[]) => void;
  autoGenerate: boolean;
  onAutoGenerateChange: (value: boolean) => void;
  checkInDate: string;
  checkOutDate: string;
  disabled?: boolean;
  // Custom tasks props
  customTasks: CustomBookingTask[];
  onCustomTasksChange: (tasks: CustomBookingTask[]) => void;
  // Existing tasks (for viewing when editing a booking)
  existingTasks?: Task[];
  isLoadingTasks?: boolean;
}

// Job type icons mapping
const jobTypeIcons: Record<BookingJobConfig['type'], React.ElementType> = {
  cleaning: Brush,
  check_in_prep: DoorOpen,
  check_out_prep: DoorClosed,
  inspection: ClipboardCheck,
  maintenance: Wrench,
};

// Job type labels
const jobTypeLabels: Record<BookingJobConfig['type'], string> = {
  cleaning: 'bookings.jobs.types.cleaning',
  check_in_prep: 'bookings.jobs.types.checkInPrep',
  check_out_prep: 'bookings.jobs.types.checkOutPrep',
  inspection: 'bookings.jobs.types.inspection',
  maintenance: 'bookings.jobs.types.maintenance',
};

// Task category options
const taskCategories: { value: CustomBookingTask['category']; label: string }[] = [
  { value: 'cleaning', label: 'bookings.jobs.types.cleaning' },
  { value: 'maintenance', label: 'bookings.jobs.types.maintenance' },
  { value: 'check_in_prep', label: 'bookings.jobs.types.checkInPrep' },
  { value: 'check_out_prep', label: 'bookings.jobs.types.checkOutPrep' },
  { value: 'inspection', label: 'bookings.jobs.types.inspection' },
  { value: 'repair', label: 'bookings.customTasks.categories.repair' },
  { value: 'other', label: 'bookings.customTasks.categories.other' },
];

export function BookingJobsSection({
  jobConfigs,
  onJobConfigsChange,
  autoGenerate,
  onAutoGenerateChange,
  checkInDate,
  checkOutDate,
  disabled = false,
  customTasks,
  onCustomTasksChange,
  existingTasks = [],
  isLoadingTasks = false,
}: BookingJobsSectionProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(true);
  const [isCustomTasksOpen, setIsCustomTasksOpen] = React.useState(true);
  const [isExistingTasksOpen, setIsExistingTasksOpen] = React.useState(true);

  // Fetch users who can be assigned tasks (admin, ops, provider)
  const { users = [], loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsersOptimized();
  const assignableUsers = users.filter(
    (u) => ['admin', 'ops', 'provider'].includes(u.user_type || '') && u.is_active !== false
  );

  // Debug logging for production issues
  React.useEffect(() => {
    console.log('📋 BookingJobsSection - Users state:', {
      usersLoading,
      usersError: usersError?.message || null,
      totalUsers: users.length,
      assignableUsers: assignableUsers.length,
      userTypes: users.map(u => u.user_type),
      userDetails: users.slice(0, 3).map(u => ({ id: u.user_id, name: `${u.first_name} ${u.last_name}`, type: u.user_type, active: u.is_active })),
    });

    // If there's an error or no users after loading, try to refetch
    if (!usersLoading && users.length === 0 && !usersError) {
      console.log('📋 BookingJobsSection - No users found, attempting refetch...');
      refetchUsers();
    }
  }, [users, usersLoading, usersError, assignableUsers.length, refetchUsers]);

  // Update due dates when check-in/out dates change
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const updatedConfigs = jobConfigs.map((job) => ({
        ...job,
        dueDate: calculateJobDueDate(job.type, checkInDate, checkOutDate),
      }));
      onJobConfigsChange(updatedConfigs);
    }
  }, [checkInDate, checkOutDate]);

  const handleJobToggle = (type: BookingJobConfig['type'], enabled: boolean) => {
    const updatedConfigs = jobConfigs.map((job) =>
      job.type === type ? { ...job, enabled } : job
    );
    onJobConfigsChange(updatedConfigs);
  };

  const handleAssigneeChange = (type: BookingJobConfig['type'], assignedTo: string | null) => {
    const updatedConfigs = jobConfigs.map((job) =>
      job.type === type ? { ...job, assignedTo: assignedTo === 'unassigned' ? null : assignedTo } : job
    );
    onJobConfigsChange(updatedConfigs);
  };

  const handlePriorityChange = (type: BookingJobConfig['type'], priority: BookingJobConfig['priority']) => {
    const updatedConfigs = jobConfigs.map((job) =>
      job.type === type ? { ...job, priority } : job
    );
    onJobConfigsChange(updatedConfigs);
  };

  // Custom task handlers
  const handleAddCustomTask = () => {
    const newTask: CustomBookingTask = {
      id: `custom-${Date.now()}`,
      title: '',
      description: '',
      assignedTo: null,
      dueDate: checkOutDate || '',
      priority: 'medium',
      category: 'other',
    };
    onCustomTasksChange([...customTasks, newTask]);
  };

  const handleRemoveCustomTask = (id: string) => {
    onCustomTasksChange(customTasks.filter((task) => task.id !== id));
  };

  const handleUpdateCustomTask = (id: string, updates: Partial<CustomBookingTask>) => {
    onCustomTasksChange(
      customTasks.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  };

  const enabledCount = jobConfigs.filter((j) => j.enabled).length;

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <>
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full flex items-center justify-between p-4 h-auto"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span className="font-medium">{t('bookings.jobs.title', 'Auto-Generate Jobs')}</span>
            {enabledCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {enabledCount} {t('common.enabled', 'enabled')}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4">
        <div className="space-y-4">
          {/* Auto-generate toggle */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Checkbox
              id="autoGenerateJobs"
              checked={autoGenerate}
              onCheckedChange={(checked) => onAutoGenerateChange(checked === true)}
              disabled={disabled}
            />
            <Label htmlFor="autoGenerateJobs" className="text-sm cursor-pointer">
              {t('bookings.jobs.autoGenerate', 'Automatically create jobs for this booking')}
            </Label>
          </div>

          {autoGenerate && (
            <>
              {/* Schedule note */}
              {checkInDate && checkOutDate && (
                <p className="text-xs text-muted-foreground">
                  {t('bookings.jobs.scheduleNote', 'Jobs scheduled based on booking dates')}
                </p>
              )}

              {/* Job list */}
              <div className="space-y-3">
                {jobConfigs.map((job) => {
                  const Icon = jobTypeIcons[job.type];
                  return (
                    <div
                      key={job.type}
                      className={`p-3 rounded-lg border ${
                        job.enabled ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Enable checkbox */}
                        <Checkbox
                          id={`job-${job.type}`}
                          checked={job.enabled}
                          onCheckedChange={(checked) =>
                            handleJobToggle(job.type, checked === true)
                          }
                          disabled={disabled}
                          className="mt-1"
                        />

                        {/* Job info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${job.enabled ? 'text-amber-600' : 'text-gray-400'}`} />
                            <Label
                              htmlFor={`job-${job.type}`}
                              className={`font-medium cursor-pointer ${
                                job.enabled ? 'text-amber-900' : 'text-gray-500'
                              }`}
                            >
                              {t(jobTypeLabels[job.type], job.type.replace('_', ' '))}
                            </Label>
                          </div>

                          {job.enabled && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {/* Due Date (read-only) */}
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  {t('bookings.jobs.dueDate', 'Due Date')}
                                </Label>
                                <p className="text-sm font-medium">
                                  {formatDueDate(job.dueDate)}
                                </p>
                              </div>

                              {/* Assignee */}
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  {t('bookings.jobs.assignTo', 'Assign to')}
                                </Label>
                                <Select
                                  value={job.assignedTo || 'unassigned'}
                                  onValueChange={(value) =>
                                    handleAssigneeChange(job.type, value)
                                  }
                                  disabled={disabled}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue
                                      placeholder={t('bookings.jobs.unassigned', 'Unassigned')}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">
                                      {t('bookings.jobs.unassigned', 'Unassigned')}
                                    </SelectItem>
                                    {usersLoading ? (
                                      <SelectItem value="loading" disabled>
                                        {t('common.loading', 'Loading users...')}
                                      </SelectItem>
                                    ) : usersError ? (
                                      <SelectItem value="error" disabled>
                                        {t('bookings.jobs.errorLoadingUsers', 'Error loading users')}
                                      </SelectItem>
                                    ) : assignableUsers.length === 0 ? (
                                      <SelectItem value="no-users" disabled>
                                        {t('bookings.jobs.noAssignableUsers', 'No assignable users')}
                                      </SelectItem>
                                    ) : (
                                      assignableUsers.map((user) => (
                                        <SelectItem key={user.user_id} value={user.user_id}>
                                          {user.first_name} {user.last_name} ({user.user_type})
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Priority */}
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  {t('bookings.jobs.priority', 'Priority')}
                                </Label>
                                <Select
                                  value={job.priority}
                                  onValueChange={(value) =>
                                    handlePriorityChange(
                                      job.type,
                                      value as BookingJobConfig['priority']
                                    )
                                  }
                                  disabled={disabled}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">{t('common.low', 'Low')}</SelectItem>
                                    <SelectItem value="medium">{t('common.medium', 'Medium')}</SelectItem>
                                    <SelectItem value="high">{t('common.high', 'High')}</SelectItem>
                                    <SelectItem value="urgent">{t('common.urgent', 'Urgent')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>

    {/* Custom Tasks Section - Always visible, independent of auto-generate toggle */}
    <Collapsible open={isCustomTasksOpen} onOpenChange={setIsCustomTasksOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full flex items-center justify-between p-4 h-auto"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-blue-500" />
            <span className="font-medium">{t('bookings.customTasks.title', 'Custom Tasks')}</span>
            {customTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {customTasks.length} {t('common.tasks', 'tasks')}
              </Badge>
            )}
          </div>
          {isCustomTasksOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {t('bookings.customTasks.description', 'Add specific tasks that will be created with this booking')}
          </p>

          {/* Add custom task button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustomTask}
            disabled={disabled}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('bookings.customTasks.addTask', 'Add Custom Task')}
          </Button>

          {/* Custom tasks list */}
          {customTasks.length > 0 && (
            <div className="space-y-3">
              {customTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border bg-blue-50 border-blue-200"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-3">
                      {/* Row 1: Title and Due Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {t('bookings.customTasks.taskTitle', 'Task Title')} *
                          </Label>
                          <Input
                            type="text"
                            placeholder={t('bookings.customTasks.titlePlaceholder', 'Enter task title...')}
                            value={task.title}
                            onChange={(e) =>
                              handleUpdateCustomTask(task.id, { title: e.target.value })
                            }
                            disabled={disabled}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {t('bookings.jobs.dueDate', 'Due Date')}
                          </Label>
                          <Input
                            type="date"
                            value={task.dueDate}
                            onChange={(e) =>
                              handleUpdateCustomTask(task.id, { dueDate: e.target.value })
                            }
                            disabled={disabled}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Row 2: Category, Assignee, Priority */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {t('bookings.customTasks.category', 'Category')}
                          </Label>
                          <Select
                            value={task.category}
                            onValueChange={(value) =>
                              handleUpdateCustomTask(task.id, {
                                category: value as CustomBookingTask['category'],
                              })
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {taskCategories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {t(cat.label, cat.value)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {t('bookings.jobs.assignTo', 'Assign to')}
                          </Label>
                          <Select
                            value={task.assignedTo || 'unassigned'}
                            onValueChange={(value) =>
                              handleUpdateCustomTask(task.id, {
                                assignedTo: value === 'unassigned' ? null : value,
                              })
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue
                                placeholder={t('bookings.jobs.unassigned', 'Unassigned')}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                {t('bookings.jobs.unassigned', 'Unassigned')}
                              </SelectItem>
                              {usersLoading ? (
                                <SelectItem value="loading" disabled>
                                  {t('common.loading', 'Loading users...')}
                                </SelectItem>
                              ) : usersError ? (
                                <SelectItem value="error" disabled>
                                  {t('bookings.jobs.errorLoadingUsers', 'Error loading users')}
                                </SelectItem>
                              ) : assignableUsers.length === 0 ? (
                                <SelectItem value="no-users" disabled>
                                  {t('bookings.jobs.noAssignableUsers', 'No assignable users')}
                                </SelectItem>
                              ) : (
                                assignableUsers.map((user) => (
                                  <SelectItem key={user.user_id} value={user.user_id}>
                                    {user.first_name} {user.last_name} ({user.user_type})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {t('bookings.jobs.priority', 'Priority')}
                          </Label>
                          <Select
                            value={task.priority}
                            onValueChange={(value) =>
                              handleUpdateCustomTask(task.id, {
                                priority: value as CustomBookingTask['priority'],
                              })
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">{t('common.low', 'Low')}</SelectItem>
                              <SelectItem value="medium">{t('common.medium', 'Medium')}</SelectItem>
                              <SelectItem value="high">{t('common.high', 'High')}</SelectItem>
                              <SelectItem value="urgent">{t('common.urgent', 'Urgent')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 3: Description (optional) */}
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t('bookings.customTasks.description', 'Description')} ({t('common.optional', 'optional')})
                        </Label>
                        <Textarea
                          placeholder={t('bookings.customTasks.descriptionPlaceholder', 'Add task details...')}
                          value={task.description || ''}
                          onChange={(e) =>
                            handleUpdateCustomTask(task.id, { description: e.target.value })
                          }
                          disabled={disabled}
                          className="text-sm resize-none"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Remove button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCustomTask(task.id)}
                      disabled={disabled}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>

    {/* Existing Tasks Section (read-only, shows tasks already linked to booking) */}
    {existingTasks.length > 0 && (
      <Collapsible open={isExistingTasksOpen} onOpenChange={setIsExistingTasksOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between bg-green-50 border-green-200 hover:bg-green-100"
            type="button"
          >
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">
                {t('bookings.existingTasks.title', 'Created Tasks')}
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {existingTasks.length}
              </Badge>
            </div>
            {isExistingTasksOpen ? (
              <ChevronUp className="h-4 w-4 text-green-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-green-600" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-2 border rounded-lg p-4 bg-green-50/50">
            <p className="text-xs text-green-700 mb-3">
              {t('bookings.existingTasks.description', 'These tasks have already been created for this booking and can be viewed in the Tasks page.')}
            </p>
            {isLoadingTasks ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('common.loading', 'Loading...')}
              </p>
            ) : (
              <div className="space-y-2">
                {existingTasks.map((task) => (
                  <div
                    key={task.task_id}
                    className="p-3 rounded-lg border bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            task.priority === 'urgent' ? 'bg-red-500' :
                            task.priority === 'high' ? 'bg-orange-500' :
                            task.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-400'
                          }`} />
                          <span className="font-medium text-sm truncate">
                            {task.title}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {task.due_date && (
                            <span>📅 {format(parseISO(task.due_date), 'MMM dd, yyyy')}</span>
                          )}
                          {task.assigned_user && (
                            <span>👤 {task.assigned_user.first_name} {task.assigned_user.last_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end flex-shrink-0">
                        <Badge
                          variant={task.status === 'completed' ? 'default' : task.status === 'in_progress' ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {t(`todos.status.${task.status}`, task.status)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            task.priority === 'urgent' ? 'border-red-300 text-red-700' :
                            task.priority === 'high' ? 'border-orange-300 text-orange-700' :
                            task.priority === 'medium' ? 'border-blue-300 text-blue-700' : 'border-gray-300'
                          }`}
                        >
                          {t(`todos.priority.${task.priority}`, task.priority)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )}
    </>
  );
}

export default BookingJobsSection;
