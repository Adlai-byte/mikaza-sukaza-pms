import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { providers, loading, isFetching, createProvider, updateProvider, deleteProvider, refetch } = useServiceProviders();
  const { logActivity } = useActivityLogs();
  const { hasPermission } = usePermissions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null);
  const [detailsProvider, setDetailsProvider] = useState<ServiceProvider | null>(null);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Service Providers</h1>
          <p className="text-muted-foreground">
            Manage contractors, vendors, and service companies
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Providers Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Providers</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {loading ? '...' : providers.length}
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  All registered providers
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Providers Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Active Providers</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {loading ? '...' : activeProviders}
                </h3>
                <p className="text-xs text-green-600 mt-1">
                  {providers.length - activeProviders} inactive
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferred Vendors Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Preferred Vendors</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  {loading ? '...' : preferredProviders}
                </h3>
                <p className="text-xs text-purple-600 mt-1">
                  Top rated vendors
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Rating Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Average Rating</p>
                <h3 className="text-3xl font-bold text-orange-900 mt-1">
                  {loading ? '...' : averageRating}
                </h3>
                <p className="text-xs text-orange-600 mt-1">
                  Out of 5.00 stars
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
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
