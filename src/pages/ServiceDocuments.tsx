import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Wrench, FileCheck, FolderTree, List } from "lucide-react";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { DocumentTreeView, type TreeFolder } from "@/components/documents/DocumentTreeView";
import { useDocuments, useDocumentDownload } from "@/hooks/useDocuments";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DocumentSummary } from "@/lib/schemas";
import { useTranslation } from "react-i18next";

export default function ServiceDocuments() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { downloadDocument } = useDocumentDownload();

  // Fetch service documents
  const {
    documents: serviceDocs,
    isLoading,
    isFetching,
    refetch,
    deleteDocument,
  } = useDocuments({ category: 'service' });

  // Permission checks
  const canManage = hasPermission(PERMISSIONS.DOCUMENTS_SERVICE_MANAGE);

  // Calculate stats
  const recentDocs = serviceDocs.filter(d => {
    const createdAt = new Date(d.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdAt >= thirtyDaysAgo;
  }).length;

  // Tree view folders - create folders based on unique tags
  const treeFolders: TreeFolder[] = useMemo(() => {
    const allTags = new Set<string>();
    serviceDocs.forEach(doc => {
      if (doc.tags && Array.isArray(doc.tags)) {
        doc.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags)
      .sort()
      .map(tag => ({
        id: tag,
        name: tag.charAt(0).toUpperCase() + tag.slice(1).replace(/_/g, ' '),
        metadata: { tag },
      }));
  }, [serviceDocs]);

  // Group documents by tag
  const groupByTag = (doc: DocumentSummary, folder: TreeFolder) => {
    return doc.tags?.includes(folder.metadata?.tag) || false;
  };

  const handleDownloadDocument = (document: DocumentSummary) => {
    downloadDocument(document);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-7 w-7 text-primary" />
            Service Documents
          </h1>
          <p className="text-muted-foreground">
            {t('serviceDocuments.subtitle')}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManage && (
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">{t('serviceDocuments.stats.totalDocuments')}</p>
                <h3 className="text-3xl font-bold text-emerald-900 mt-1">
                  {serviceDocs.length}
                </h3>
              </div>
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Wrench className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-teal-50 to-teal-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-700">{t('serviceDocuments.stats.recentUploads')}</p>
                <h3 className="text-3xl font-bold text-teal-900 mt-1">
                  {recentDocs}
                </h3>
                <p className="text-xs text-teal-600 mt-1">{t('serviceDocuments.stats.last30Days')}</p>
              </div>
              <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-cyan-50 to-cyan-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-700">{t('serviceDocuments.stats.categories')}</p>
                <h3 className="text-3xl font-bold text-cyan-900 mt-1">
                  {new Set(serviceDocs.flatMap(d => d.tags || [])).size}
                </h3>
                <p className="text-xs text-cyan-600 mt-1">{t('serviceDocuments.stats.documentTypes')}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Documents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <span>{t('serviceDocuments.allServiceDocuments')}</span>
                <Badge variant="outline">{serviceDocs.length} {t('documents.common.total')}</Badge>
              </CardTitle>
              <CardDescription className="mt-1.5">
                {t('serviceDocuments.description')}
              </CardDescription>
            </div>

            {/* View Mode Toggle */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'tree' | 'list')}>
              <TabsList>
                <TabsTrigger value="tree" className="gap-2">
                  <FolderTree className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('employeeDocuments.viewMode.treeView')}</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('employeeDocuments.viewMode.listView')}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {serviceDocs.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">{t('serviceDocuments.emptyState.title')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('serviceDocuments.emptyState.message')}
              </p>
              {canManage && (
                <Button
                  className="bg-gradient-primary hover:bg-gradient-secondary"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              )}
            </div>
          ) : viewMode === 'tree' ? (
            <DocumentTreeView
              documents={serviceDocs}
              folders={treeFolders}
              groupDocuments={groupByTag}
              onDownloadDocument={handleDownloadDocument}
              onDeleteDocument={canManage ? deleteDocument : undefined}
              canDelete={canManage}
              emptyMessage="No service documents found. Tag documents to organize them in tree view."
              emptyIcon={<Wrench className="h-12 w-12 mx-auto mb-4 opacity-20" />}
            />
          ) : (
            <DocumentsTable
              documents={serviceDocs}
              isLoading={isLoading}
              canDelete={canManage}
              canShare={true}
              onDelete={deleteDocument}
            />
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        category="service"
        onSuccess={() => refetch()}
      />
    </div>
  );
}
