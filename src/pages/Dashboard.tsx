import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building,
  BriefcaseIcon,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Users,
  Home,
  Clock,
  FileText,
  Plus,
  ArrowRight,
  XCircle,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, addDays } from "date-fns";

export default function Dashboard() {
  const { stats, isLoading, refetch } = useDashboardData();
  const navigate = useNavigate();

  // Fetch upcoming bookings for the next 7 days
  const { data: upcomingBookings = [] } = useQuery({
    queryKey: ['upcoming-bookings-dashboard'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekFromNow = format(addDays(new Date(), 7), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('property_bookings')
        .select(`
          *,
          property:properties(property_name, property_type)
        `)
        .gte('check_in_date', today)
        .lte('check_in_date', weekFromNow)
        .eq('booking_status', 'confirmed')
        .order('check_in_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  // Fetch jobs summary
  const { data: jobsData } = useQuery({
    queryKey: ['jobs-summary-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('job_id, status, priority');

      if (error) throw error;

      const pending = data?.filter(j => j.status === 'pending').length || 0;
      const inProgress = data?.filter(j => j.status === 'in_progress').length || 0;
      const review = data?.filter(j => j.status === 'review').length || 0;
      const completed = data?.filter(j => j.status === 'completed').length || 0;

      return { pending, inProgress, review, completed, total: data?.length || 0 };
    },
    staleTime: 60 * 1000,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Casa & Concierge Property Management System
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            className="bg-gradient-primary hover:bg-gradient-secondary w-full sm:w-auto"
            onClick={() => navigate('/calendar')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Properties Card */}
        <Card
          className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          onClick={() => navigate('/properties')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Properties</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {isLoading ? '...' : stats.totalProperties}
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  {stats.activeProperties} active
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Card */}
        <Card
          className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          onClick={() => navigate('/calendar')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Today's Activity</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {isLoading ? '...' : stats.todayCheckIns + stats.todayCheckOuts}
                </h3>
                <p className="text-xs text-green-600 mt-1">
                  {stats.todayCheckIns} in • {stats.todayCheckOuts} out
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CalendarClock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Card */}
        <Card
          className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          onClick={() => navigate('/todos')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Active Tasks</p>
                <h3 className="text-3xl font-bold text-orange-900 mt-1">
                  {isLoading ? '...' : stats.activeTasks}
                </h3>
                <p className="text-xs text-orange-600 mt-1">
                  {stats.overdueTasksCount > 0 ? `${stats.overdueTasksCount} overdue` : `${stats.pendingTasks} pending`}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <BriefcaseIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues Card */}
        <Card
          className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          onClick={() => navigate('/issues')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Open Issues</p>
                <h3 className="text-3xl font-bold text-red-900 mt-1">
                  {isLoading ? '...' : stats.openIssues}
                </h3>
                <p className="text-xs text-red-600 mt-1">
                  {stats.urgentIssues > 0 ? `${stats.urgentIssues} urgent` : 'Requiring attention'}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BriefcaseIcon className="h-5 w-5 text-primary" />
              <span>Jobs Overview</span>
            </CardTitle>
            <CardDescription>Current status of all work orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !jobsData ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium">Pending</p>
                        <p className="text-xs text-muted-foreground">Awaiting start</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-orange-600">{jobsData.pending}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">In Progress</p>
                        <p className="text-xs text-muted-foreground">Currently active</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{jobsData.inProgress}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="flex items-center gap-3">
                      <PauseCircle className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium">In Review</p>
                        <p className="text-xs text-muted-foreground">Quality check</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">{jobsData.review}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Completed</p>
                        <p className="text-xs text-muted-foreground">This month</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{jobsData.completed}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => navigate('/jobs')}
                >
                  View All Jobs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span>Upcoming Bookings</span>
            </CardTitle>
            <CardDescription>Next 7 days check-ins</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No upcoming bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.booking_id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                  >
                    <div className="flex-shrink-0 w-12 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {format(parseISO(booking.check_in_date), 'dd')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(booking.check_in_date), 'MMM')}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {booking.guest_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {booking.property?.property_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(booking.check_in_date), 'MMM dd')} - {format(parseISO(booking.check_out_date), 'MMM dd')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {booking.booking_status}
                    </Badge>
                  </div>
                ))}
                {upcomingBookings.length >= 5 && (
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/bookings')}
                  >
                    View All Bookings
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics & Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Occupancy Rate */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Occupancy Rate</span>
                <span className={`font-semibold ${stats.occupancyRate >= 80 ? 'text-green-600' : stats.occupancyRate >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
                  {isLoading ? '...' : `${stats.occupancyRate}%`}
                </span>
              </div>
              <Progress value={stats.occupancyRate} className="h-2" />
            </div>

            {/* Monthly Revenue */}
            <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Revenue MTD</p>
                  <p className="text-lg font-bold text-green-600">
                    {isLoading ? '...' : `$${stats.monthlyRevenue.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Bookings */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Bookings</span>
              </div>
              <span className="font-semibold">
                {isLoading ? '...' : stats.totalBookings}
              </span>
            </div>

            {/* Active Users */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Active Staff</span>
              </div>
              <span className="font-semibold">
                {isLoading ? '...' : `${stats.activeUsers}/${stats.totalUsers}`}
              </span>
            </div>

            {/* Task Completion Rate */}
            {(stats.completedTasks + stats.activeTasks) > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Task Completion</span>
                  <span className="font-semibold">
                    {Math.round((stats.completedTasks / (stats.completedTasks + stats.activeTasks)) * 100)}%
                  </span>
                </div>
                <Progress value={(stats.completedTasks / (stats.completedTasks + stats.activeTasks)) * 100} className="h-2" />
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-semibold mb-2">Quick Actions</p>
              <Button
                size="sm"
                className="w-full bg-gradient-primary hover:bg-gradient-secondary"
                onClick={() => navigate('/bookings?new=true')}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/todos')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Task
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/issues')}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
