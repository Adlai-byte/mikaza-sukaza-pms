import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckInOutDialog } from '@/components/checkinout/CheckInOutDialog';
import { useCheckInOutRecords, useDeleteCheckInOutRecord, useCompleteCheckInOutRecord, useGenerateCheckInOutPDF, useRestoreCheckInOutRecord } from '@/hooks/useCheckInOutRecords';
import { useProperties } from '@/hooks/useProperties';
import { useUsersOptimized } from '@/hooks/useUsersOptimized';
import { useAuth } from '@/contexts/AuthContext';
import { CheckInOutRecord } from '@/lib/schemas';
import { formatUserDisplay } from '@/lib/user-display';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  LogIn,
  LogOut,
  DoorOpen,
  RefreshCw,
  RotateCcw,
  Archive,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { StatusBadge } from '@/components/StatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CheckInOut() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CheckInOutRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [recordToComplete, setRecordToComplete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(false);

  const isAdmin = profile?.user_type === 'admin';
  const { properties = [] } = useProperties();
  const { users: allUsers = [] } = useUsersOptimized();

  // Filter to show only ops and admin users
  const users = useMemo(() => {
    return allUsers.filter(u => u.user_type === 'ops' || u.user_type === 'admin');
  }, [allUsers]);

  const filters = useMemo(() => ({
    property_id: propertyFilter !== 'all' ? propertyFilter : undefined,
    record_type: (typeFilter !== 'all' ? typeFilter : undefined) as 'check_in' | 'check_out' | undefined,
    status: (statusFilter !== 'all' ? statusFilter : undefined) as 'draft' | 'completed' | 'archived' | undefined,
    agent_id: agentFilter !== 'all' ? agentFilter : undefined,
    include_deleted: showDeleted && isAdmin ? true : undefined,
  }), [propertyFilter, typeFilter, statusFilter, agentFilter, showDeleted, isAdmin]);

  const { data: records = [], isLoading, isFetching, refetch } = useCheckInOutRecords(filters);
  const deleteMutation = useDeleteCheckInOutRecord();
  const restoreMutation = useRestoreCheckInOutRecord();
  const completeMutation = useCompleteCheckInOutRecord();
  const generatePDFMutation = useGenerateCheckInOutPDF();

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;

    const query = searchQuery.toLowerCase();
    return records.filter(record =>
      record.resident_name?.toLowerCase().includes(query) ||
      record.property?.property_name?.toLowerCase().includes(query) ||
      record.agent?.first_name?.toLowerCase().includes(query) ||
      record.agent?.last_name?.toLowerCase().includes(query)
    );
  }, [records, searchQuery]);

  const handleCreate = () => {
    setSelectedRecord(null);
    setViewMode(false);
    setDialogOpen(true);
  };

  const handleView = (record: CheckInOutRecord) => {
    setSelectedRecord(record);
    setViewMode(true);
    setDialogOpen(true);
  };

  const handleEdit = (record: CheckInOutRecord) => {
    setSelectedRecord(record);
    setViewMode(false);
    setDialogOpen(true);
  };

  const handleDelete = (recordId: string) => {
    setRecordToDelete(recordId);
  };

  const confirmDelete = () => {
    if (recordToDelete) {
      deleteMutation.mutate(
        { recordId: recordToDelete, userId: profile?.user_id },
        {
          onSuccess: () => {
            setRecordToDelete(null);
          },
        }
      );
    }
  };

  const handleRestore = (recordId: string) => {
    restoreMutation.mutate(recordId);
  };

  const handleComplete = (recordId: string) => {
    setRecordToComplete(recordId);
  };

  const confirmComplete = () => {
    if (recordToComplete) {
      completeMutation.mutate(recordToComplete, {
        onSuccess: () => {
          setRecordToComplete(null);
        },
      });
    }
  };

  const handleGeneratePDF = (recordId: string) => {
    generatePDFMutation.mutate(recordId);
  };

  const getRecordTypeIcon = (type: string) => {
    return type === 'check_in' ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />;
  };

  const getRecordTypeBadge = (type: string) => {
    return type === 'check_in' ? (
      <Badge variant="default" className="bg-green-500">
        <LogIn className="h-3 w-3 mr-1" />
        {t('checkInOut.types.checkIn')}
      </Badge>
    ) : (
      <Badge variant="default" className="bg-blue-500">
        <LogOut className="h-3 w-3 mr-1" />
        {t('checkInOut.types.checkOut')}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: t('checkInOut.status.draft') },
      completed: { variant: 'default' as const, label: t('checkInOut.status.completed') },
      archived: { variant: 'outline' as const, label: t('checkInOut.status.archived') },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return <StatusBadge status={config.label} variant={config.variant} />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        icon={DoorOpen}
        title={t('checkInOut.title')}
        subtitle={t('checkInOut.subtitle')}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-gradient-primary hover:bg-gradient-secondary w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('checkInOut.newRecord')}
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('checkInOut.stats.totalRecords')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{records.length}</h3>
                  <span className="text-xs text-muted-foreground">{t('checkInOut.stats.allRecords')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <LogIn className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('checkInOut.stats.checkIns')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{records.filter(r => r.record_type === 'check_in').length}</h3>
                  <span className="text-xs text-muted-foreground">{records.filter(r => r.record_type === 'check_in' && r.status === 'completed').length} {t('checkInOut.stats.checkInsCompleted')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('checkInOut.stats.checkOuts')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{records.filter(r => r.record_type === 'check_out').length}</h3>
                  <span className="text-xs text-muted-foreground">{records.filter(r => r.record_type === 'check_out' && r.status === 'completed').length} {t('checkInOut.stats.checkOutsCompleted')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('checkInOut.stats.completed')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{records.filter(r => r.status === 'completed').length}</h3>
                  <span className="text-xs text-muted-foreground">{records.filter(r => r.status === 'draft').length} {t('checkInOut.stats.pending')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t('checkInOut.filters.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('checkInOut.filters.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('checkInOut.filters.allProperties')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('checkInOut.filters.allProperties')}</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.property_id} value={property.property_id}>
                    {property.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('checkInOut.filters.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('checkInOut.filters.allTypes')}</SelectItem>
                <SelectItem value="check_in">{t('checkInOut.types.checkIn')}</SelectItem>
                <SelectItem value="check_out">{t('checkInOut.types.checkOut')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('checkInOut.filters.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('checkInOut.filters.allStatuses')}</SelectItem>
                <SelectItem value="draft">{t('checkInOut.status.draft')}</SelectItem>
                <SelectItem value="completed">{t('checkInOut.status.completed')}</SelectItem>
                <SelectItem value="archived">{t('checkInOut.status.archived')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('checkInOut.filters.allAgents')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('checkInOut.filters.allAgents')}</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id!}>
                    {formatUserDisplay(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Admin-only: Show deleted records toggle */}
            {isAdmin && (
              <div className="flex items-center space-x-2 px-2 py-1 border rounded-md bg-muted/30">
                <Checkbox
                  id="showDeleted"
                  checked={showDeleted}
                  onCheckedChange={(checked) => setShowDeleted(!!checked)}
                />
                <Label htmlFor="showDeleted" className="text-sm cursor-pointer flex items-center gap-1">
                  <Archive className="h-4 w-4" />
                  {t('checkInOut.filters.showDeleted', 'Show Deleted')}
                </Label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('checkInOut.table.type')}</TableHead>
                <TableHead>{t('checkInOut.table.date')}</TableHead>
                <TableHead>{t('checkInOut.table.property')}</TableHead>
                <TableHead>{t('checkInOut.table.resident')}</TableHead>
                <TableHead>{t('checkInOut.table.agent')}</TableHead>
                <TableHead>{t('checkInOut.table.status')}</TableHead>
                <TableHead>{t('checkInOut.table.signature')}</TableHead>
                <TableHead className="text-right">{t('checkInOut.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {t('checkInOut.table.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {t('checkInOut.table.noRecords')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow
                    key={record.record_id}
                    className={record.deleted_at ? 'opacity-60 bg-red-50/50' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRecordTypeBadge(record.record_type)}
                        {record.deleted_at && (
                          <Badge variant="destructive" className="text-xs">
                            {t('checkInOut.status.deleted', 'Deleted')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.record_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.property?.property_name}</div>
                        {record.booking ? (
                          <div className="text-xs text-blue-600 flex items-center gap-1">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                            Booking: {record.booking.guest_name}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            {record.property?.address}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.resident_name}</div>
                        {record.resident_contact && (
                          <div className="text-xs text-muted-foreground">
                            {record.resident_contact}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.agent ? formatUserDisplay(record.agent) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>
                      {record.signature_data ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('checkInOut.table.signed')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          {t('checkInOut.table.pending')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {record.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleComplete(record.record_id)}
                            disabled={!record.signature_data}
                            title={!record.signature_data ? t('checkInOut.actions.signatureRequired') : t('checkInOut.actions.markComplete')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleView(record)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(record)}
                          title="Edit record"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {record.pdf_url ? (
                          <>
                            <Button size="sm" variant="outline" asChild title="Download PDF">
                              <a href={record.pdf_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGeneratePDF(record.record_id)}
                              disabled={generatePDFMutation.isPending}
                              title="Regenerate PDF"
                            >
                              <RefreshCw className={`h-4 w-4 ${generatePDFMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGeneratePDF(record.record_id)}
                            disabled={generatePDFMutation.isPending}
                            title="Generate PDF Report"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {record.deleted_at ? (
                          // Restore button for deleted records (admin only)
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(record.record_id)}
                            disabled={restoreMutation.isPending}
                            title={t('checkInOut.actions.restore', 'Restore record')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <RotateCcw className={`h-4 w-4 ${restoreMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                        ) : (
                          // Delete button for active records
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(record.record_id)}
                            title={t('checkInOut.actions.delete', 'Delete record')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <CheckInOutDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedRecord(null);
          setViewMode(false);
        }}
        record={selectedRecord}
        viewMode={viewMode}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('checkInOut.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('checkInOut.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('checkInOut.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('checkInOut.deleteDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirmation */}
      <AlertDialog open={!!recordToComplete} onOpenChange={() => setRecordToComplete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Check-In/Out Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this record as completed? This will generate a PDF report and finalize the record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmComplete}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Complete & Generate PDF
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
