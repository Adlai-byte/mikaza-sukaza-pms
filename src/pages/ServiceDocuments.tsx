import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Wrench, FileCheck, FolderTree, List, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        icon={FolderOpen}
        title={t('serviceDocuments.title')}
        subtitle={t('serviceDocuments.subtitle')}
        actions={
          <div className="flex gap-2 self-start sm:self-auto">
            <Button
              onClick={() => refetch()}
              variant="outline"
              disabled={isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            {canManage && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('serviceDocuments.uploadDocument')}
              </Button>
            )}
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Wrench className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('serviceDocuments.stats.totalDocuments')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{serviceDocs.length}</h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('serviceDocuments.stats.recentUploads')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{recentDocs}</h3>
                  <span className="text-xs text-muted-foreground">{t('serviceDocuments.stats.last30Days')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('serviceDocuments.stats.categories')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{new Set(serviceDocs.flatMap(d => d.tags || [])).size}</h3>
                  <span className="text-xs text-muted-foreground">{t('serviceDocuments.stats.documentTypes')}</span>
                </div>
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
                  <span className="hidden sm:inline">{t('serviceDocuments.viewMode.treeView')}</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('serviceDocuments.viewMode.listView')}</span>
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
                  {t('serviceDocuments.uploadDocument')}
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
              emptyMessage={t('serviceDocuments.emptyState.treeViewMessage')}
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
