import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Clock, 
  MapPin, 
  User,
  CheckCircle,
  Calendar,
  AlertTriangle
} from "lucide-react";

const activeJobs = [
  {
    id: "JOB-001",
    title: "Property Check-in",
    property: "Jade Signature 901",
    address: "16901 Collins Avenue, Sunny Isles Beach",
    assignee: "Maria Santos",
    status: "In Progress",
    priority: "High",
    dueDate: "Today, 3:00 PM",
    description: "Complete check-in process for new guest arrival",
    progress: 60,
  },
  {
    id: "JOB-002", 
    title: "Maintenance Request",
    property: "Trump Tower III #2602",
    address: "15811 Collins Avenue #2602, Sunny Isles Beach",
    assignee: "Carlos Rodriguez",
    status: "Pending",
    priority: "Medium",
    dueDate: "Tomorrow, 10:00 AM",
    description: "Fix air conditioning issue in unit",
    progress: 25,
  },
  {
    id: "JOB-003",
    title: "Property Inspection",
    property: "Marina Palms #1001",
    address: "17111 Biscayne Boulevard Unit 1001",
    assignee: "Ana Silva",
    status: "Scheduled",
    priority: "Low",
    dueDate: "Dec 28, 2:00 PM",
    description: "Quarterly property inspection and report",
    progress: 0,
  }
];

export default function Jobs() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Progress":
        return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
      case "Pending":
        return <Badge className="bg-orange-500 text-white">Pending</Badge>;
      case "Scheduled":
        return <Badge variant="outline">Scheduled</Badge>;
      case "Completed":
        return <Badge className="bg-accent text-accent-foreground">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-destructive";
      case "Medium":
        return "text-orange-500";
      case "Low":
        return "text-accent";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Active Jobs</h1>
          <p className="text-muted-foreground">
            Manage ongoing operations and assignments
          </p>
        </div>
        <Button className="bg-gradient-primary hover:bg-gradient-secondary">
          <Plus className="h-4 w-4 mr-2" />
          Create New Job
        </Button>
      </div>

      {/* Jobs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-accent">+3 from yesterday</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-blue-500">Active assignments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-orange-500">Awaiting action</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-accent">Tasks finished</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs List */}
      <div className="space-y-4">
        {activeJobs.map((job) => (
          <Card key={job.id} className="hover:shadow-card transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold">{job.title}</h3>
                    {getStatusBadge(job.status)}
                    <Badge variant="outline" className={getPriorityColor(job.priority)}>
                      {job.priority} Priority
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="font-medium text-primary">{job.property}</span>
                      <span className="mx-2">•</span>
                      <span>{job.address}</span>
                    </div>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      <span>Assigned to: {job.assignee}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Due: {job.dueDate}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm mt-2">{job.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>{job.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-accent h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Job ID: {job.id}
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                  <Button size="sm" className="bg-accent hover:bg-accent-hover">
                    Update Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}