import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Wrench, FileCheck } from "lucide-react";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { useDocuments } from "@/hooks/useDocuments";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Badge } from "@/components/ui/badge";

export default function ServiceDocuments() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { hasPermission } = usePermissions();

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
            Manage vendor agreements, work orders, service reports, and completion certificates
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
                <p className="text-sm font-medium text-emerald-700">Total Documents</p>
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
                <p className="text-sm font-medium text-teal-700">Recent Uploads</p>
                <h3 className="text-3xl font-bold text-teal-900 mt-1">
                  {recentDocs}
                </h3>
                <p className="text-xs text-teal-600 mt-1">Last 30 days</p>
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
                <p className="text-sm font-medium text-cyan-700">Categories</p>
                <h3 className="text-3xl font-bold text-cyan-900 mt-1">
                  {new Set(serviceDocs.flatMap(d => d.tags || [])).size}
                </h3>
                <p className="text-xs text-cyan-600 mt-1">Document types</p>
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
          <CardTitle className="flex items-center justify-between">
            <span>All Service Documents</span>
            <Badge variant="outline">{serviceDocs.length} total</Badge>
          </CardTitle>
          <CardDescription>
            Vendor agreements, work orders, inspection reports, and completion certificates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serviceDocs.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">No Service Documents</h3>
              <p className="text-muted-foreground mb-4">
                Upload vendor agreements, work orders, and service reports
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
