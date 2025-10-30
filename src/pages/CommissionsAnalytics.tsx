import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  TrendingUp,
  Users,
  Eye,
  Trash2,
  FileText,
  Award,
  BarChart3,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCommissions,
  useDeleteCommission,
  useApproveCommission,
  useMarkCommissionAsPaid,
  useCommissionAnalytics,
} from '@/hooks/useCommissions';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useUsers } from '@/hooks/useUsers';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function CommissionsAnalytics() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Build filters
  const filters = {
    user_id: selectedUser !== 'all' ? selectedUser : undefined,
    property_id: selectedProperty !== 'all' ? selectedProperty : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    source_type: selectedSourceType !== 'all' ? selectedSourceType : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const { commissions, loading } = useCommissions(filters);
  const { properties } = usePropertiesOptimized();
  const { users } = useUsers();
  const { analytics, loading: analyticsLoading } = useCommissionAnalytics(filters);
  const deleteCommission = useDeleteCommission();
  const approveCommission = useApproveCommission();
  const markAsPaid = useMarkCommissionAsPaid();

  const handleDelete = (commissionId: string) => {
    if (confirm('Are you sure you want to delete this commission?')) {
      deleteCommission.mutate(commissionId);
    }
  };

  const handleApprove = (commissionId: string) => {
    approveCommission.mutate(commissionId);
  };

  const handleOpenPaymentDialog = (commission: any) => {
    setSelectedCommission(commission);
    setPaymentMethod('');
    setPaymentReference('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentDialogOpen(true);
  };

  const handleMarkAsPaid = () => {
    if (!selectedCommission) return;

    markAsPaid.mutate({
      commissionId: selectedCommission.commission_id,
      paymentMethod,
      paymentReference,
      paymentDate,
    }, {
      onSuccess: () => {
        setPaymentDialogOpen(false);
        setSelectedCommission(null);
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: React.ReactNode; label: string; className: string }> = {
      pending: {
        variant: 'secondary',
        icon: <Clock className="h-3 w-3" />,
        label: 'Pending',
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      },
      approved: {
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Approved',
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      },
      paid: {
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Paid',
        className: 'bg-green-100 text-green-800 hover:bg-green-200',
      },
      cancelled: {
        variant: 'destructive',
        icon: <XCircle className="h-3 w-3" />,
        label: 'Cancelled',
        className: 'bg-red-100 text-red-800 hover:bg-red-200',
      },
      on_hold: {
        variant: 'outline',
        icon: <Clock className="h-3 w-3" />,
        label: 'On Hold',
        className: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      },
    };

    const config = variants[status] || variants.pending;

    return (
      <Badge variant={config.variant} className={cn('gap-1', config.className)}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getSourceTypeIcon = (sourceType: string) => {
    const icons: Record<string, React.ReactNode> = {
      booking: <Calendar className="h-4 w-4" />,
      invoice: <FileText className="h-4 w-4" />,
      service: <TrendingUp className="h-4 w-4" />,
      tip: <DollarSign className="h-4 w-4" />,
      referral: <Users className="h-4 w-4" />,
      bonus: <TrendingUp className="h-4 w-4" />,
    };

    return icons[sourceType] || <DollarSign className="h-4 w-4" />;
  };

  // Calculate summary stats
  const stats = {
    total: commissions.length,
    totalAmount: commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0),
    pending: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
    approved: commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
    paid: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
    staffCount: new Set(commissions.map(c => c.user_id)).size,
  };

  // Filter staff members who are eligible for commissions
  const staffUsers = users.filter(u =>
    ['ops_staff', 'property_manager', 'admin'].includes(u.user_type || '')
  );

  // Format monthly trend data for chart
  const monthlyTrendData = analytics?.monthlyTrend.map(item => ({
    month: format(new Date(item.month + '-01'), 'MMM yy'),
    amount: item.total_amount,
    count: item.count,
  })) || [];

  // Format source type data for pie chart
  const sourceTypeData = analytics?.bySourceType.map(item => ({
    name: item.source_type.charAt(0).toUpperCase() + item.source_type.slice(1),
    value: item.total_amount,
    count: item.count,
  })) || [];

  // Format top performers for bar chart
  const topPerformersData = analytics?.topPerformers.slice(0, 5).map(item => ({
    name: item.name || 'Unknown',
    amount: item.total_commissions,
    count: item.commission_count,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Commission Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Performance insights and staff commission management
          </p>
        </div>
        <Button size="lg" disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Commission
        </Button>
      </div>

      {/* Performance Insight - Better Performance Message */}
      {analytics && analytics.topPerformers.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Award className="h-5 w-5" />
              Performance Insight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-800">
              <strong>More Commissions = Better Performance!</strong> Your top performers are driving higher earnings.
              {analytics.topPerformers[0] && (
                <>
                  {' '}<strong>{analytics.topPerformers[0].name}</strong> is leading with{' '}
                  <strong>${analytics.topPerformers[0].total_commissions.toFixed(2)}</strong> from{' '}
                  <strong>{analytics.topPerformers[0].commission_count}</strong> commission(s).
                </>
              )}
              {' '}Keep up the great work!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Commissions</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  ${stats.totalAmount.toFixed(2)}
                </h3>
                <p className="text-xs text-purple-600 mt-1">{stats.total} commissions</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Pending</p>
                <h3 className="text-3xl font-bold text-yellow-900 mt-1">
                  ${stats.pending.toFixed(2)}
                </h3>
                <p className="text-xs text-yellow-600 mt-1">
                  {commissions.filter(c => c.status === 'pending').length} items
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Approved</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  ${stats.approved.toFixed(2)}
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  {commissions.filter(c => c.status === 'approved').length} items
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Paid Out</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  ${stats.paid.toFixed(2)}
                </h3>
                <p className="text-xs text-green-600 mt-1">
                  {commissions.filter(c => c.status === 'paid').length} items
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">Active Staff</p>
                <h3 className="text-3xl font-bold text-indigo-900 mt-1">
                  {analytics?.totalStaff || 0}
                </h3>
                <p className="text-xs text-indigo-600 mt-1">
                  Avg: ${(analytics?.performanceMetrics.avg_commission_per_staff || 0).toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="data">Commission Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Commission Trend</CardTitle>
                <CardDescription>Commission earnings over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Total Amount ($)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No trend data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Source Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Commission Sources</CardTitle>
                <CardDescription>Breakdown by commission source type</CardDescription>
              </CardHeader>
              <CardContent>
                {sourceTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sourceTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No source data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Avg Time to Payment</p>
                    <h3 className="text-3xl font-bold text-orange-900 mt-1">
                      {(analytics?.performanceMetrics.avg_time_to_payment || 0).toFixed(1)} days
                    </h3>
                    <p className="text-xs text-orange-600 mt-1">From approval to payout</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-teal-50 to-teal-100 hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-teal-700">Conversion Rate</p>
                    <h3 className="text-3xl font-bold text-teal-900 mt-1">
                      {(analytics?.performanceMetrics.conversion_rate || 0).toFixed(1)}%
                    </h3>
                    <p className="text-xs text-teal-600 mt-1">Approved or paid commissions</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-pink-50 to-pink-100 hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-pink-700">Avg per Staff Member</p>
                    <h3 className="text-3xl font-bold text-pink-900 mt-1">
                      ${(analytics?.performanceMetrics.avg_commission_per_staff || 0).toFixed(2)}
                    </h3>
                    <p className="text-xs text-pink-600 mt-1">Average earnings per person</p>
                  </div>
                  <div className="w-12 h-12 bg-pink-500 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Performers</CardTitle>
              <CardDescription>Staff members with highest commission earnings</CardDescription>
            </CardHeader>
            <CardContent>
              {topPerformersData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topPerformersData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="amount" fill="#8884d8" name="Total Earnings ($)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No performer data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Performers Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Performers</CardTitle>
              <CardDescription>Complete staff performance ranking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Commissions</TableHead>
                      <TableHead className="text-right">Total Earned</TableHead>
                      <TableHead className="text-right">Avg per Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.topPerformers && analytics.topPerformers.length > 0 ? (
                      analytics.topPerformers.map((performer, index) => (
                        <TableRow key={performer.user_id}>
                          <TableCell>
                            <Badge variant={index < 3 ? 'default' : 'outline'}>
                              #{index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{performer.name}</TableCell>
                          <TableCell className="capitalize">
                            {performer.role.replace('_', ' ')}
                          </TableCell>
                          <TableCell className="text-right">{performer.commission_count}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ${performer.total_commissions.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            ${performer.avg_commission.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No performance data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>Staff Member</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="All staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {staffUsers.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id!}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All properties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.property_id} value={property.property_id!}>
                          {property.property_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Source Type</Label>
                  <Select value={selectedSourceType} onValueChange={setSelectedSourceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="booking">Booking</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="tip">Tip</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commissions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Records</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `${commissions.length} commission record(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Base Amount</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          Loading commissions...
                        </TableCell>
                      </TableRow>
                    ) : commissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No commissions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      commissions.map((commission) => (
                        <TableRow key={commission.commission_id}>
                          <TableCell>
                            {format(new Date(commission.earned_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {commission.user?.first_name} {commission.user?.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {commission.user?.user_type?.replace('_', ' ')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getSourceTypeIcon(commission.source_type)}
                              <span className="capitalize">{commission.source_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{commission.commission_type}</TableCell>
                          <TableCell className="text-right">
                            ${commission.base_amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {commission.commission_rate ? `${commission.commission_rate}%` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${commission.commission_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusBadge(commission.status)}</TableCell>
                          <TableCell>
                            {commission.payment_date
                              ? format(new Date(commission.payment_date), 'MMM dd, yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              {commission.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApprove(commission.commission_id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              )}
                              {commission.status === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleOpenPaymentDialog(commission)}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Mark Paid
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(commission.commission_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Commission as Paid</DialogTitle>
            <DialogDescription>
              Record payment details for this commission
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Reference</Label>
              <Input
                placeholder="Transaction ID or reference number"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            {selectedCommission && (
              <div className="p-4 bg-muted rounded-md">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Staff:</span>
                    <span className="font-medium">
                      {selectedCommission.user?.first_name} {selectedCommission.user?.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission Amount:</span>
                    <span className="font-semibold text-lg">
                      ${selectedCommission.commission_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
