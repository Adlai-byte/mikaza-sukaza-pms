import { useState, useEffect, useCallback } from "react";
import { User, ActivityLog } from "@/lib/schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Calendar,
  Activity 
} from "lucide-react";
import { format } from "date-fns";

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function UserDetailsDialog({ open, onOpenChange, user }: UserDetailsDialogProps) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { getActivityLogs } = useActivityLogs();

  const fetchActivityLogs = useCallback(async () => {
    if (user.user_id) {
      setLoading(true);
      const logs = await getActivityLogs(user.user_id);
      setActivityLogs(logs.slice(0, 10)); // Show last 10 activities
      setLoading(false);
    }
  }, [user.user_id, getActivityLogs]);

  useEffect(() => {
    if (open && user.user_id) {
      fetchActivityLogs();
    }
  }, [open, user.user_id, fetchActivityLogs]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatActionDetails = (details: Record<string, any> | undefined) => {
    if (!details || Object.keys(details).length === 0) return null;

    const formattedDetails: string[] = [];

    // Format different fields in a user-friendly way
    if (details.userEmail) formattedDetails.push(`Email: ${details.userEmail}`);
    if (details.userType) formattedDetails.push(`Type: ${details.userType}`);
    if (details.isActive !== undefined) formattedDetails.push(`Active: ${details.isActive ? 'Yes' : 'No'}`);
    if (details.propertyName) formattedDetails.push(`Property: ${details.propertyName}`);
    if (details.bookingId) formattedDetails.push(`Booking ID: ${details.bookingId}`);
    if (details.taskId) formattedDetails.push(`Task ID: ${details.taskId}`);
    if (details.issueId) formattedDetails.push(`Issue ID: ${details.issueId}`);
    if (details.status) formattedDetails.push(`Status: ${details.status}`);
    if (details.priority) formattedDetails.push(`Priority: ${details.priority}`);

    // If there are other details not explicitly handled, add them
    const handledKeys = ['userEmail', 'userType', 'isActive', 'propertyName', 'bookingId', 'taskId', 'issueId', 'status', 'priority'];
    Object.entries(details).forEach(([key, value]) => {
      if (!handledKeys.includes(key) && value !== null && value !== undefined) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        formattedDetails.push(`${formattedKey}: ${value}`);
      }
    });

    return formattedDetails.join(' • ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <UserIcon className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.photo_url} alt={`${user.first_name} ${user.last_name}`} />
                  <AvatarFallback className="text-lg">
                    {getInitials(user.first_name, user.last_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-2xl font-semibold">{user.first_name} {user.last_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={user.user_type === 'admin' ? 'default' : 'secondary'}>
                        {user.user_type === 'admin' ? 'Admin' : 'Ops'}
                      </Badge>
                      <Badge variant={user.is_active ? 'default' : 'destructive'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                    
                    {user.cellphone_primary && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{user.cellphone_primary}</span>
                      </div>
                    )}

                    {user.company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{user.company}</span>
                      </div>
                    )}

                    {user.date_of_birth && (() => {
                      try {
                        return (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(user.date_of_birth), 'MMM dd, yyyy')}</span>
                          </div>
                        );
                      } catch (error) {
                        console.error('Error formatting date:', error);
                        return (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{user.date_of_birth}</span>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          {(user.address || user.cellphone_usa || user.whatsapp) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <MapPin className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.address && (
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-muted-foreground">
                      {user.address}
                      {user.city && `, ${user.city}`}
                      {user.state && `, ${user.state}`}
                      {user.zip && ` ${user.zip}`}
                      {user.country && `, ${user.country}`}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.cellphone_usa && (
                    <div>
                      <p className="font-medium">USA Phone</p>
                      <p className="text-muted-foreground">{user.cellphone_usa}</p>
                    </div>
                  )}

                  {user.whatsapp && (
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <p className="text-muted-foreground">{user.whatsapp}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading activity...</div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2" />
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activityLogs.map((log, index) => {
                    const formattedDetails = formatActionDetails(log.action_details);
                    return (
                      <div key={log.log_id || index}>
                        <div className="flex items-center justify-between py-2">
                          <div className="flex-1">
                            <p className="font-medium capitalize">
                              {log.action_type.replace(/_/g, ' ').toLowerCase()}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            by {log.performed_by}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {log.created_at && (() => {
                            try {
                              return format(new Date(log.created_at), 'MMM dd, HH:mm');
                            } catch (error) {
                              console.error('Error formatting log date:', error);
                              return log.created_at;
                            }
                          })()}
                        </div>
                        {index < activityLogs.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}