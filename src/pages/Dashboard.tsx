import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, BriefcaseIcon, CalendarClock, FileText, TrendingUp, Users } from "lucide-react";

const statsCards = [
  {
    title: "Total Properties",
    value: "47",
    description: "Active properties",
    icon: Building,
    trend: "+2 this month",
    color: "text-blue-600",
  },
  {
    title: "Active Jobs",
    value: "23",
    description: "Ongoing operations",
    icon: BriefcaseIcon,
    trend: "+5 today",
    color: "text-accent",
  },
  {
    title: "Pending Check-ins",
    value: "8",
    description: "Scheduled for today",
    icon: CalendarClock,
    trend: "3 completed",
    color: "text-orange-500",
  },
  {
    title: "Open Issues",
    value: "12",
    description: "Requiring attention",
    icon: FileText,
    trend: "-2 since yesterday",
    color: "text-destructive",
  },
];

const recentActivities = [
  {
    title: "Property 10334 - Jade Signature 901",
    description: "Check-in completed by Maria Santos",
    time: "2 hours ago",
    status: "completed",
  },
  {
    title: "Unit 10329 - Aria unit 311",
    description: "Issue reported: Air conditioning not working",
    time: "4 hours ago",
    status: "pending",
  },
  {
    title: "Property 5 - RTL Trump Tower III #2602",
    description: "Financial entries updated",
    time: "1 day ago",
    status: "completed",
  },
  {
    title: "Unit 10322 - Marina Palms #1001",
    description: "Check-out scheduled for tomorrow",
    time: "1 day ago",
    status: "scheduled",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Mikaza Sukaza Property Management System
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">Export Report</Button>
          <Button className="bg-gradient-primary hover:bg-gradient-secondary">
            Quick Action
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-card transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
              <p className="text-xs text-accent font-medium mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
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
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.status === "completed"
                        ? "bg-accent"
                        : activity.status === "pending"
                        ? "bg-orange-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{activity.title}</h4>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Quick Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Occupancy Rate</span>
              <span className="font-semibold text-accent">94%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Revenue MTD</span>
              <span className="font-semibold">$127,450</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending Invoices</span>
              <span className="font-semibold text-orange-500">$23,100</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Staff</span>
              <span className="font-semibold">12</span>
            </div>
            
            <Button className="w-full mt-4 bg-gradient-secondary hover:bg-gradient-primary">
              View Detailed Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}