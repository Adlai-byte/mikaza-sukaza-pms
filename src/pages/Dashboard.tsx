import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building,
  BriefcaseIcon,
  CalendarClock,
  FileText,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Home,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { stats, activities, isLoading, refetch } = useDashboardData();
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Mikaza Sukaza Property Management System
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

      {/* Stats Grid - Matching Calendar Design */}
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
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Latest updates across all properties and operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => {
                  const statusColors = {
                    completed: "bg-green-500",
                    pending: "bg-orange-500",
                    scheduled: "bg-blue-500",
                    urgent: "bg-red-500",
                  };

                  const typeIcons = {
                    booking: CalendarClock,
                    task: BriefcaseIcon,
                    issue: AlertTriangle,
                    user: Users,
                  };

                  const Icon = typeIcons[activity.type];

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${statusColors[activity.status]}`} />
                      <div className="flex-shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
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
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Revenue MTD</span>
              </div>
              <span className="font-semibold text-green-600">
                {isLoading ? '...' : `$${stats.monthlyRevenue.toLocaleString()}`}
              </span>
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
              <Button
                className="w-full bg-gradient-secondary hover:bg-gradient-primary"
                onClick={() => navigate('/bookings')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View All Bookings
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/todos')}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Manage Tasks
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}