import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
  Key,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Building2,
  FolderTree,
  List,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  KeyRound,
  FileCheck,
  HelpCircle,
  Eye,
} from "lucide-react";
import { useAccessDocuments, useAccessDocumentDownload } from "@/hooks/useAccessDocuments";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { useProviders } from "@/hooks/useProviders";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { ACCESS_DOCUMENT_TYPES, type AccessDocument } from "@/lib/schemas";
import { format, parseISO } from "date-fns";
import { CasaSpinner } from "@/components/ui/casa-loader";
import { AddAccessDocumentDialog } from "@/components/access/AddAccessDocumentDialog";
import { format as formatDate } from "date-fns";

// Document type icons
const DOCUMENT_TYPE_ICONS = {
  access_card: CreditCard,
  code: KeyRound,
  key: Key,
  permit: FileCheck,
  other: HelpCircle,
};

// Status badge config
const STATUS_CONFIG = {
  active: { label: 'Active', icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200' },
  expiring_soon: { label: 'Expiring Soon', icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  expired: { label: 'Expired', icon: AlertTriangle, color: 'bg-red-100 text-red-800 border-red-200' },
};

export default function AccessAuthorizations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDocument, setEditDocument] = useState<AccessDocument | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<AccessDocument | null>(null);

  const { t } = useTranslation();

  // Hooks
  const { properties } = usePropertiesOptimized();
  const { providers: vendors } = useProviders('service');
  const { hasPermission } = usePermissions();
  const { downloadDocument } = useAccessDocumentDownload();

  const {
    documents,
    stats,
    isLoading,
    isFetching,
    refetch,
    deleteDocument,
    isDeleting,
  } = useAccessDocuments({
    property_id: selectedProperty || undefined,
    vendor_id: selectedVendor || undefined,
    document_type: selectedType || undefined,
    status: selectedStatus as 'active' | 'expiring_soon' | 'expired' | undefined,
  });

  // Permissions
  const canCreate = hasPermission(PERMISSIONS.DOCUMENTS_ACCESS_CREATE);
  const canEdit = hasPermission(PERMISSIONS.DOCUMENTS_ACCESS_CREATE);
  const canDelete = hasPermission(PERMISSIONS.DOCUMENTS_ACCESS_CREATE);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents;

    const lowerSearch = searchTerm.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.document_name?.toLowerCase().includes(lowerSearch) ||
        doc.description?.toLowerCase().includes(lowerSearch) ||
        doc.property_name?.toLowerCase().includes(lowerSearch) ||
        doc.vendor_name?.toLowerCase().includes(lowerSearch) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(lowerSearch))
    );
  }, [documents, searchTerm]);

  // Group documents by property for tree view
  const groupedDocuments = useMemo(() => {
    const groups: Record<string, AccessDocument[]> = {
      'No Property': [],
    };

    filteredDocuments.forEach(doc => {
      const key = doc.property_name || 'No Property';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(doc);
    });

    return groups;
  }, [filteredDocuments]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedProperty("");
    setSelectedVendor("");
    setSelectedType("");
    setSelectedStatus("");
  };

  const handleAddDocument = () => {
    setEditDocument(null);
    setDialogOpen(true);
  };

  const handleEditDocument = (doc: AccessDocument) => {
    setEditDocument(doc);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditDocument(null);
  };

  const handleDeleteClick = (doc: AccessDocument) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (documentToDelete) {
      await deleteDocument(documentToDelete.access_document_id);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  // Open document directly in new tab
  const handleViewDocument = (doc: AccessDocument) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusBadge = (status?: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {t(`accessDocuments.status.${status}`, config.label)}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const Icon = DOCUMENT_TYPE_ICONS[type as keyof typeof DOCUMENT_TYPE_ICONS] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  if (isLoading && !documents.length) {
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
        <PageHeader
          icon={Key}
          title={t('accessDocuments.title', 'Access Documents')}
          subtitle={t('accessDocuments.subtitle', 'Manage access cards, codes, keys, and permits for properties')}
          actions={
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                    {t('common.refresh', 'Refresh')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('accessDocuments.refreshTooltip', 'Refresh document list')}</p>
                </TooltipContent>
              </Tooltip>
              {canCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="bg-gradient-primary hover:bg-gradient-secondary w-full sm:w-auto"
                      onClick={handleAddDocument}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('accessDocuments.addDocument', 'Add Document')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('accessDocuments.addDocumentTooltip', 'Upload a new access document')}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
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
                  <p className="text-sm text-muted-foreground">{t('accessDocuments.stats.total', 'Total Documents')}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-semibold">{stats.total}</h3>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{t('accessDocuments.stats.active', 'Active')}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-semibold">{stats.active}</h3>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{t('accessDocuments.stats.expiringSoon', 'Expiring Soon')}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-semibold">{stats.expiringSoon}</h3>
                    <span className="text-xs text-muted-foreground">{t('accessDocuments.stats.next30Days', 'Next 30 days')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{t('accessDocuments.stats.expired', 'Expired')}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-semibold">{stats.expired}</h3>
                  </div>
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
              {t('accessDocuments.filters', 'Filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('accessDocuments.searchPlaceholder', 'Search documents...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedProperty || "all"} onValueChange={(val) => setSelectedProperty(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('accessDocuments.allProperties', 'All Properties')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accessDocuments.allProperties', 'All Properties')}</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id!}>
                      {property.property_name || property.property_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedVendor || "all"} onValueChange={(val) => setSelectedVendor(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('accessDocuments.allVendors', 'All Vendors')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accessDocuments.allVendors', 'All Vendors')}</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.provider_id} value={vendor.provider_id}>
                      {vendor.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType || "all"} onValueChange={(val) => setSelectedType(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('accessDocuments.allTypes', 'All Types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accessDocuments.allTypes', 'All Types')}</SelectItem>
                  {Object.entries(ACCESS_DOCUMENT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus || "all"} onValueChange={(val) => setSelectedStatus(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('accessDocuments.allStatuses', 'All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accessDocuments.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="active">{t('accessDocuments.status.active', 'Active')}</SelectItem>
                  <SelectItem value="expiring_soon">{t('accessDocuments.status.expiring_soon', 'Expiring Soon')}</SelectItem>
                  <SelectItem value="expired">{t('accessDocuments.status.expired', 'Expired')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchTerm || selectedProperty || selectedVendor || selectedType || selectedStatus) && (
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  {t('common.clearAllFilters', 'Clear all filters')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <span>{t('accessDocuments.tableTitle', 'Access Documents')}</span>
                  <Badge variant="outline">{filteredDocuments.length} {t('common.total', 'total')}</Badge>
                </CardTitle>
                <CardDescription className="mt-1.5">
                  {t('accessDocuments.tableDescription', 'View and manage all access-related documents')}
                </CardDescription>
              </div>

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'tree' | 'list')}>
                <TabsList>
                  <TabsTrigger value="list" className="gap-2">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('accessDocuments.viewMode.list', 'List')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="tree" className="gap-2">
                    <FolderTree className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('accessDocuments.viewMode.byProperty', 'By Property')}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <Key className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-lg font-semibold mb-2">{t('accessDocuments.emptyState.title', 'No documents found')}</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedProperty || selectedVendor || selectedType || selectedStatus
                    ? t('accessDocuments.emptyState.tryAdjusting', 'Try adjusting your filters')
                    : t('accessDocuments.emptyState.getStarted', 'Upload your first access document to get started')}
                </p>
                {canCreate && !searchTerm && !selectedProperty && (
                  <Button
                    className="bg-gradient-primary hover:bg-gradient-secondary"
                    onClick={handleAddDocument}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('accessDocuments.addDocument', 'Add Document')}
                  </Button>
                )}
              </div>
            ) : viewMode === 'tree' ? (
              // Tree view grouped by property
              <div className="space-y-4">
                {Object.entries(groupedDocuments).map(([propertyName, docs]) => (
                  docs.length > 0 && (
                    <div key={propertyName} className="border rounded-lg">
                      <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 font-medium">
                        <Building2 className="h-4 w-4" />
                        {propertyName}
                        <Badge variant="outline" className="ml-2">{docs.length}</Badge>
                      </div>
                      <div className="divide-y">
                        {docs.map((doc) => (
                          <div key={doc.access_document_id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                {getTypeIcon(doc.document_type)}
                              </div>
                              <div>
                                <p className="font-medium">{doc.document_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {ACCESS_DOCUMENT_TYPES[doc.document_type as keyof typeof ACCESS_DOCUMENT_TYPES]}
                                  {doc.vendor_name && ` • ${doc.vendor_name}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(doc.status)}
                              {doc.file_url && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc)}>
                                      <Eye className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('common.view', 'View')}</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => downloadDocument(doc)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('common.download', 'Download')}</TooltipContent>
                              </Tooltip>
                              {canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => handleEditDocument(doc)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('common.edit', 'Edit')}</TooltipContent>
                                </Tooltip>
                              )}
                              {canDelete && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(doc)}>
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('common.delete', 'Delete')}</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              // List view
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('accessDocuments.table.name', 'Name')}</TableHead>
                      <TableHead>{t('accessDocuments.table.type', 'Type')}</TableHead>
                      <TableHead>{t('accessDocuments.table.property', 'Property')}</TableHead>
                      <TableHead>{t('accessDocuments.table.vendor', 'Vendor')}</TableHead>
                      <TableHead>{t('accessDocuments.table.expiry', 'Expiry')}</TableHead>
                      <TableHead>{t('accessDocuments.table.status', 'Status')}</TableHead>
                      <TableHead className="text-right">{t('accessDocuments.table.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.access_document_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              {getTypeIcon(doc.document_type)}
                            </div>
                            <div>
                              <p className="font-medium">{doc.document_name}</p>
                              {doc.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ACCESS_DOCUMENT_TYPES[doc.document_type as keyof typeof ACCESS_DOCUMENT_TYPES]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {doc.property_name ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {doc.property_name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {doc.vendor_name || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {doc.expiry_date ? (
                            format(parseISO(doc.expiry_date), 'MMM dd, yyyy')
                          ) : (
                            <span className="text-muted-foreground">{t('accessDocuments.noExpiry', 'No expiry')}</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {doc.file_url && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc)}>
                                    <Eye className="h-4 w-4 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('common.view', 'View')}</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => downloadDocument(doc)}>
                                  <Download className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('common.download', 'Download')}</TooltipContent>
                            </Tooltip>
                            {canEdit && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleEditDocument(doc)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('common.edit', 'Edit')}</TooltipContent>
                              </Tooltip>
                            )}
                            {canDelete && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(doc)}>
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('common.delete', 'Delete')}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <AddAccessDocumentDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editDocument={editDocument}
          onSuccess={() => refetch()}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('accessDocuments.deleteDialog.title', 'Delete Document')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('accessDocuments.deleteDialog.description', 'Are you sure you want to delete this document? This action cannot be undone.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {t('common.delete', 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
