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
  Activity,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle2,
  Download,
  CreditCard,
  Globe
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
      try {
        // Fetch all activity logs related to this user
        // This includes both:
        // 1. Logs where user_id matches (actions done TO this user)
        // 2. Logs performed by this user (in performed_by field)
        const logs = await getActivityLogs(user.user_id);

        console.log('📋 [UserDetails] Fetched activity logs for user:', user.email, logs.length);
        setActivityLogs(logs.slice(0, 10)); // Show last 10 activities
      } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        setActivityLogs([]);
      } finally {
        setLoading(false);
      }
    }
  }, [user.user_id, user.email, getActivityLogs]);

  useEffect(() => {
    if (open && user.user_id) {
      fetchActivityLogs();
    }
  }, [open, user.user_id, fetchActivityLogs]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatActionType = (actionType: string): string => {
    // Convert action types to human-readable format
    const typeMap: Record<string, string> = {
      'USER_CREATED': 'User Created',
      'USER_UPDATED': 'User Updated',
      'USER_DELETED': 'User Deleted',
      'USER_LOGIN': 'Logged In',
      'USER_LOGOUT': 'Logged Out',
      'PROPERTY_CREATED': 'Property Created',
      'PROPERTY_UPDATED': 'Property Updated',
      'PROPERTY_DELETED': 'Property Deleted',
      'BOOKING_CREATED': 'Booking Created',
      'BOOKING_UPDATED': 'Booking Updated',
      'BOOKING_CANCELLED': 'Booking Cancelled',
      'TASK_CREATED': 'Task Created',
      'TASK_UPDATED': 'Task Updated',
      'TASK_COMPLETED': 'Task Completed',
      'ISSUE_CREATED': 'Issue Created',
      'ISSUE_RESOLVED': 'Issue Resolved',
      'INVOICE_CREATED': 'Invoice Created',
      'INVOICE_SENT': 'Invoice Sent',
      'PAYMENT_RECEIVED': 'Payment Received',
    };

    return typeMap[actionType] || actionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatActionDetails = (details: Record<string, any> | undefined) => {
    if (!details || Object.keys(details).length === 0) return null;

    const formattedDetails: string[] = [];

    // Format different fields in a user-friendly way
    if (details.userEmail) formattedDetails.push(`${details.userEmail}`);
    if (details.userName) formattedDetails.push(`${details.userName}`);
    if (details.userType) formattedDetails.push(`Role: ${details.userType}`);
    if (details.isActive !== undefined) formattedDetails.push(details.isActive ? 'Activated' : 'Deactivated');
    if (details.propertyName) formattedDetails.push(`Property: ${details.propertyName}`);
    if (details.propertyId) formattedDetails.push(`Property ID: ${details.propertyId.substring(0, 8)}...`);
    if (details.bookingId) formattedDetails.push(`Booking #${details.bookingId.substring(0, 8)}`);
    if (details.taskId) formattedDetails.push(`Task #${details.taskId.substring(0, 8)}`);
    if (details.taskTitle) formattedDetails.push(`"${details.taskTitle}"`);
    if (details.issueId) formattedDetails.push(`Issue #${details.issueId.substring(0, 8)}`);
    if (details.issueTitle) formattedDetails.push(`"${details.issueTitle}"`);
    if (details.status) formattedDetails.push(`Status: ${details.status}`);
    if (details.priority) formattedDetails.push(`Priority: ${details.priority}`);
    if (details.amount) formattedDetails.push(`$${details.amount}`);
    if (details.invoiceNumber) formattedDetails.push(`Invoice #${details.invoiceNumber}`);

    // If there are other details not explicitly handled, add them
    const handledKeys = [
      'userEmail', 'userName', 'userType', 'isActive', 'propertyName', 'propertyId',
      'bookingId', 'taskId', 'taskTitle', 'issueId', 'issueTitle',
      'status', 'priority', 'amount', 'invoiceNumber'
    ];
    Object.entries(details).forEach(([key, value]) => {
      if (!handledKeys.includes(key) && value !== null && value !== undefined && value !== '') {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        formattedDetails.push(`${formattedKey}: ${value}`);
      }
    });

    return formattedDetails.length > 0 ? formattedDetails.join(' • ') : null;
  };

  const getStatusBadge = () => {
    if (user.account_status === 'suspended') {
      return <Badge variant="destructive" className="text-sm">⛔ Suspended</Badge>;
    }
    if (user.account_status === 'archived') {
      return <Badge variant="secondary" className="text-sm">📦 Archived</Badge>;
    }
    return user.is_active ? (
      <Badge variant="default" className="text-sm">✓ Active</Badge>
    ) : (
      <Badge variant="destructive" className="text-sm">✗ Inactive</Badge>
    );
  };

  const getRoleBadge = () => {
    const roleMap: Record<string, { label: string; variant: any }> = {
      admin: { label: '👑 Admin', variant: 'default' },
      ops: { label: '⚙️ Operations', variant: 'secondary' },
      provider: { label: '🔧 Provider', variant: 'outline' },
      customer: { label: '👤 Customer', variant: 'outline' },
    };
    const roleInfo = roleMap[user.user_type] || { label: user.user_type, variant: 'secondary' };
    return <Badge variant={roleInfo.variant} className="text-sm">{roleInfo.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">User Profile</DialogTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {getRoleBadge()}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Summary Card */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={user.photo_url} alt={`${user.first_name} ${user.last_name}`} />
                  <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                    {getInitials(user.first_name, user.last_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2">{user.first_name} {user.last_name}</h2>
                  <div className="flex items-center gap-3 text-muted-foreground mb-3">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      ID: {user.user_id?.slice(0, 8)}...
                    </Badge>
                    {user.last_login_at && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Last login: {format(new Date(user.last_login_at), 'MMM dd, HH:mm')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Status - Show if suspended or archived */}
          {(user.account_status === 'suspended' || user.account_status === 'archived') && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Account Status Alert
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.account_status === 'suspended' && (
                  <>
                    <div>
                      <p className="font-medium">This account is suspended</p>
                      {user.suspension_reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {user.suspension_reason}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {user.suspended_at && (
                        <div>
                          <label className="text-muted-foreground">Suspended On</label>
                          <p className="font-medium">{format(new Date(user.suspended_at), 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                      )}
                      {user.suspended_by && (
                        <div>
                          <label className="text-muted-foreground">Suspended By</label>
                          <p className="font-medium">{user.suspended_by}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {user.account_status === 'archived' && (
                  <>
                    <p className="font-medium">This account is archived</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {user.archived_at && (
                        <div>
                          <label className="text-muted-foreground">Archived On</label>
                          <p className="font-medium">{format(new Date(user.archived_at), 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                      )}
                      {user.archived_by && (
                        <div>
                          <label className="text-muted-foreground">Archived By</label>
                          <p className="font-medium">{user.archived_by}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Personal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <UserIcon className="h-5 w-5" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {user.company && (
                  <div>
                    <label className="text-xs text-muted-foreground">Company</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{user.company}</span>
                    </div>
                  </div>
                )}

                {user.date_of_birth && (() => {
                  try {
                    return (
                      <div>
                        <label className="text-xs text-muted-foreground">Date of Birth</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{format(new Date(user.date_of_birth), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    );
                  } catch (error) {
                    console.error('Error formatting date:', error);
                    return (
                      <div>
                        <label className="text-xs text-muted-foreground">Date of Birth</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{user.date_of_birth}</span>
                        </div>
                      </div>
                    );
                  }
                })()}

                {user.cellphone_primary && (
                  <div>
                    <label className="text-xs text-muted-foreground">Primary Phone</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{user.cellphone_primary}</span>
                    </div>
                  </div>
                )}

                {user.cellphone_usa && (
                  <div>
                    <label className="text-xs text-muted-foreground">USA Phone</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{user.cellphone_usa}</span>
                    </div>
                  </div>
                )}

                {user.whatsapp && (
                  <div>
                    <label className="text-xs text-muted-foreground">WhatsApp</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{user.whatsapp}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Timestamps */}
              {(user.created_at || user.updated_at) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    {user.created_at && (
                      <div>
                        <label>Account Created</label>
                        <p className="font-medium text-sm text-foreground">
                          {format(new Date(user.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    )}
                    {user.updated_at && (
                      <div>
                        <label>Last Updated</label>
                        <p className="font-medium text-sm text-foreground">
                          {format(new Date(user.updated_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Information */}
          {(user.address || user.city || user.state || user.zip || user.country) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <MapPin className="h-5 w-5" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.address && (
                    <div>
                      <label className="text-xs text-muted-foreground">Street Address</label>
                      <p className="font-medium">{user.address}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {user.city && (
                      <div>
                        <label className="text-xs text-muted-foreground">City</label>
                        <p className="font-medium">{user.city}</p>
                      </div>
                    )}
                    {user.state && (
                      <div>
                        <label className="text-xs text-muted-foreground">State</label>
                        <p className="font-medium">{user.state}</p>
                      </div>
                    )}
                    {user.zip && (
                      <div>
                        <label className="text-xs text-muted-foreground">ZIP Code</label>
                        <p className="font-medium">{user.zip}</p>
                      </div>
                    )}
                    {user.country && (
                      <div>
                        <label className="text-xs text-muted-foreground">Country</label>
                        <div className="flex items-center gap-1 mt-1">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{user.country}</span>
                        </div>
                      </div>
                    )}
                  </div>
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
                        <div className="flex items-start justify-between py-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {formatActionType(log.action_type)}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {log.action_type}
                              </Badge>
                            </div>
                            {formattedDetails && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {formattedDetails}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                by <span className="font-medium">{log.performed_by || 'System'}</span>
                              </p>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">
                                {log.created_at && (() => {
                                  try {
                                    return format(new Date(log.created_at), 'MMM dd, yyyy HH:mm');
                                  } catch (error) {
                                    console.error('Error formatting log date:', error);
                                    return log.created_at;
                                  }
                                })()}
                              </p>
                            </div>
                          </div>
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