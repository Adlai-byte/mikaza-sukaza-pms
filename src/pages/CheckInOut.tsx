import React, { useState, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckInOutDialog } from '@/components/checkinout/CheckInOutDialog';
import { useCheckInOutRecords, useDeleteCheckInOutRecord, useCompleteCheckInOutRecord } from '@/hooks/useCheckInOutRecords';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CheckInOutRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  const { data: properties = [] } = useProperties();
  const { data: users = [] } = useUsersOptimized({ user_types: ['ops', 'admin'] });

  const filters = useMemo(() => ({
    property_id: propertyFilter !== 'all' ? propertyFilter : undefined,
    record_type: (typeFilter !== 'all' ? typeFilter : undefined) as 'check_in' | 'check_out' | undefined,
    status: (statusFilter !== 'all' ? statusFilter : undefined) as 'draft' | 'completed' | 'archived' | undefined,
    agent_id: agentFilter !== 'all' ? agentFilter : undefined,
  }), [propertyFilter, typeFilter, statusFilter, agentFilter]);

  const { data: records = [], isLoading } = useCheckInOutRecords(filters);
  const deleteMutation = useDeleteCheckInOutRecord();
  const completeMutation = useCompleteCheckInOutRecord();

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
    setDialogOpen(true);
  };

  const handleEdit = (record: CheckInOutRecord) => {
    setSelectedRecord(record);
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
    completeMutation.mutate(recordId);
  };

  const getRecordTypeIcon = (type: string) => {
    return type === 'check_in' ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />;
  };

  const getRecordTypeBadge = (type: string) => {
    return type === 'check_in' ? (
      <Badge variant="default" className="bg-green-500">
        <LogIn className="h-3 w-3 mr-1" />
        Check-In
      </Badge>
    ) : (
      <Badge variant="default" className="bg-blue-500">
        <LogOut className="h-3 w-3 mr-1" />
        Check-Out
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Draft' },
      completed: { variant: 'default' as const, label: 'Completed' },
      archived: { variant: 'outline' as const, label: 'Archived' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return <StatusBadge status={config.label} variant={config.variant} />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Check-In / Check-Out</h1>
          <p className="text-muted-foreground mt-1">
            Manage property check-ins and check-outs with digital signatures
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-gradient-primary hover:bg-gradient-secondary w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Record
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Records</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  {records.length}
                </h3>
                <p className="text-xs text-purple-600 mt-1">
                  All check-in/out records
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
                <p className="text-sm font-medium text-green-700">Check-Ins</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {records.filter(r => r.record_type === 'check_in').length}
                </h3>
                <p className="text-xs text-green-600 mt-1">
                  {records.filter(r => r.record_type === 'check_in' && r.status === 'completed').length} completed
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
                <p className="text-sm font-medium text-blue-700">Check-Outs</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {records.filter(r => r.record_type === 'check_out').length}
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  {records.filter(r => r.record_type === 'check_out' && r.status === 'completed').length} completed
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
                <p className="text-sm font-medium text-amber-700">Completed</p>
                <h3 className="text-3xl font-bold text-amber-900 mt-1">
                  {records.filter(r => r.status === 'completed').length}
                </h3>
                <p className="text-xs text-amber-600 mt-1">
                  {records.filter(r => r.status === 'draft').length} pending
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
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.property_id} value={property.property_id}>
                    {property.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="check_in">Check-In</SelectItem>
                <SelectItem value="check_out">Check-Out</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
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
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Resident</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signature</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading records...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No check-in/out records found
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
                          Signed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Pending
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
                            title={!record.signature_data ? 'Signature required' : 'Mark as completed'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {record.pdf_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={record.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(record.record_id)}
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
        }}
        record={selectedRecord}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this check-in/out record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
