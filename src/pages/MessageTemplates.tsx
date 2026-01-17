import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, MessageSquare, Mail, Copy } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { useDocuments } from "@/hooks/useDocuments";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MessageTemplates() {
  const { t } = useTranslation();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { hasPermission } = usePermissions();

  // Fetch message templates
  const {
    documents: templates,
    isLoading,
    isFetching,
    refetch,
    deleteDocument,
  } = useDocuments({ category: 'messages' });

  // Permission checks
  const canManage = hasPermission(PERMISSIONS.DOCUMENTS_MESSAGES_MANAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Mail}
        title={t('messageTemplates.title')}
        subtitle={t('messageTemplates.subtitle')}
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
                {t('messageTemplates.uploadTemplate')}
              </Button>
            )}
          </div>
        }
      />

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Copy className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>{t('messageTemplates.infoTitle')}</strong> {t('messageTemplates.infoDescription')}
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('messageTemplates.stats.totalTemplates')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{templates.length}</h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('messageTemplates.stats.templateTypes')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{new Set(templates.flatMap(d => d.tags || [])).size}</h3>
                  <span className="text-xs text-muted-foreground">{t('messageTemplates.stats.categories')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('messageTemplates.allTemplates')}</span>
            <Badge variant="outline">{templates.length} {t('messageTemplates.total')}</Badge>
          </CardTitle>
          <CardDescription>
            {t('messageTemplates.tableDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">{t('messageTemplates.noTemplates')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('messageTemplates.noTemplatesDescription')}
              </p>
              {canManage && (
                <Button
                  className="bg-gradient-primary hover:bg-gradient-secondary"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('messageTemplates.uploadTemplate')}
                </Button>
              )}
            </div>
          ) : (
            <DocumentsTable
              documents={templates}
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
        category="messages"
        onSuccess={() => refetch()}
      />
    </div>
  );
}
