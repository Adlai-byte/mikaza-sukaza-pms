import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Shield,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  Upload,
  Building2,
  FolderTree,
  List,
  Eye,
} from "lucide-react";
import { COITreeView } from "@/components/coi/COITreeView";
import { useVendorCOIs, useExpiringCOIs } from "@/hooks/useVendorCOIs";
import { useCOIDashboardStats } from "@/hooks/useCOIDashboardStats";
import { useProviders } from "@/hooks/useProviders";
import { markCategoryAsVisited } from "@/hooks/useExpiringDocumentsCount";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { COI_COVERAGE_TYPES, COI_STATUS, type VendorCOI } from "@/lib/schemas";
import { format, parseISO, differenceInDays } from "date-fns";
import { CasaSpinner } from "@/components/ui/casa-loader";
import { useSearchParams } from "react-router-dom";
import { AddCOIDialog } from "@/components/AddCOIDialog";
import { FileViewerDialog, FileViewerDocument } from "@/components/ui/file-viewer-dialog";

export default function VendorCOIs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';

  // Mark COI category as visited when page loads
  useEffect(() => {
    markCategoryAsVisited('coi');
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedCoverageType, setSelectedCoverageType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>(statusFilter);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCOI, setEditCOI] = useState<VendorCOI | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [coiToDelete, setCoiToDelete] = useState<string | null>(null);
  const [viewingCOI, setViewingCOI] = useState<FileViewerDocument | null>(null);

  const { t } = useTranslation();

  // Hooks
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useCOIDashboardStats();
  const { data: expiringCOIs = [] } = useExpiringCOIs(30);
  const { providers: vendors } = useProviders('service');
  const { properties } = usePropertiesOptimized();
  const { hasPermission } = usePermissions();

  const {
    cois,
    isLoading,
    refetch,
    deleteCOI,
    verifyCOI,
    uploadCOIFile,
    isDeleting,
    isVerifying,
  } = useVendorCOIs({
    vendor_id: selectedVendor || undefined,
    property_id: selectedProperty || undefined,
    status: selectedStatus || undefined,
    coverage_type: selectedCoverageType || undefined,
  });

  // Permissions
  const canCreate = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_CREATE);
  const canEdit = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_EDIT);
  const canDelete = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_DELETE);

  // Filtered COIs
  const filteredCOIs = useMemo(() => {
    if (!searchTerm) return cois;

    const lowerSearch = searchTerm.toLowerCase();
    return cois.filter(
      (coi) =>
        coi.vendor?.provider_name?.toLowerCase().includes(lowerSearch) ||
        coi.policy_number?.toLowerCase().includes(lowerSearch) ||
        coi.insurance_company?.toLowerCase().includes(lowerSearch)
    );
  }, [cois, searchTerm]);

  const handleRefresh = () => {
    refetch();
    refetchStats();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedVendor("");
    setSelectedProperty("");
    setSelectedCoverageType("");
    setSelectedStatus("");
    setSearchParams({});
  };

  const handleAddCOI = () => {
    setEditCOI(null);
    setDialogOpen(true);
  };

  const handleEditCOI = (coi: VendorCOI) => {
    setEditCOI(coi);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditCOI(null);
  };

  const handleDelete = useCallback((coiId: string) => {
    setCoiToDelete(coiId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (coiToDelete) {
      deleteCOI(coiToDelete);
    }
    setDeleteDialogOpen(false);
    setCoiToDelete(null);
  }, [coiToDelete, deleteCOI]);

  const handleDownloadCOI = (coi: VendorCOI) => {
    if (coi.file_url) {
      const link = document.createElement('a');
      link.href = coi.file_url;
      link.download = coi.file_name || `COI_${coi.policy_number}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleViewCOI = (coi: VendorCOI) => {
    if (!coi.file_url) return;
    setViewingCOI({
      url: coi.file_url,
      name: `COI - ${coi.policy_number}`,
      fileName: coi.file_name || `coi_${coi.policy_number}.pdf`,
      description: `${COI_COVERAGE_TYPES[coi.coverage_type as keyof typeof COI_COVERAGE_TYPES] || coi.coverage_type} coverage from ${coi.insurance_company}`,
      metadata: {
        vendor: coi.vendor?.provider_name || 'Unknown',
        policy_number: coi.policy_number,
        insurance_company: coi.insurance_company,
        coverage_type: COI_COVERAGE_TYPES[coi.coverage_type as keyof typeof COI_COVERAGE_TYPES] || coi.coverage_type,
        coverage_amount: `$${coi.coverage_amount.toLocaleString()}`,
        valid_from: format(parseISO(coi.valid_from), "MMM d, yyyy"),
        valid_through: format(parseISO(coi.valid_through), "MMM d, yyyy"),
        status: coi.status,
        verified: coi.verified_at ? `Yes (${format(parseISO(coi.verified_at), "MMM d, yyyy")})` : 'No',
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      expiring_soon: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      expired: 'bg-red-100 text-red-800 border-red-200',
      renewed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const icons = {
      active: CheckCircle2,
      expiring_soon: Clock,
      expired: XCircle,
      renewed: RefreshCw,
      cancelled: XCircle,
    };

    const Icon = icons[status as keyof typeof icons] || FileText;

    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles] || ''}>
        <Icon className="h-3 w-3 mr-1" />
        {t(`vendorCOIs.status.${status}`)}
      </Badge>
    );
  };

  const getDaysUntilExpiry = (validThrough: string) => {
    return differenceInDays(parseISO(validThrough), new Date());
  };

  if (isLoading && !cois.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <CasaSpinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        <PageHeader
          title={t('vendorCOIs.title')}
          subtitle={t('vendorCOIs.subtitle')}
          icon={Shield}
          actions={
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    {t('vendorCOIs.refresh')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('vendorCOIs.refreshTooltip')}</p>
                </TooltipContent>
              </Tooltip>
              {canCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="bg-gradient-primary hover:bg-gradient-secondary"
                      onClick={handleAddCOI}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('vendorCOIs.addCOI')}
                    </Button>
                  </TooltipTrigger>
                <TooltipContent>
                  <p>{t('vendorCOIs.addCOITooltip')}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        }
      />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">{t('vendorCOIs.stats.activeCOIs')}</p>
                  <h3 className="text-3xl font-bold text-green-900 mt-1">
                    {statsLoading ? '...' : stats?.active_cois || 0}
                  </h3>
                  <p className="text-xs text-green-600 mt-1">{t('vendorCOIs.stats.currentValid')}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">{t('vendorCOIs.stats.expiringSoon')}</p>
                  <h3 className="text-3xl font-bold text-yellow-900 mt-1">
                    {statsLoading ? '...' : stats?.expiring_soon || 0}
                  </h3>
                  <p className="text-xs text-yellow-600 mt-1">{t('vendorCOIs.stats.within30Days')}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">{t('vendorCOIs.stats.expired')}</p>
                  <h3 className="text-3xl font-bold text-red-900 mt-1">
                    {statsLoading ? '...' : stats?.expired_cois || 0}
                  </h3>
                  <p className="text-xs text-red-600 mt-1">{t('vendorCOIs.stats.requiresRenewal')}</p>
                </div>
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">{t('vendorCOIs.stats.vendorsCovered')}</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">
                    {statsLoading ? '...' : stats?.vendors_with_cois || 0}
                  </h3>
                  <p className="text-xs text-blue-600 mt-1">{t('vendorCOIs.stats.withInsurance')}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
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
              {t('vendorCOIs.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('vendorCOIs.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedVendor || "all"} onValueChange={(val) => setSelectedVendor(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('vendorCOIs.allVendors')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('vendorCOIs.allVendors')}</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.provider_id} value={vendor.provider_id}>
                      {vendor.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedProperty || "all"} onValueChange={(val) => setSelectedProperty(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('vendorCOIs.allProperties')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('vendorCOIs.allProperties')}</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id}>
                      {property.property_name || property.property_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCoverageType || "all"} onValueChange={(val) => setSelectedCoverageType(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('vendorCOIs.allCoverageTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('vendorCOIs.allCoverageTypes')}</SelectItem>
                  {Object.entries(COI_COVERAGE_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus || "all"} onValueChange={(val) => setSelectedStatus(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('vendorCOIs.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('vendorCOIs.allStatuses')}</SelectItem>
                  {Object.entries(COI_STATUS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(searchTerm || selectedVendor || selectedProperty || selectedCoverageType || selectedStatus) && (
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* COI Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <span>{t('vendorCOIs.tableTitle')}</span>
                  <Badge variant="outline">{filteredCOIs.length} total</Badge>
                </CardTitle>
                <CardDescription className="mt-1.5">
                  {t('vendorCOIs.tableDescription')}
                </CardDescription>
              </div>

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'tree' | 'list')}>
                <TabsList>
                  <TabsTrigger value="tree" className="gap-2">
                    <FolderTree className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('vendorCOIs.viewMode.treeView')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-2">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('vendorCOIs.viewMode.listView')}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCOIs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-lg font-semibold mb-2">{t('vendorCOIs.emptyState.title')}</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedVendor || selectedProperty || selectedCoverageType || selectedStatus
                    ? t('vendorCOIs.emptyState.tryAdjusting')
                    : t('vendorCOIs.emptyState.getStarted')}
                </p>
                {canCreate && !searchTerm && !selectedVendor && (
                  <Button
                    className="bg-gradient-primary hover:bg-gradient-secondary"
                    onClick={handleAddCOI}
                  >
                    <Plus className="h-4 w-4 mr-2" />{t('vendorCOIs.emptyState.addFirstCOI')}</Button>
                )}
              </div>
            ) : viewMode === 'tree' ? (
              <COITreeView
                cois={filteredCOIs}
                onEditCOI={canEdit ? handleEditCOI : undefined}
                onDeleteCOI={canDelete ? handleDelete : undefined}
                onDownloadCOI={handleDownloadCOI}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('vendorCOIs.tableHeaders.vendor')}</TableHead>
                      <TableHead>{t('vendorCOIs.tableHeaders.coverageType')}</TableHead>
                      <TableHead>{t('vendorCOIs.tableHeaders.policyNumber')}</TableHead>
                      <TableHead>{t('vendorCOIs.tableHeaders.insuranceCompany')}</TableHead>
                      <TableHead>{t('vendorCOIs.tableHeaders.coverageAmount')}</TableHead>
                      <TableHead>{t('vendorCOIs.tableHeaders.validThrough')}</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>{t('vendorCOIs.tableHeaders.property')}</TableHead>
                      <TableHead>{t('vendorCOIs.tableHeaders.verified')}</TableHead>
                      <TableHead className="text-right">{t('vendorCOIs.tableHeaders.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCOIs.map((coi) => {
                      const daysUntilExpiry = getDaysUntilExpiry(coi.valid_through);
                      const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
                      const isExpired = daysUntilExpiry < 0;

                      return (
                        <TableRow key={coi.coi_id} className={isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-yellow-50' : ''}>
                          <TableCell className="font-medium">
                            {coi.vendor?.provider_name || 'Unknown Vendor'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {COI_COVERAGE_TYPES[coi.coverage_type as keyof typeof COI_COVERAGE_TYPES] || coi.coverage_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {coi.policy_number}
                          </TableCell>
                          <TableCell>{coi.insurance_company}</TableCell>
                          <TableCell className="font-semibold">
                            ${coi.coverage_amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{format(parseISO(coi.valid_through), 'MMM dd, yyyy')}</span>
                              {isExpiringSoon && !isExpired && (
                                <span className="text-xs text-yellow-600 font-medium">
                                  {daysUntilExpiry} {t('vendorCOIs.badges.daysLeft')}
                                </span>
                              )}
                              {isExpired && (
                                <span className="text-xs text-red-600 font-medium">
                                  {t('vendorCOIs.badges.expiredDaysAgo', { days: Math.abs(daysUntilExpiry) })}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(coi.status)}</TableCell>
                          <TableCell>
                            {coi.property?.property_type ? (
                              <span className="text-sm">{coi.property.property_type}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">{t('vendorCOIs.badges.allProperties')}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {coi.verified_at ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {t('vendorCOIs.badges.verified')}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Verified {format(parseISO(coi.verified_at), 'MMM dd, yyyy')}</p>
                                  {coi.verified_user && <p>By: {coi.verified_user.first_name} {coi.verified_user.last_name}</p>}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-600">
                                {t('vendorCOIs.badges.notVerified')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!coi.verified_at && canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => verifyCOI(coi.coi_id)}
                                      disabled={isVerifying}
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('vendorCOIs.actions.verify')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {coi.file_url && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewCOI(coi)}
                                    >
                                      <Eye className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('vendorCOIs.actions.view', 'View')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownloadCOI(coi)}
                                    disabled={!coi.file_url}
                                  >
                                    <Download className="h-4 w-4 text-blue-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('vendorCOIs.actions.download')}</p>
                                </TooltipContent>
                              </Tooltip>

                              {canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditCOI(coi)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('vendorCOIs.actions.edit')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {canDelete && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(coi.coi_id)}
                                      disabled={isDeleting}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('vendorCOIs.actions.delete')}</p>
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

        {/* Add/Edit COI Dialog */}
        <AddCOIDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editCOI={editCOI}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('vendorCOIs.confirmations.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('vendorCOIs.confirmations.deleteDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* COI Viewer Dialog */}
        <FileViewerDialog
          document={viewingCOI}
          open={!!viewingCOI}
          onOpenChange={(open) => !open && setViewingCOI(null)}
        />
      </div>
    </TooltipProvider>
  );
}
