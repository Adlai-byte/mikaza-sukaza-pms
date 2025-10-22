import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, FileText, Users, Key, Building2, Wrench, MessageSquare } from "lucide-react";
import { DocumentStats } from "@/components/documents/DocumentStats";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { useDocuments } from "@/hooks/useDocuments";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { DOCUMENT_CATEGORIES } from "@/lib/schemas";

export default function Documents() {
  const [activeTab, setActiveTab] = useState<string>('contracts');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { hasPermission } = usePermissions();

  // Fetch documents for active category
  const {
    documents,
    isLoading,
    isFetching,
    refetch,
    deleteDocument,
  } = useDocuments({ category: activeTab });

  // Permission checks for each category
  const canManageContracts = hasPermission(PERMISSIONS.DOCUMENTS_CONTRACTS_MANAGE);
  const canManageEmployee = hasPermission(PERMISSIONS.DOCUMENTS_EMPLOYEE_MANAGE);
  const canCreateAccess = hasPermission(PERMISSIONS.DOCUMENTS_ACCESS_CREATE);
  const canManageCOI = hasPermission(PERMISSIONS.DOCUMENTS_COI_MANAGE);
  const canManageService = hasPermission(PERMISSIONS.DOCUMENTS_SERVICE_MANAGE);
  const canManageMessages = hasPermission(PERMISSIONS.DOCUMENTS_MESSAGES_MANAGE);

  // Check if user can upload in current category
  const canUpload = () => {
    switch (activeTab) {
      case 'contracts':
        return canManageContracts;
      case 'employee':
        return canManageEmployee;
      case 'access':
        return canCreateAccess;
      case 'coi':
        return canManageCOI;
      case 'service':
        return canManageService;
      case 'messages':
        return canManageMessages;
      default:
        return false;
    }
  };

  // Check if user can delete in current category
  const canDelete = () => {
    switch (activeTab) {
      case 'contracts':
        return canManageContracts;
      case 'employee':
        return canManageEmployee;
      case 'coi':
        return canManageCOI;
      case 'service':
        return canManageService;
      case 'messages':
        return canManageMessages;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Manage contracts, employee documents, authorizations, and templates
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
          {canUpload() && (
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <DocumentStats />

      {/* Document Categories Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Contracts</span>
          </TabsTrigger>
          <TabsTrigger value="employee" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Employee</span>
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">Access</span>
          </TabsTrigger>
          <TabsTrigger value="coi" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">COIs</span>
          </TabsTrigger>
          <TabsTrigger value="service" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Service</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
        </TabsList>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{DOCUMENT_CATEGORIES.contracts}</h2>
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <DocumentsTable
            documents={documents}
            isLoading={isLoading}
            canDelete={canDelete()}
            canShare={true}
            onDelete={deleteDocument}
          />
        </TabsContent>

        {/* Employee Documents Tab */}
        <TabsContent value="employee" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{DOCUMENT_CATEGORIES.employee}</h2>
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <DocumentsTable
            documents={documents}
            isLoading={isLoading}
            canDelete={canDelete()}
            canShare={false}
            onDelete={deleteDocument}
          />
        </TabsContent>

        {/* Access Authorization Tab */}
        <TabsContent value="access" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{DOCUMENT_CATEGORIES.access}</h2>
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <DocumentsTable
            documents={documents}
            isLoading={isLoading}
            canDelete={canDelete()}
            canShare={true}
            onDelete={deleteDocument}
          />
        </TabsContent>

        {/* Building COIs Tab */}
        <TabsContent value="coi" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{DOCUMENT_CATEGORIES.coi}</h2>
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <DocumentsTable
            documents={documents}
            isLoading={isLoading}
            canDelete={canDelete()}
            canShare={true}
            onDelete={deleteDocument}
          />
        </TabsContent>

        {/* Service Authorization Tab */}
        <TabsContent value="service" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{DOCUMENT_CATEGORIES.service}</h2>
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <DocumentsTable
            documents={documents}
            isLoading={isLoading}
            canDelete={canDelete()}
            canShare={true}
            onDelete={deleteDocument}
          />
        </TabsContent>

        {/* Message Templates Tab */}
        <TabsContent value="messages" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{DOCUMENT_CATEGORIES.messages}</h2>
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <DocumentsTable
            documents={documents}
            isLoading={isLoading}
            canDelete={canDelete()}
            canShare={true}
            onDelete={deleteDocument}
          />
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        category={activeTab as any}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
