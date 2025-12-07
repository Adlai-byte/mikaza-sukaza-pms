import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Users, Shield, List, FolderTree, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { EmployeeDocumentTree } from "@/components/documents/EmployeeDocumentTree";
import { useDocuments, useDocumentDownload } from "@/hooks/useDocuments";
import { useUsers } from "@/hooks/useUsers";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CasaSpinner } from "@/components/ui/casa-loader";
import type { DocumentSummary } from "@/lib/schemas";
import { useTranslation } from "react-i18next";

export default function EmployeeDocuments() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { downloadDocument } = useDocumentDownload();

  // Fetch employee documents
  const {
    documents: employeeDocs,
    isLoading,
    isFetching,
    refetch,
    deleteDocument,
  } = useDocuments({ category: 'employee' });

  // Fetch users for folder structure
  const { users: allUsers = [], loading: usersLoading } = useUsers();

  // Filter to show only active employees (Ops and Admin)
  // Note: user_type enum is: "admin" | "ops" | "provider" | "customer"
  const users = allUsers.filter(user =>
    user.is_active &&
    user.user_type &&
    ['ops', 'admin'].includes(user.user_type)
  );

  // Permission checks
  const canManage = hasPermission(PERMISSIONS.DOCUMENTS_EMPLOYEE_MANAGE);

  const handleDownloadDocument = (document: DocumentSummary) => {
    downloadDocument(document);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Briefcase}
        title={t('employeeDocuments.title')}
        subtitle={t('employeeDocuments.subtitle')}
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
                {t('employeeDocuments.uploadDocument')}
              </Button>
            )}
          </div>
        }
      />

      {/* Privacy Notice */}
      <Alert className="border-orange-200 bg-orange-50">
        <Shield className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>{t('employeeDocuments.privacyNotice.confidential')}</strong> {t('employeeDocuments.privacyNotice.message')}
          {t('employeeDocuments.privacyNotice.accessRestricted')}
        </AlertDescription>
      </Alert>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">{t('employeeDocuments.stats.totalDocuments')}</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  {employeeDocs.length}
                </h3>
                <p className="text-xs text-purple-600 mt-1">{t('employeeDocuments.stats.employeeFiles')}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">{t('employeeDocuments.stats.documentTypes')}</p>
                <h3 className="text-3xl font-bold text-indigo-900 mt-1">
                  {new Set(employeeDocs.map(d => d.tags || []).flat()).size}
                </h3>
                <p className="text-xs text-indigo-600 mt-1">{t('employeeDocuments.stats.categories')}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <span>{t('employeeDocuments.allEmployeeDocuments')}</span>
                <Badge variant="outline">{employeeDocs.length} {t('employeeDocuments.total')}</Badge>
              </CardTitle>
              <CardDescription className="mt-1.5">
                {t('employeeDocuments.description')}
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
          {employeeDocs.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">{t('employeeDocuments.emptyState.title')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('employeeDocuments.emptyState.message')}
                <br />
                <span className="text-sm">{t('employeeDocuments.emptyState.tagHint')}</span>
              </p>
              {canManage && (
                <Button
                  className="bg-gradient-primary hover:bg-gradient-secondary"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('employeeDocuments.uploadDocument')}
                </Button>
              )}
            </div>
          ) : viewMode === 'tree' ? (
            usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <CasaSpinner className="h-8 w-8" />
              </div>
            ) : (
              <EmployeeDocumentTree
                documents={employeeDocs}
                users={users}
                onDownloadDocument={handleDownloadDocument}
                onDeleteDocument={canManage ? deleteDocument : undefined}
                canDelete={canManage}
              />
            )
          ) : (
            <DocumentsTable
              documents={employeeDocs}
              isLoading={isLoading}
              canDelete={canManage}
              canShare={false} // Employee docs should not be shared
              onDelete={deleteDocument}
            />
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        category="employee"
        onSuccess={() => refetch()}
      />
    </div>
  );
}
