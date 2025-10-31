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
import { useCheckInOutRecords, useDeleteCheckInOutRecord, useCompleteCheckInOutRecord, useGenerateCheckInOutPDF } from '@/hooks/useCheckInOutRecords';
import { useProperties } from '@/hooks/useProperties';
import { useUsersOptimized } from '@/hooks/useUsersOptimized';
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
} from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CheckInOutRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [recordToComplete, setRecordToComplete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(false);

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
  }), [propertyFilter, typeFilter, statusFilter, agentFilter]);

  const { data: records = [], isLoading } = useCheckInOutRecords(filters);
  const deleteMutation = useDeleteCheckInOutRecord();
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
      deleteMutation.mutate(recordToDelete, {
        onSuccess: () => {
          setRecordToDelete(null);
        },
      });
    }
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
        action={
          <Button
            onClick={handleCreate}
            className="bg-gradient-primary hover:bg-gradient-secondary w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('checkInOut.newRecord')}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">{t('checkInOut.stats.totalRecords')}</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  {records.length}
                </h3>
                <p className="text-xs text-purple-600 mt-1">
                  {t('checkInOut.stats.allRecords')}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">{t('checkInOut.stats.checkIns')}</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {records.filter(r => r.record_type === 'check_in').length}
                </h3>
                <p className="text-xs text-green-600 mt-1">
                  {records.filter(r => r.record_type === 'check_in' && r.status === 'completed').length} {t('checkInOut.stats.checkInsCompleted')}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <LogIn className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">{t('checkInOut.stats.checkOuts')}</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {records.filter(r => r.record_type === 'check_out').length}
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  {records.filter(r => r.record_type === 'check_out' && r.status === 'completed').length} {t('checkInOut.stats.checkOutsCompleted')}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <LogOut className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">{t('checkInOut.stats.completed')}</p>
                <h3 className="text-3xl font-bold text-amber-900 mt-1">
                  {records.filter(r => r.status === 'completed').length}
                </h3>
                <p className="text-xs text-amber-600 mt-1">
                  {records.filter(r => r.status === 'draft').length} {t('checkInOut.stats.pending')}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
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
                  <TableRow key={record.record_id}>
                    <TableCell>{getRecordTypeBadge(record.record_type)}</TableCell>
                    <TableCell>
                      {format(new Date(record.record_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.property?.property_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {record.property?.address}
                        </div>
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
                          <Button size="sm" variant="outline" asChild title="Download PDF">
                            <a href={record.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(record.record_id)}
                          title="Delete record"
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
