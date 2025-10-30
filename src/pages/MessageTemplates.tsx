import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, MessageSquare, Mail, Copy } from "lucide-react";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { useDocuments } from "@/hooks/useDocuments";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MessageTemplates() {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            Message Templates
          </h1>
          <p className="text-muted-foreground">
            Manage email templates, SMS messages, and communication documents
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
              Upload Template
            </Button>
          )}
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Copy className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Templates:</strong> Create reusable message templates for common communications like
          booking confirmations, check-in instructions, maintenance notices, and guest welcome messages.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-violet-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-700">Total Templates</p>
                <h3 className="text-3xl font-bold text-violet-900 mt-1">
                  {templates.length}
                </h3>
              </div>
              <div className="w-12 h-12 bg-violet-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-fuchsia-50 to-fuchsia-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fuchsia-700">Template Types</p>
                <h3 className="text-3xl font-bold text-fuchsia-900 mt-1">
                  {new Set(templates.flatMap(d => d.tags || [])).size}
                </h3>
                <p className="text-xs text-fuchsia-600 mt-1">Categories</p>
              </div>
              <div className="w-12 h-12 bg-fuchsia-500 rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Templates</span>
            <Badge variant="outline">{templates.length} total</Badge>
          </CardTitle>
          <CardDescription>
            Email templates, SMS messages, welcome letters, and automated communication documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">No Message Templates</h3>
              <p className="text-muted-foreground mb-4">
                Create reusable templates for common guest and vendor communications
              </p>
              {canManage && (
                <Button
                  className="bg-gradient-primary hover:bg-gradient-secondary"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Template
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
