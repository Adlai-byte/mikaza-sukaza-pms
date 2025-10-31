import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  PlayCircle,
  PauseCircle,
  Eye,
  Edit,
  Trash2,
  Building2,
  User,
  Calendar as CalendarIcon,
  Shield,
  AlertTriangle,
  Download,
  FolderTree,
  List,
} from "lucide-react";
import { AccessAuthorizationTreeView } from "@/components/access/AccessAuthorizationTreeView";
import {
  useAccessAuthorizations,
  useTodayAccessAuthorizations,
  useUpcomingAccessAuthorizations,
} from "@/hooks/useAccessAuthorizations";
import { useProviders } from "@/hooks/useProviders";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { ACCESS_AUTH_STATUS, type AccessAuthorization } from "@/lib/schemas";
import { format, parseISO } from "date-fns";
import { CasaSpinner } from "@/components/ui/casa-loader";
import { AddAccessAuthorizationDialog } from "@/components/AddAccessAuthorizationDialog";
import { generateAccessAuthorizationPDF, type AccessAuthorizationData } from "@/lib/pdf-generator";

const STATUS_CONFIG = {
  requested: { label: 'Requested', icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Approved', icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200' },
  in_progress: { label: 'In Progress', icon: PlayCircle, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-gray-100 text-gray-800 border-gray-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200' },
  expired: { label: 'Expired', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800 border-orange-200' },
};

export default function AccessAuthorizations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAuth, setEditAuth] = useState<AccessAuthorization | null>(null);

  const { t } = useTranslation();

  // Hooks
  const { data: todayAccess = [] } = useTodayAccessAuthorizations();
  const { data: upcomingAccess = [] } = useUpcomingAccessAuthorizations(7);
  const { providers: vendors } = useProviders('service');
  const { properties } = usePropertiesOptimized();
  const { hasPermission } = usePermissions();

  const {
    authorizations,
    isLoading,
    refetch,
    approveAuthorization,
    markInProgress,
    completeAuthorization,
    cancelAuthorization,
    deleteAuthorization,
    isApproving,
    isMarkingInProgress,
    isCompleting,
    isCancelling,
    isDeleting,
  } = useAccessAuthorizations({
    vendor_id: selectedVendor || undefined,
    property_id: selectedProperty || undefined,
    status: selectedStatus || undefined,
  });

  // Permissions
  const canCreate = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_CREATE);
  const canEdit = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_EDIT);
  const canDelete = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_DELETE);

  // Filtered authorizations
  const filteredAuthorizations = useMemo(() => {
    if (!searchTerm) return authorizations;

    const lowerSearch = searchTerm.toLowerCase();
    return authorizations.filter(
      (auth) =>
        auth.vendor?.provider_name?.toLowerCase().includes(lowerSearch) ||
        auth.property?.property_name?.toLowerCase().includes(lowerSearch) ||
        auth.property?.property_type?.toLowerCase().includes(lowerSearch) ||
        auth.vendor_contact_name?.toLowerCase().includes(lowerSearch) ||
        auth.access_code?.toLowerCase().includes(lowerSearch)
    );
  }, [authorizations, searchTerm]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedVendor("");
    setSelectedProperty("");
    setSelectedStatus("");
  };

  const handleAddRequest = () => {
    setEditAuth(null);
    setDialogOpen(true);
  };

  const handleEditAuth = (auth: AccessAuthorization) => {
    setEditAuth(auth);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditAuth(null);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.requested;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {t(`accessAuthorizations.status.${status}`)}
      </Badge>
    );
  };

  const handleApprove = async (access_auth_id: string) => {
    if (confirm(t('accessAuthorizations.confirmations.approve'))) {
      await approveAuthorization(access_auth_id);
    }
  };

  const handleCheckIn = async (access_auth_id: string) => {
    if (confirm(t('accessAuthorizations.confirmations.checkIn'))) {
      await markInProgress(access_auth_id);
    }
  };

  const handleComplete = async (access_auth_id: string) => {
    const notes = prompt(t('accessAuthorizations.confirmations.completionNotes'));
    await completeAuthorization({ access_auth_id, completion_notes: notes || undefined });
  };

  const handleCancel = async (access_auth_id: string) => {
    if (confirm(t('accessAuthorizations.confirmations.cancel'))) {
      await cancelAuthorization(access_auth_id);
    }
  };

  const handleDelete = async (access_auth_id: string) => {
    if (confirm(t('accessAuthorizations.confirmations.delete'))) {
      await deleteAuthorization(access_auth_id);
    }
  };

  const handleDownloadPDF = async (auth: AccessAuthorization) => {
    try {
      const authData: AccessAuthorizationData = {
        ...auth,
        vendor: auth.vendor ? {
          provider_id: auth.vendor.provider_id,
          provider_name: auth.vendor.provider_name,
          contact_person: auth.vendor.contact_person,
          phone_primary: auth.vendor.phone_primary,
          email: auth.vendor.email,
        } : undefined,
        property: auth.property ? {
          property_id: auth.property.property_id,
          property_name: auth.property.property_name,
          property_type: auth.property.property_type,
        } : undefined,
        unit: auth.unit ? {
          unit_id: auth.unit.unit_id,
          property_name: auth.unit.property_name,
        } : undefined,
      };

      await generateAccessAuthorizationPDF(authData);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('accessAuthorizations.errors.pdfFailed'));
    }
  };

  if (isLoading && !authorizations.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <CasaSpinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <KeyRound className="h-7 w-7 text-primary" />
              {t('accessAuthorizations.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('accessAuthorizations.subtitle')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />{t('accessAuthorizations.refresh')}</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('accessAuthorizations.refreshTooltip')}</p>
              </TooltipContent>
            </Tooltip>
            {canCreate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="bg-gradient-primary hover:bg-gradient-secondary w-full sm:w-auto"
                    onClick={handleAddRequest}
                  >
                    <Plus className="h-4 w-4 mr-2" />{t('accessAuthorizations.requestAccess')}</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('accessAuthorizations.requestAccessTooltip')}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Today's Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">{t('accessAuthorizations.stats.todaysAccess')}</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">
                    {todayAccess.length}
                  </h3>
                  <p className="text-xs text-blue-600 mt-1">{t('accessAuthorizations.stats.scheduledForToday')}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">{t('accessAuthorizations.stats.upcomingSeven')}</p>
                  <h3 className="text-3xl font-bold text-green-900 mt-1">
                    {upcomingAccess.length}
                  </h3>
                  <p className="text-xs text-green-600 mt-1">{t('accessAuthorizations.stats.pendingApprovals')}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">{t('accessAuthorizations.stats.totalActive')}</p>
                  <h3 className="text-3xl font-bold text-purple-900 mt-1">
                    {authorizations.filter(a => ['requested', 'approved', 'in_progress'].includes(a.status)).length}
                  </h3>
                  <p className="text-xs text-purple-600 mt-1">{t('accessAuthorizations.stats.authorizations')}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <KeyRound className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('accessAuthorizations.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('accessAuthorizations.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedVendor || "all"} onValueChange={(val) => setSelectedVendor(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('accessAuthorizations.allVendors')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accessAuthorizations.allVendors')}</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.provider_id} value={vendor.provider_id}>
                      {vendor.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedProperty || "all"} onValueChange={(val) => setSelectedProperty(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('accessAuthorizations.allProperties')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accessAuthorizations.allProperties')}</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id}>
                      {property.property_name || property.property_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus || "all"} onValueChange={(val) => setSelectedStatus(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('accessAuthorizations.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accessAuthorizations.allStatuses')}</SelectItem>
                  {Object.entries(ACCESS_AUTH_STATUS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(searchTerm || selectedVendor || selectedProperty || selectedStatus) && (
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Access Authorizations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <span>{t('accessAuthorizations.tableTitle')}</span>
                  <Badge variant="outline">{filteredAuthorizations.length} total</Badge>
                </CardTitle>
                <CardDescription className="mt-1.5">
                  {t('accessAuthorizations.tableDescription')}
                </CardDescription>
              </div>

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'tree' | 'list')}>
                <TabsList>
                  <TabsTrigger value="tree" className="gap-2">
                    <FolderTree className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('accessAuthorizations.viewMode.treeView')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-2">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('accessAuthorizations.viewMode.listView')}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAuthorizations.length === 0 ? (
              <div className="text-center py-12">
                <KeyRound className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-lg font-semibold mb-2">{t('accessAuthorizations.emptyState.title')}</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedVendor || selectedProperty || selectedStatus
                    ? t('accessAuthorizations.emptyState.tryAdjusting')
                    : t('accessAuthorizations.emptyState.getStarted')}
                </p>
                {canCreate && !searchTerm && !selectedVendor && (
                  <Button
                    className="bg-gradient-primary hover:bg-gradient-secondary"
                    onClick={handleAddRequest}
                  >
                    <Plus className="h-4 w-4 mr-2" />{t('accessAuthorizations.requestAccess')}</Button>
                )}
              </div>
            ) : viewMode === 'tree' ? (
              <AccessAuthorizationTreeView
                authorizations={filteredAuthorizations}
                onEditAuth={canEdit ? handleEditAuth : undefined}
                canEdit={canEdit}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('accessAuthorizations.tableHeaders.vendor')}</TableHead>
                      <TableHead>{t('accessAuthorizations.tableHeaders.property')}</TableHead>
                      <TableHead>{t('accessAuthorizations.tableHeaders.accessDate')}</TableHead>
                      <TableHead>{t('accessAuthorizations.tableHeaders.timeWindow')}</TableHead>
                      <TableHead>{t('accessAuthorizations.tableHeaders.contact')}</TableHead>
                      <TableHead>{t('accessAuthorizations.tableHeaders.personnel')}</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>{t('accessAuthorizations.tableHeaders.coiValid')}</TableHead>
                      <TableHead className="text-right">{t('accessAuthorizations.tableHeaders.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuthorizations.map((auth) => {
                      const accessDate = parseISO(auth.access_date);
                      const isToday = format(accessDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                      return (
                        <TableRow key={auth.access_auth_id} className={isToday ? 'bg-blue-50' : ''}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {auth.vendor?.provider_name || 'Unknown Vendor'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {auth.property?.property_name || auth.property?.property_type || 'Unknown Property'}
                            {auth.unit && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({auth.unit.property_name})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {format(accessDate, 'MMM dd, yyyy')}
                              </span>
                              {isToday && (
                                <Badge variant="outline" className="text-xs w-fit bg-blue-100 text-blue-800">
                                  {t('accessAuthorizations.badges.today')}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {auth.access_time_start && auth.access_time_end ? (
                              <span className="text-sm">
                                {auth.access_time_start} - {auth.access_time_end}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic text-sm">{t('accessAuthorizations.badges.allDay')}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {auth.vendor_contact_name && (
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{auth.vendor_contact_name}</span>
                                {auth.vendor_contact_phone && (
                                  <span className="text-xs text-muted-foreground">{auth.vendor_contact_phone}</span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <User className="h-3 w-3 mr-1" />
                              {auth.number_of_personnel}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(auth.status)}</TableCell>
                          <TableCell>
                            {auth.coi ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <Shield className="h-3 w-3 mr-1" />
                                    {t('accessAuthorizations.badges.valid')}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{auth.coi.coverage_type} - Expires {format(parseISO(auth.coi.valid_through), 'MMM dd, yyyy')}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-600">
                                {t('accessAuthorizations.badges.noCOI')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Download PDF Button */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownloadPDF(auth)}
                                  >
                                    <Download className="h-4 w-4 text-blue-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('accessAuthorizations.actions.downloadPDF')}</p>
                                </TooltipContent>
                              </Tooltip>

                              {auth.status === 'requested' && canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleApprove(auth.access_auth_id)}
                                      disabled={isApproving}
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('accessAuthorizations.actions.approve')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {auth.status === 'approved' && canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCheckIn(auth.access_auth_id)}
                                      disabled={isMarkingInProgress}
                                    >
                                      <PlayCircle className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('accessAuthorizations.actions.checkIn')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {auth.status === 'in_progress' && canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleComplete(auth.access_auth_id)}
                                      disabled={isCompleting}
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('accessAuthorizations.actions.complete')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {['requested', 'approved'].includes(auth.status) && canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCancel(auth.access_auth_id)}
                                      disabled={isCancelling}
                                    >
                                      <XCircle className="h-4 w-4 text-orange-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('accessAuthorizations.actions.cancel')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditAuth(auth)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('accessAuthorizations.actions.edit')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {canDelete && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(auth.access_auth_id)}
                                      disabled={isDeleting}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('accessAuthorizations.actions.delete')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Access Authorization Dialog */}
        <AddAccessAuthorizationDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editAuth={editAuth}
        />
      </div>
    </TooltipProvider>
  );
}
