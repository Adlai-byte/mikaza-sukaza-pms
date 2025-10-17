import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter, Calendar, User, Activity } from "lucide-react";
import { format } from "date-fns";
import { ActivityLog } from "@/lib/schemas";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Fetch activity logs with React Query
const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000); // Limit to last 1000 logs

  if (error) {
    console.error('Failed to fetch activity logs:', error);
    throw error;
  }

  return (data || []) as ActivityLog[];
};

// Action type categories for filtering
const ACTION_CATEGORIES = {
  'User Management': ['USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_LOGIN', 'USER_LOGOUT'],
  'Property Management': ['PROPERTY_CREATED', 'PROPERTY_UPDATED', 'PROPERTY_DELETED'],
  'Booking Management': ['BOOKING_CREATED', 'BOOKING_UPDATED', 'BOOKING_CANCELLED', 'BOOKING_COMPLETED'],
  'Provider Management': ['PROVIDER_CREATED', 'PROVIDER_UPDATED', 'PROVIDER_DELETED', 'PROVIDER_ASSIGNED', 'PROVIDER_UNASSIGNED'],
  'Financial': ['PAYMENT_CREATED', 'PAYMENT_UPDATED', 'INVOICE_CREATED', 'EXPENSE_CREATED'],
  'System': ['SYSTEM_ERROR', 'SYSTEM_WARNING', 'SYSTEM_INFO'],
};

const ACTION_TYPE_COLORS: Record<string, string> = {
  // User actions
  USER_CREATED: 'bg-green-100 text-green-800 border-green-200',
  USER_UPDATED: 'bg-blue-100 text-blue-800 border-blue-200',
  USER_DELETED: 'bg-red-100 text-red-800 border-red-200',
  USER_LOGIN: 'bg-purple-100 text-purple-800 border-purple-200',
  USER_LOGOUT: 'bg-gray-100 text-gray-800 border-gray-200',

  // Property actions
  PROPERTY_CREATED: 'bg-green-100 text-green-800 border-green-200',
  PROPERTY_UPDATED: 'bg-blue-100 text-blue-800 border-blue-200',
  PROPERTY_DELETED: 'bg-red-100 text-red-800 border-red-200',

  // Booking actions
  BOOKING_CREATED: 'bg-green-100 text-green-800 border-green-200',
  BOOKING_UPDATED: 'bg-blue-100 text-blue-800 border-blue-200',
  BOOKING_CANCELLED: 'bg-orange-100 text-orange-800 border-orange-200',
  BOOKING_COMPLETED: 'bg-teal-100 text-teal-800 border-teal-200',

  // Provider actions
  PROVIDER_CREATED: 'bg-green-100 text-green-800 border-green-200',
  PROVIDER_UPDATED: 'bg-blue-100 text-blue-800 border-blue-200',
  PROVIDER_DELETED: 'bg-red-100 text-red-800 border-red-200',
  PROVIDER_ASSIGNED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  PROVIDER_UNASSIGNED: 'bg-gray-100 text-gray-800 border-gray-200',

  // Financial actions
  PAYMENT_CREATED: 'bg-green-100 text-green-800 border-green-200',
  PAYMENT_UPDATED: 'bg-blue-100 text-blue-800 border-blue-200',
  INVOICE_CREATED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  EXPENSE_CREATED: 'bg-red-100 text-red-800 border-red-200',

  // System actions
  SYSTEM_ERROR: 'bg-red-100 text-red-800 border-red-200',
  SYSTEM_WARNING: 'bg-orange-100 text-orange-800 border-orange-200',
  SYSTEM_INFO: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function ActivityLogs() {
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Check if user has permission to view activity logs
  const canView = hasPermission(PERMISSIONS.SYSTEM_AUDIT);

  const {
    data: logs = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['activity_logs'],
    queryFn: fetchActivityLogs,
    enabled: canView, // Only fetch if user has permission
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, actionTypeFilter]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Search filter
    const matchesSearch =
      search === "" ||
      log.action_type.toLowerCase().includes(search.toLowerCase()) ||
      log.performed_by?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.action_details || {}).toLowerCase().includes(search.toLowerCase());

    // Category filter
    let matchesCategory = true;
    if (categoryFilter !== "all") {
      const categoryActions = ACTION_CATEGORIES[categoryFilter as keyof typeof ACTION_CATEGORIES] || [];
      matchesCategory = categoryActions.includes(log.action_type);
    }

    // Action type filter
    const matchesActionType = actionTypeFilter === "all" || log.action_type === actionTypeFilter;

    return matchesSearch && matchesCategory && matchesActionType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Action Type', 'Performed By', 'Details'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd'),
      format(new Date(log.created_at), 'HH:mm:ss'),
      log.action_type,
      log.performed_by || 'System',
      JSON.stringify(log.action_details || {}),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get unique action types for filter
  const uniqueActionTypes = Array.from(new Set(logs.map(log => log.action_type))).sort();

  // Format action details for display
  const formatActionDetails = (details: Record<string, any> | undefined) => {
    if (!details || Object.keys(details).length === 0) return null;

    return (
      <div className="text-xs text-muted-foreground mt-1 space-y-1">
        {Object.entries(details).slice(0, 3).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="font-medium">{key}:</span>
            <span className="truncate max-w-xs">{String(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!canView) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You don't have permission to view activity logs. This page is only accessible to administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Activity Logs
          </h1>
          <p className="text-muted-foreground mt-2">
            System-wide activity tracking and audit trail
          </p>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Search and filter activity logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.keys(ACTION_CATEGORIES).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Action Type Filter */}
              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Action Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Action Types</SelectItem>
                  {uniqueActionTypes.map((actionType) => (
                    <SelectItem key={actionType} value={actionType}>
                      {actionType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button onClick={exportToCSV} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold">{logs.length}</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Filtered Results</p>
                  <p className="text-2xl font-bold">{filteredLogs.length}</p>
                </div>
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unique Actions</p>
                  <p className="text-2xl font-bold">{uniqueActionTypes.length}</p>
                </div>
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log Entries</CardTitle>
            <CardDescription>
              Showing {startIndex + 1} to {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading activity logs...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                Error loading activity logs. Please try again.
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activity logs found matching your filters.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Date & Time
                          </div>
                        </TableHead>
                        <TableHead>Action Type</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Performed By
                          </div>
                        </TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log) => (
                        <TableRow key={log.log_id}>
                          <TableCell className="font-mono text-sm">
                            <div>{format(new Date(log.created_at), 'MMM dd, yyyy')}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'HH:mm:ss')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={ACTION_TYPE_COLORS[log.action_type] || 'bg-gray-100 text-gray-800'}
                            >
                              {log.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.performed_by || 'System'}
                          </TableCell>
                          <TableCell>
                            {formatActionDetails(log.action_details)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {paginatedLogs.map((log) => (
                    <Card key={log.log_id}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Date & Time */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span className="font-mono">
                                {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                              </span>
                            </div>
                          </div>

                          {/* Action Type Badge */}
                          <div>
                            <Badge
                              variant="outline"
                              className={ACTION_TYPE_COLORS[log.action_type] || 'bg-gray-100 text-gray-800'}
                            >
                              {log.action_type}
                            </Badge>
                          </div>

                          {/* Performed By */}
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{log.performed_by || 'System'}</span>
                          </div>

                          {/* Details */}
                          {log.action_details && Object.keys(log.action_details).length > 0 && (
                            <div className="pt-2 border-t">
                              {formatActionDetails(log.action_details)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden sm:inline">Rows per page:</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
