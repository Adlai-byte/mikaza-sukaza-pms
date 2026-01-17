import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Task, TaskInsert, BookingJobConfig, CustomBookingTask } from '@/lib/schemas';
import { taskKeys } from './useTasks';
import { format, subDays, parseISO } from 'date-fns';

// Query keys for booking tasks
export const bookingTaskKeys = {
  all: ['booking-tasks'] as const,
  booking: (bookingId: string) => [...bookingTaskKeys.all, bookingId] as const,
};

// Map job type to task category
const jobTypeToCategory: Record<BookingJobConfig['type'], Task['category']> = {
  cleaning: 'cleaning',
  check_in_prep: 'check_in_prep',
  check_out_prep: 'check_out_prep',
  inspection: 'inspection',
  maintenance: 'maintenance',
};

// Map job type to task title
const jobTypeToTitle: Record<BookingJobConfig['type'], string> = {
  cleaning: 'Cleaning',
  check_in_prep: 'Check-in Preparation',
  check_out_prep: 'Check-out Preparation',
  inspection: 'Property Inspection',
  maintenance: 'Maintenance',
};

/**
 * Calculate the due date for a job based on its type and booking dates
 */
export function calculateJobDueDate(
  jobType: BookingJobConfig['type'],
  checkInDate: string,
  checkOutDate: string
): string {
  // Parse dates
  const checkIn = parseISO(checkInDate);
  const checkOut = parseISO(checkOutDate);

  switch (jobType) {
    case 'cleaning':
    case 'check_out_prep':
    case 'inspection':
      // Due on check-out date
      return format(checkOut, 'yyyy-MM-dd');
    case 'check_in_prep':
      // Due day before check-in
      return format(subDays(checkIn, 1), 'yyyy-MM-dd');
    case 'maintenance':
      // Default to check-out date
      return format(checkOut, 'yyyy-MM-dd');
    default:
      return checkOutDate;
  }
}

/**
 * Create tasks from booking job configurations and custom tasks
 */
export async function createTasksFromBooking(
  bookingId: string,
  propertyId: string,
  checkInDate: string,
  checkOutDate: string,
  jobConfigs: BookingJobConfig[],
  createdBy: string,
  guestName?: string,
  customTasks?: CustomBookingTask[]
): Promise<Task[]> {
  console.log('🔍 createTasksFromBooking called with:');
  console.log('  - jobConfigs:', jobConfigs);
  console.log('  - customTasks:', customTasks);

  // Filter only enabled jobs
  const enabledJobs = jobConfigs.filter(job => job.enabled);
  const validCustomTasks = customTasks?.filter(task => task.title.trim() !== '') || [];

  console.log('  - enabledJobs:', enabledJobs.length);
  console.log('  - validCustomTasks:', validCustomTasks.length, validCustomTasks);

  if (enabledJobs.length === 0 && validCustomTasks.length === 0) {
    return [];
  }

  // Prepare task inserts from job configs
  const jobTaskInserts: TaskInsert[] = enabledJobs.map(job => ({
    title: `${jobTypeToTitle[job.type]}${guestName ? ` - ${guestName}` : ''}`,
    description: job.notes || `Auto-generated task for booking. Check-in: ${checkInDate}, Check-out: ${checkOutDate}`,
    property_id: propertyId,
    booking_id: bookingId,
    assigned_to: job.assignedTo,
    created_by: createdBy,
    status: 'pending' as const,
    priority: job.priority,
    category: jobTypeToCategory[job.type],
    due_date: job.dueDate || calculateJobDueDate(job.type, checkInDate, checkOutDate),
  }));

  // Prepare task inserts from custom tasks
  const customTaskInserts: TaskInsert[] = validCustomTasks.map(task => ({
    title: `${task.title}${guestName ? ` - ${guestName}` : ''}`,
    description: task.description || `Custom task for booking. Check-in: ${checkInDate}, Check-out: ${checkOutDate}`,
    property_id: propertyId,
    booking_id: bookingId,
    assigned_to: task.assignedTo,
    created_by: createdBy,
    status: 'pending' as const,
    priority: task.priority,
    category: task.category,
    due_date: task.dueDate || checkOutDate,
  }));

  // Combine all task inserts
  const taskInserts: TaskInsert[] = [...jobTaskInserts, ...customTaskInserts];

  // Bulk insert tasks
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskInserts)
    .select(`
      *,
      property:properties(property_id, property_name, property_type),
      assigned_user:users!tasks_assigned_to_fkey(user_id, first_name, last_name, email, photo_url),
      created_user:users!tasks_created_by_fkey(user_id, first_name, last_name, email, photo_url)
    `);

  if (error) {
    console.error('Failed to create booking tasks:', error);
    throw error;
  }

  // Create notifications for assigned users
  const assignedTasks = (data || []).filter(task => task.assigned_to);
  console.log('📬 Tasks with assignments:', assignedTasks.length, assignedTasks.map(t => ({ title: t.title, assigned_to: t.assigned_to })));

  if (assignedTasks.length > 0) {
    const notifications = assignedTasks.map(task => ({
      user_id: task.assigned_to!,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${task.title}`,
      type: 'task_assigned',
      task_id: task.task_id,
      is_read: false,
    }));

    console.log('📬 Creating notifications:', notifications);
    const { error: notificationError } = await supabase.from('notifications').insert(notifications);

    if (notificationError) {
      console.error('❌ Failed to create notifications:', notificationError);
    } else {
      console.log('✅ Notifications created successfully');
    }
  }

  return data || [];
}

/**
 * Hook to fetch tasks for a specific booking
 */
export function useBookingTasks(bookingId: string | null) {
  return useQuery({
    queryKey: bookingTaskKeys.booking(bookingId || ''),
    staleTime: 0, // Always refetch when invalidated - operational data
    queryFn: async () => {
      if (!bookingId) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          property:properties(property_id, property_name, property_type),
          assigned_user:users!tasks_assigned_to_fkey(user_id, first_name, last_name, email, photo_url),
          created_user:users!tasks_created_by_fkey(user_id, first_name, last_name, email, photo_url)
        `)
        .eq('booking_id', bookingId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!bookingId,
  });
}

/**
 * Hook to create tasks for a booking
 */
export function useCreateBookingTasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      bookingId,
      propertyId,
      checkInDate,
      checkOutDate,
      jobConfigs,
      createdBy,
      guestName,
    }: {
      bookingId: string;
      propertyId: string;
      checkInDate: string;
      checkOutDate: string;
      jobConfigs: BookingJobConfig[];
      createdBy: string;
      guestName?: string;
    }) => {
      return createTasksFromBooking(
        bookingId,
        propertyId,
        checkInDate,
        checkOutDate,
        jobConfigs,
        createdBy,
        guestName
      );
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingTaskKeys.booking(variables.bookingId) });

      if (data.length > 0) {
        toast({
          title: 'Tasks Created',
          description: `${data.length} task(s) created for this booking.`,
        });
      }
    },
    onError: (error) => {
      console.error('Failed to create booking tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to create tasks for booking.',
        variant: 'destructive',
      });
    },
  });
}

export default useBookingTasks;
