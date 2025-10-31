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
  useCommissionSummary,
} from '@/hooks/useCommissions';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useUsers } from '@/hooks/useUsers';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Commissions() {
  const { t } = useTranslation();
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
  const { summary } = useCommissionSummary(selectedUser !== 'all' ? selectedUser : undefined);
  const deleteCommission = useDeleteCommission();
  const approveCommission = useApproveCommission();
  const markAsPaid = useMarkCommissionAsPaid();

  const handleDelete = (commissionId: string) => {
    if (confirm(t('commissions.deleteConfirm'))) {
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
        label: t('commissions.status.pending'),
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      },
      approved: {
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3" />,
        label: t('commissions.status.approved'),
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      },
      paid: {
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3" />,
        label: t('commissions.status.paid'),
        className: 'bg-green-100 text-green-800 hover:bg-green-200',
      },
      cancelled: {
        variant: 'destructive',
        icon: <XCircle className="h-3 w-3" />,
        label: t('commissions.status.cancelled'),
        className: 'bg-red-100 text-red-800 hover:bg-red-200',
      },
      on_hold: {
        variant: 'outline',
        icon: <Clock className="h-3 w-3" />,
        label: t('commissions.status.on_hold'),
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

  // Filter staff members who are eligible for commissions (ops_staff, property_manager)
  const staffUsers = users.filter(u =>
    ['ops_staff', 'property_manager', 'admin'].includes(u.user_type || '')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            {t('commissions.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('commissions.subtitle')}
          </p>
        </div>
        <Button size="lg" disabled>
          <Plus className="h-4 w-4 mr-2" />
          {t('commissions.addCommission')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">{t('commissions.totalCommissions')}</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  ${stats.totalAmount.toFixed(2)}
                </h3>
                <p className="text-xs text-purple-600 mt-1">{stats.total} {t('commissions.commissionsCount')}</p>
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
                <p className="text-sm font-medium text-yellow-700">{t('commissions.pending')}</p>
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
                <p className="text-sm font-medium text-blue-700">{t('commissions.approved')}</p>
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
                <p className="text-sm font-medium text-green-700">{t('commissions.paidOut')}</p>
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
      </div>

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
              <Label>{t('commissions.staffMember')}</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder={t('commissions.allStaffPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('commissions.allStaff')}</SelectItem>
                  {staffUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id!}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('commissions.property')}</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder={t('commissions.allPropertiesPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('commissions.allProperties')}</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id!}>
                      {property.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('commissions.status.label')}</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t('commissions.status.allPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('commissions.status.all')}</SelectItem>
                  <SelectItem value="pending">{t('commissions.status.pending')}</SelectItem>
                  <SelectItem value="approved">{t('commissions.status.approved')}</SelectItem>
                  <SelectItem value="paid">{t('commissions.status.paid')}</SelectItem>
                  <SelectItem value="cancelled">{t('commissions.status.cancelled')}</SelectItem>
                  <SelectItem value="on_hold">{t('commissions.status.on_hold')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('commissions.sourceType.label')}</Label>
              <Select value={selectedSourceType} onValueChange={setSelectedSourceType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('commissions.sourceType.allPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('commissions.sourceType.all')}</SelectItem>
                  <SelectItem value="booking">{t('commissions.sourceType.booking')}</SelectItem>
                  <SelectItem value="invoice">{t('commissions.sourceType.invoice')}</SelectItem>
                  <SelectItem value="service">{t('commissions.sourceType.service')}</SelectItem>
                  <SelectItem value="tip">{t('commissions.sourceType.tip')}</SelectItem>
                  <SelectItem value="referral">{t('commissions.sourceType.referral')}</SelectItem>
                  <SelectItem value="bonus">{t('commissions.sourceType.bonus')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('commissions.dateFrom')}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('commissions.dateTo')}</Label>
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
          <CardTitle>{t('commissions.commissionRecords')}</CardTitle>
          <CardDescription>
            {loading ? t('commissions.loading') : `${commissions.length} ${t('commissions.recordsCount')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('commissions.tableHeaders.date')}</TableHead>
                  <TableHead>{t('commissions.tableHeaders.staffMember')}</TableHead>
                  <TableHead>{t('commissions.tableHeaders.source')}</TableHead>
                  <TableHead>{t('commissions.tableHeaders.type')}</TableHead>
                  <TableHead className="text-right">{t('commissions.tableHeaders.baseAmount')}</TableHead>
                  <TableHead className="text-right">{t('commissions.tableHeaders.rate')}</TableHead>
                  <TableHead className="text-right">{t('commissions.tableHeaders.commission')}</TableHead>
                  <TableHead>{t('commissions.tableHeaders.status')}</TableHead>
                  <TableHead>{t('commissions.tableHeaders.paymentDate')}</TableHead>
                  <TableHead className="text-right">{t('commissions.tableHeaders.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      {t('commissions.loadingCommissions')}
                    </TableCell>
                  </TableRow>
                ) : commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {t('commissions.noCommissionsFound')}
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

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('commissions.paymentDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('commissions.paymentDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('commissions.paymentDialog.paymentMethod')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder={t('commissions.paymentDialog.selectPaymentMethod')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">{t('commissions.paymentDialog.paymentMethods.bank_transfer')}</SelectItem>
                  <SelectItem value="cash">{t('commissions.paymentDialog.paymentMethods.cash')}</SelectItem>
                  <SelectItem value="check">{t('commissions.paymentDialog.paymentMethods.check')}</SelectItem>
                  <SelectItem value="paypal">{t('commissions.paymentDialog.paymentMethods.paypal')}</SelectItem>
                  <SelectItem value="other">{t('commissions.paymentDialog.paymentMethods.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('commissions.paymentDialog.paymentReference')}</Label>
              <Input
                placeholder={t('commissions.paymentDialog.paymentReferencePlaceholder')}
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('commissions.paymentDialog.paymentDate')}</Label>
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
                    <span className="text-muted-foreground">{t('commissions.paymentDialog.staff')}</span>
                    <span className="font-medium">
                      {selectedCommission.user?.first_name} {selectedCommission.user?.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('commissions.paymentDialog.commissionAmount')}</span>
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
