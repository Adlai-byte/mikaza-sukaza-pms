import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

// Query key factory
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  recentActivities: () => [...dashboardKeys.all, 'recentActivities'] as const,
};

interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  totalBookings: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  activeTasks: number;
  pendingTasks: number;
  completedTasks: number;
  openIssues: number;
  urgentIssues: number;
  totalUsers: number;
  activeUsers: number;
  occupancyRate: number;
  monthlyRevenue: number;
  upcomingBookings: number;
  overdueTasksCount: number;
}

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  status: 'completed' | 'pending' | 'scheduled' | 'urgent';
  type: 'booking' | 'task' | 'issue' | 'user';
  link?: string;
}

// Fetch comprehensive dashboard statistics
const fetchDashboardStats = async (userId?: string): Promise<DashboardStats> => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  // Fetch properties
  const { data: properties, error: propsError } = await supabase
    .from('properties')
    .select('property_id, is_active');

  if (propsError) throw propsError;

  const totalProperties = properties?.length || 0;
  const activeProperties = properties?.filter(p => p.is_active).length || 0;

  // Fetch bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from('property_bookings')
    .select('booking_id, check_in_date, check_out_date, total_amount, booking_status')
    .gte('check_out_date', today);

  if (bookingsError) throw bookingsError;

  const totalBookings = bookings?.length || 0;
  const todayCheckIns = bookings?.filter(b => b.check_in_date === today).length || 0;
  const todayCheckOuts = bookings?.filter(b => b.check_out_date === today).length || 0;
  const upcomingBookings = bookings?.filter(b =>
    b.check_in_date > today && b.booking_status === 'confirmed'
  ).length || 0;

  // Calculate monthly revenue
  const monthlyBookings = bookings?.filter(b =>
    b.check_in_date >= monthStart && b.check_in_date <= monthEnd
  ) || [];
  const monthlyRevenue = monthlyBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Calculate occupancy rate
  const currentBookings = bookings?.filter(b =>
    b.check_in_date <= today && b.check_out_date >= today && b.booking_status === 'confirmed'
  ).length || 0;
  const occupancyRate = activeProperties > 0
    ? Math.round((currentBookings / activeProperties) * 100)
    : 0;

  // Fetch tasks - filter by current user if userId is provided
  // This ensures Dashboard KPI matches Todos page which shows only user's tasks
  let tasksQuery = supabase
    .from('tasks')
    .select('task_id, status, priority, due_date, assigned_to');

  // Filter by current user to match Todos page behavior
  if (userId) {
    tasksQuery = tasksQuery.eq('assigned_to', userId);
  }

  const { data: tasks, error: tasksError } = await tasksQuery;

  if (tasksError) throw tasksError;

  const activeTasks = tasks?.filter(t =>
    t.status === 'pending' || t.status === 'in_progress'
  ).length || 0;
  const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;

  const overdueTasksCount = tasks?.filter(t =>
    (t.status === 'pending' || t.status === 'in_progress') &&
    t.due_date && t.due_date < today
  ).length || 0;

  // Fetch issues - filter by current user if userId is provided
  // This ensures Dashboard KPI matches Issues page which shows only user's issues
  // Issues page filters by: assigned_to OR reported_by = current user
  let issuesQuery = supabase
    .from('issues')
    .select('issue_id, status, priority, assigned_to, reported_by');

  // Filter by current user to match Issues page behavior
  if (userId) {
    issuesQuery = issuesQuery.or(`assigned_to.eq.${userId},reported_by.eq.${userId}`);
  }

  const { data: issues, error: issuesError } = await issuesQuery;

  if (issuesError) throw issuesError;

  const openIssues = issues?.filter(i =>
    i.status === 'open' || i.status === 'in_progress'
  ).length || 0;
  const urgentIssues = issues?.filter(i =>
    (i.status === 'open' || i.status === 'in_progress') &&
    (i.priority === 'high' || i.priority === 'urgent')
  ).length || 0;

  // Fetch users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('user_id, is_active');

  if (usersError) throw usersError;

  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter(u => u.is_active).length || 0;

  return {
    totalProperties,
    activeProperties,
    totalBookings,
    todayCheckIns,
    todayCheckOuts,
    activeTasks,
    pendingTasks,
    completedTasks,
    openIssues,
    urgentIssues,
    totalUsers,
    activeUsers,
    occupancyRate,
    monthlyRevenue,
    upcomingBookings,
    overdueTasksCount,
  };
};

// Fetch recent activities from activity logs
const fetchRecentActivities = async (): Promise<RecentActivity[]> => {
  const { data: activityLogs, error } = await supabase
    .from('activity_logs')
    .select('log_id, action_type, action_details, created_at, performed_by')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  return activityLogs?.map(log => {
    const createdAt = new Date(log.created_at || '');
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let timeText = '';
    if (diffHours < 1) {
      const diffMins = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
      timeText = diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      timeText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      timeText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      timeText = format(createdAt, 'MMM dd, yyyy');
    }

    const details = log.action_details || {};
    let title = '';
    let description = '';
    let status: RecentActivity['status'] = 'completed';
    let type: RecentActivity['type'] = 'user';

    switch (log.action_type) {
      case 'USER_CREATED':
        title = `New user: ${details.userEmail || 'Unknown'}`;
        description = `User created by ${log.performed_by}`;
        type = 'user';
        break;
      case 'USER_UPDATED':
        title = `User updated: ${details.userEmail || 'Unknown'}`;
        description = `Updated by ${log.performed_by}`;
        type = 'user';
        break;
      case 'BOOKING_CREATED':
        title = `New booking created`;
        description = `Guest: ${details.guestName || 'Unknown'}`;
        status = 'scheduled';
        type = 'booking';
        break;
      case 'TASK_COMPLETED':
        title = `Task completed`;
        description = details.taskTitle || 'Task finished';
        type = 'task';
        break;
      case 'ISSUE_CREATED':
        title = `New issue reported`;
        description = details.issueTitle || 'Issue requires attention';
        status = 'urgent';
        type = 'issue';
        break;
      case 'ISSUE_RESOLVED':
        title = `Issue resolved`;
        description = details.issueTitle || 'Issue fixed';
        type = 'issue';
        break;
      default:
        title = log.action_type.replace(/_/g, ' ').toLowerCase();
        description = `Action performed by ${log.performed_by}`;
    }

    return {
      id: log.log_id || '',
      title,
      description,
      time: timeText,
      status,
      type,
    };
  }) || [];
};

export function useDashboardData() {
  // Get current user session to filter tasks by user
  const [userId, setUserId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
  }, []);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: [...dashboardKeys.stats(), userId],
    queryFn: () => fetchDashboardStats(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    enabled: !!userId, // Only fetch when we have a user ID
  });

  const {
    data: activities,
    isLoading: activitiesLoading,
    error: activitiesError,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: dashboardKeys.recentActivities(),
    queryFn: fetchRecentActivities,
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });

  return {
    stats: stats || {
      totalProperties: 0,
      activeProperties: 0,
      totalBookings: 0,
      todayCheckIns: 0,
      todayCheckOuts: 0,
      activeTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
      openIssues: 0,
      urgentIssues: 0,
      totalUsers: 0,
      activeUsers: 0,
      occupancyRate: 0,
      monthlyRevenue: 0,
      upcomingBookings: 0,
      overdueTasksCount: 0,
    },
    activities: activities || [],
    isLoading: statsLoading || activitiesLoading,
    error: statsError || activitiesError,
    refetch: () => {
      refetchStats();
      refetchActivities();
    },
  };
}
