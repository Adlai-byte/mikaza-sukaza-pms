import { useState, useMemo, useEffect } from "react";
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
        {status.replace('_', ' ')}
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
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Vendor Insurance (COI)
            </h1>
            <p className="text-muted-foreground">
              Manage vendor certificates of insurance and compliance tracking
            </p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh COI data</p>
              </TooltipContent>
            </Tooltip>
            {canCreate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="bg-gradient-primary hover:bg-gradient-secondary w-full sm:w-auto"
                    onClick={handleAddCOI}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add COI
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upload new vendor certificate of insurance</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Active COIs</p>
                  <h3 className="text-3xl font-bold text-green-900 mt-1">
                    {statsLoading ? '...' : stats?.active_cois || 0}
                  </h3>
                  <p className="text-xs text-green-600 mt-1">Current & valid</p>
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
                  <p className="text-sm font-medium text-yellow-700">Expiring Soon</p>
                  <h3 className="text-3xl font-bold text-yellow-900 mt-1">
                    {statsLoading ? '...' : stats?.expiring_soon || 0}
                  </h3>
                  <p className="text-xs text-yellow-600 mt-1">Within 30 days</p>
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
                  <p className="text-sm font-medium text-red-700">Expired</p>
                  <h3 className="text-3xl font-bold text-red-900 mt-1">
                    {statsLoading ? '...' : stats?.expired_cois || 0}
                  </h3>
                  <p className="text-xs text-red-600 mt-1">Requires renewal</p>
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
                  <p className="text-sm font-medium text-blue-700">Vendors Covered</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">
                    {statsLoading ? '...' : stats?.vendors_with_cois || 0}
                  </h3>
                  <p className="text-xs text-blue-600 mt-1">With insurance</p>
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
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search COIs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedVendor || "all"} onValueChange={(val) => setSelectedVendor(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.provider_id} value={vendor.provider_id}>
                      {vendor.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedProperty || "all"} onValueChange={(val) => setSelectedProperty(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id}>
                      {property.property_name || property.property_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCoverageType || "all"} onValueChange={(val) => setSelectedCoverageType(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Coverage Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Coverage Types</SelectItem>
                  {Object.entries(COI_COVERAGE_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus || "all"} onValueChange={(val) => setSelectedStatus(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
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
                  <span>Certificates of Insurance</span>
                  <Badge variant="outline">{filteredCOIs.length} total</Badge>
                </CardTitle>
                <CardDescription className="mt-1.5">
                  View and manage all vendor insurance certificates
                </CardDescription>
              </div>

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'tree' | 'list')}>
                <TabsList>
                  <TabsTrigger value="tree" className="gap-2">
                    <FolderTree className="h-4 w-4" />
                    <span className="hidden sm:inline">Tree View</span>
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-2">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">List View</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCOIs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No COIs Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedVendor || selectedProperty || selectedCoverageType || selectedStatus
                    ? 'Try adjusting your filters'
                    : 'Get started by adding your first vendor certificate of insurance'}
                </p>
                {canCreate && !searchTerm && !selectedVendor && (
                  <Button
                    className="bg-gradient-primary hover:bg-gradient-secondary"
                    onClick={handleAddCOI}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First COI
                  </Button>
                )}
              </div>
            ) : viewMode === 'tree' ? (
              <COITreeView
                cois={filteredCOIs}
                onEditCOI={canEdit ? handleEditCOI : undefined}
                onDeleteCOI={canDelete ? handleDelete : undefined}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Coverage Type</TableHead>
                      <TableHead>Policy Number</TableHead>
                      <TableHead>Insurance Company</TableHead>
                      <TableHead>Coverage Amount</TableHead>
                      <TableHead>Valid Through</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                                  {daysUntilExpiry} days left
                                </span>
                              )}
                              {isExpired && (
                                <span className="text-xs text-red-600 font-medium">
                                  Expired {Math.abs(daysUntilExpiry)} days ago
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(coi.status)}</TableCell>
                          <TableCell>
                            {coi.property?.property_type ? (
                              <span className="text-sm">{coi.property.property_type}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">All properties</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {coi.verified_at ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Verified {format(parseISO(coi.verified_at), 'MMM dd, yyyy')}</p>
                                  {coi.verified_user && <p>By: {coi.verified_user.first_name} {coi.verified_user.last_name}</p>}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-600">
                                Not verified
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
                                    <p>Verify COI</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

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
                                    <p>Edit COI</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {canDelete && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this COI?')) {
                                          deleteCOI(coi.coi_id);
                                        }
                                      }}
                                      disabled={isDeleting}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete COI</p>
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
      </div>
    </TooltipProvider>
  );
}
