import React, { useState } from 'react';
import {
  DollarSign,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  FileText,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCommissions } from '@/hooks/useCommissions';
import { useInvoiceTips } from '@/hooks/useInvoiceTips';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';

export default function MyCommissions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch commissions for current user only
  const filters = {
    user_id: user?.id,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    source_type: selectedType !== 'all' ? selectedType : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const { commissions, loading: commissionsLoading } = useCommissions(filters);

  // Fetch tips where current user is recipient
  const { tips, loading: tipsLoading } = useInvoiceTips({
    recipient_user_id: user?.id
  });

  const loading = commissionsLoading || tipsLoading;

  // Calculate summary stats
  const stats = {
    totalEarnings: commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0),
    pending: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
    approved: commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
    paid: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
    tipsReceived: tips.reduce((sum, t) => sum + (t.tip_amount || 0), 0),
    tipsPending: tips.filter(t => t.status === 'pending').reduce((sum, t) => sum + (t.tip_amount || 0), 0),
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string; icon: React.ReactNode }> = {
      pending: {
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        label: t('commissions.status.pending'),
        icon: <Clock className="h-3 w-3" />,
      },
      approved: {
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
        label: t('commissions.status.approved'),
        icon: <CheckCircle className="h-3 w-3" />,
      },
      paid: {
        className: 'bg-green-100 text-green-800 hover:bg-green-200',
        label: t('commissions.status.paid'),
        icon: <CheckCircle className="h-3 w-3" />,
      },
      processed: {
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
        label: t('myCommissions.status.processed'),
        icon: <CheckCircle className="h-3 w-3" />,
      },
    };

    const config = variants[status] || variants.pending;

    return (
      <Badge className={cn('gap-1', config.className)}>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={DollarSign}
        title="My Earnings"
        subtitle={t('myCommissions.subtitle')}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">{t('myCommissions.summaryCards.totalEarnings')}</p>
                <h3 className="text-3xl font-bold text-emerald-900 mt-1">
                  ${(stats.totalEarnings + stats.tipsReceived).toFixed(2)}
                </h3>
                <div className="text-xs text-emerald-600 mt-1 space-y-0.5">
                  <div>{t('myCommissions.summaryCards.commissionsLabel')} ${stats.totalEarnings.toFixed(2)}</div>
                  <div>{t('myCommissions.summaryCards.tipsLabel')} ${stats.tipsReceived.toFixed(2)}</div>
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">{t('myCommissions.summaryCards.pendingApproval')}</p>
                <h3 className="text-3xl font-bold text-amber-900 mt-1">
                  ${(stats.pending + stats.tipsPending).toFixed(2)}
                </h3>
                <p className="text-xs text-amber-600 mt-1">
                  {commissions.filter(c => c.status === 'pending').length +
                   tips.filter(t => t.status === 'pending').length} {t('commissions.itemsCount')}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">{t('myCommissions.summaryCards.paidOut')}</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  ${stats.paid.toFixed(2)}
                </h3>
                <p className="text-xs text-green-600 mt-1">
                  {commissions.filter(c => c.status === 'paid').length} {t('myCommissions.summaryCards.payments')}
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
          <CardTitle>{t('myCommissions.filterEarnings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('myCommissions.type')}</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('myCommissions.allTypesPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('myCommissions.allTypes')}</SelectItem>
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

      {/* Tips Received */}
      {tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('myCommissions.tipsReceived.title')}</CardTitle>
            <CardDescription>{tips.length} {t('myCommissions.tipsReceived.count')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Guest Notes</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tips.map((tip) => (
                    <TableRow key={tip.tip_id}>
                      <TableCell>
                        {format(new Date(tip.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {tip.invoice?.invoice_number || 'N/A'}
                          </div>
                          <div className="text-muted-foreground">
                            {tip.invoice?.guest_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${tip.tip_amount.toFixed(2)}
                        {tip.tip_percentage && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({tip.tip_percentage}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {tip.tip_reason || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {tip.guest_notes || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(tip.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('myCommissions.commissionHistory.title')}</CardTitle>
          <CardDescription>
            {loading ? t('commissions.loading') : `${commissions.length} ${t('commissions.recordsCount')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Base Amount</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      {t('myCommissions.commissionHistory.loadingYourEarnings')}
                    </TableCell>
                  </TableRow>
                ) : commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('myCommissions.commissionHistory.noCommissionsFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions.map((commission) => (
                    <TableRow key={commission.commission_id}>
                      <TableCell>
                        {format(new Date(commission.earned_date), 'MMM dd, yyyy')}
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
