import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, RefreshCw, Building2, Star, UserCheck, TrendingUp } from "lucide-react";
import { useServiceProviders } from "@/hooks/useServiceProviders";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { ServiceProviderTable } from "@/components/ServiceProviders/ServiceProviderTable";
import { ServiceProviderForm } from "@/components/ServiceProviders/ServiceProviderForm";
import { ServiceProviderDetailsDialog } from "@/components/ServiceProviders/ServiceProviderDetailsDialog";
import { ServiceProvider, ServiceProviderInsert } from "@/lib/schemas";
import { CasaSpinner } from "@/components/ui/casa-loader";

export default function ServiceProviders() {
  const [showInactive, setShowInactive] = useState(false);
  const { providers, loading, isFetching, createProvider, updateProvider, deleteProvider, refetch } = useServiceProviders(showInactive);
  const { logActivity } = useActivityLogs();
  const { hasPermission } = usePermissions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null);
  const [detailsProvider, setDetailsProvider] = useState<ServiceProvider | null>(null);

  const isAdmin = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_DELETE); // Admin-level permission

  const canCreate = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_CREATE);
  const canEdit = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_EDIT);
  const canDelete = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_DELETE);

  const handleCreateProvider = async (providerData: ServiceProviderInsert) => {
    await createProvider(providerData);
    await logActivity('SERVICE_PROVIDER_CREATED', {
      companyName: providerData.company_name,
      serviceCategory: providerData.service_category
    });
    setIsFormOpen(false);
  };

  const handleUpdateProvider = async (providerData: ServiceProviderInsert) => {
    if (editingProvider?.provider_id) {
      await updateProvider(editingProvider.provider_id, providerData);
      await logActivity('SERVICE_PROVIDER_UPDATED', {
        companyName: providerData.company_name,
        serviceCategory: providerData.service_category
      }, editingProvider.provider_id);
      setEditingProvider(null);
      setIsFormOpen(false);
    }
  };

  const handleEditProvider = (provider: ServiceProvider) => {
    setEditingProvider(provider);
    setIsFormOpen(true);
  };

  const handleDeleteProvider = async (providerId: string) => {
    const provider = providers.find(p => p.provider_id === providerId);
    await deleteProvider(providerId);
    if (provider) {
      await logActivity('SERVICE_PROVIDER_DELETED', {
        companyName: provider.company_name,
        serviceCategory: provider.service_category
      }, providerId);
    }
  };

  const handleViewDetails = (provider: ServiceProvider) => {
    setDetailsProvider(provider);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProvider(null);
  };

  // Calculate stats
  const activeProviders = providers.filter(p => p.is_active).length;
  const preferredProviders = providers.filter(p => p.is_preferred).length;
  const averageRating = providers.length > 0
    ? (providers.reduce((sum, p) => sum + (p.rating || 0), 0) / providers.length).toFixed(2)
    : '0.00';

  if (loading && providers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <CasaSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Providers"
        subtitle="Manage contractors, vendors, and service companies"
        icon={Building2}
        actions={
          <>
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">
                  Show Inactive
                </Label>
              </div>
            )}
            <Button onClick={() => refetch()} variant="outline" disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {canCreate && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            )}
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Providers Card */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Total Providers</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">
                    {loading ? '...' : providers.length}
                  </h3>
                  <span className="text-xs text-muted-foreground">All registered providers</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Providers Card */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Active Providers</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">
                    {loading ? '...' : activeProviders}
                  </h3>
                  <span className="text-xs text-muted-foreground">{providers.length - activeProviders} inactive</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferred Vendors Card */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Star className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Preferred Vendors</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">
                    {loading ? '...' : preferredProviders}
                  </h3>
                  <span className="text-xs text-muted-foreground">Top rated vendors</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Rating Card */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">
                    {loading ? '...' : averageRating}
                  </h3>
                  <span className="text-xs text-muted-foreground">Out of 5.00 stars</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceProviderTable
            providers={providers}
            onEditProvider={canEdit ? handleEditProvider : undefined}
            onDeleteProvider={canDelete ? handleDeleteProvider : undefined}
            onViewDetails={handleViewDetails}
            isLoading={loading}
            isFetching={isFetching}
          />
        </CardContent>
      </Card>

      {/* Provider Form Modal */}
      {canCreate || (canEdit && editingProvider) ? (
        <ServiceProviderForm
          open={isFormOpen}
          onOpenChange={handleFormClose}
          provider={editingProvider}
          onSubmit={editingProvider ? handleUpdateProvider : handleCreateProvider}
        />
      ) : null}

      {/* Provider Details Dialog */}
      {detailsProvider && (
        <ServiceProviderDetailsDialog
          open={!!detailsProvider}
          onOpenChange={(open) => !open && setDetailsProvider(null)}
          provider={detailsProvider}
        />
      )}
    </div>
  );
}
