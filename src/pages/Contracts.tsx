import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, FileText, Download, Trash2, Eye, Filter, FolderTree, List } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { DocumentTreeView, type TreeFolder } from "@/components/documents/DocumentTreeView";
import { useDocuments, useDocumentDownload } from "@/hooks/useDocuments";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONTRACT_TYPES, type DocumentSummary } from "@/lib/schemas";
import { markCategoryAsVisited } from "@/hooks/useExpiringDocumentsCount";

export default function Contracts() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [contractTypeFilter, setContractTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { downloadDocument } = useDocumentDownload();

  // Fetch contracts
  const {
    documents: contracts,
    isLoading,
    isFetching,
    refetch,
    deleteDocument,
  } = useDocuments({ category: 'contracts' });

  // Permission checks
  const canManage = hasPermission(PERMISSIONS.DOCUMENTS_CONTRACTS_MANAGE);

  // Mark contracts as visited when page loads
  useEffect(() => {
    markCategoryAsVisited('contracts');
  }, []);

  // Filter contracts by type
  const filteredContracts = useMemo(() => {
    if (contractTypeFilter === "all") return contracts;
    return contracts.filter(c => c.contract_type === contractTypeFilter);
  }, [contracts, contractTypeFilter]);

  // Stats for contracts
  const activeContracts = filteredContracts.filter(c => c.status === 'active').length;
  const expiringContracts = filteredContracts.filter(c => {
    if (!c.expiry_date) return false;
    const expiryDate = new Date(c.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
  }).length;

  // Count contracts by type
  const contractsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    contracts.forEach(contract => {
      const type = contract.contract_type || 'unspecified';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [contracts]);

  // Tree view folders
  const treeFolders: TreeFolder[] = useMemo(() => {
    return Object.entries(CONTRACT_TYPES).map(([key, label]) => ({
      id: key,
      name: label,
      metadata: { contractType: key },
    }));
  }, []);

  // Group documents by contract type
  const groupByContractType = (doc: DocumentSummary, folder: TreeFolder) => {
    return doc.contract_type === folder.metadata?.contractType;
  };

  const handleDownloadDocument = (document: DocumentSummary) => {
    downloadDocument(document);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={FileText}
        title={t('contracts.title')}
        subtitle={t('contracts.subtitle')}
        action={
          <div className="flex gap-2 self-start sm:self-auto">
            <Button
              onClick={() => refetch()}
              variant="outline"
              disabled={isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {t('contracts.refresh')}
            </Button>
            {canManage && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('contracts.uploadContract')}
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('contracts.filterByType')}</span>
            </div>
            <Select value={contractTypeFilter} onValueChange={setContractTypeFilter}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder={t('contracts.allContractTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('contracts.allContractTypes')} ({contracts.length})
                </SelectItem>
                {Object.entries(CONTRACT_TYPES).map(([value, label]) => {
                  const count = contractsByType[value] || 0;
                  return (
                    <SelectItem key={value} value={value}>
                      {label} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {contractTypeFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setContractTypeFilter("all")}
              >
                {t('contracts.clearFilter')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  {contractTypeFilter === "all" ? t('contracts.stats.totalContracts') : t('contracts.stats.filteredContracts')}
                </p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {filteredContracts.length}
                </h3>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">{t('contracts.stats.activeContracts')}</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {activeContracts}
                </h3>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">{t('contracts.stats.expiringSoon')}</p>
                <h3 className="text-3xl font-bold text-orange-900 mt-1">
                  {expiringContracts}
                </h3>
                <p className="text-xs text-orange-600 mt-1">{t('contracts.stats.next30Days')}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <span>
                  {contractTypeFilter === "all"
                    ? t('contracts.tableTitle.all')
                    : CONTRACT_TYPES[contractTypeFilter as keyof typeof CONTRACT_TYPES]}
                </span>
                <Badge variant="outline">{filteredContracts.length} {contractTypeFilter !== "all" ? t('contracts.tableTitle.filtered') : t('contracts.tableTitle.total')}</Badge>
              </CardTitle>
              <CardDescription className="mt-1.5">
                {contractTypeFilter === "all"
                  ? t('contracts.tableDescription.all')
                  : t('contracts.tableDescription.showing', { type: CONTRACT_TYPES[contractTypeFilter as keyof typeof CONTRACT_TYPES].toLowerCase() })}
              </CardDescription>
            </div>

            {/* View Mode Toggle */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'tree' | 'list')}>
              <TabsList>
                <TabsTrigger value="tree" className="gap-2">
                  <FolderTree className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('contracts.viewMode.treeView')}</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('contracts.viewMode.listView')}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">
                {contractTypeFilter === "all" ? t('contracts.emptyState.noContracts') : t('contracts.emptyState.noContractsOfType')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {contractTypeFilter === "all"
                  ? t('contracts.emptyState.getStarted')
                  : t('contracts.emptyState.noDocumentsFound', { type: CONTRACT_TYPES[contractTypeFilter as keyof typeof CONTRACT_TYPES].toLowerCase() })}
              </p>
              {canManage && contractTypeFilter === "all" && (
                <Button
                  className="bg-gradient-primary hover:bg-gradient-secondary"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('contracts.uploadContract')}
                </Button>
              )}
            </div>
          ) : viewMode === 'tree' ? (
            <DocumentTreeView
              documents={filteredContracts}
              folders={treeFolders}
              groupDocuments={groupByContractType}
              onDownloadDocument={handleDownloadDocument}
              onDeleteDocument={canManage ? deleteDocument : undefined}
              canDelete={canManage}
              emptyMessage={t('contracts.emptyState.emptyMessage')}
              emptyIcon={<FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />}
            />
          ) : (
            <DocumentsTable
              documents={filteredContracts}
              isLoading={isLoading}
              canDelete={canManage}
              canShare={true}
              onDelete={deleteDocument}
              showContractType={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        category="contracts"
        onSuccess={() => refetch()}
      />
    </div>
  );
}
