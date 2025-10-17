import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, RefreshCw, Zap, Power, Wifi, Droplet } from "lucide-react";
import { useUtilityProviders } from "@/hooks/useUtilityProviders";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UtilityProvider, UtilityProviderInsert } from "@/lib/schemas";
import { MikasaSpinner } from "@/components/ui/mikasa-loader";

export default function UtilityProviders() {
  const { providers, loading, isFetching, createProvider, updateProvider, deleteProvider, refetch } = useUtilityProviders();
  const { logActivity } = useActivityLogs();
  const { hasPermission } = usePermissions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<UtilityProvider | null>(null);
  const [detailsProvider, setDetailsProvider] = useState<UtilityProvider | null>(null);

  const canCreate = hasPermission(PERMISSIONS.UTILITY_PROVIDERS_CREATE);
  const canEdit = hasPermission(PERMISSIONS.UTILITY_PROVIDERS_EDIT);
  const canDelete = hasPermission(PERMISSIONS.UTILITY_PROVIDERS_DELETE);

  const handleCreateProvider = async (providerData: UtilityProviderInsert) => {
    await createProvider(providerData);
    await logActivity('UTILITY_PROVIDER_CREATED', {
      providerName: providerData.provider_name,
      providerType: providerData.provider_type
    });
    setIsFormOpen(false);
  };

  const handleUpdateProvider = async (providerData: UtilityProviderInsert) => {
    if (editingProvider?.provider_id) {
      await updateProvider(editingProvider.provider_id, providerData);
      await logActivity('UTILITY_PROVIDER_UPDATED', {
        providerName: providerData.provider_name,
        providerType: providerData.provider_type
      }, editingProvider.provider_id);
      setEditingProvider(null);
      setIsFormOpen(false);
    }
  };

  const handleEditProvider = (provider: UtilityProvider) => {
    setEditingProvider(provider);
    setIsFormOpen(true);
  };

  const handleDeleteProvider = async (providerId: string) => {
    const provider = providers.find(p => p.provider_id === providerId);
    await deleteProvider(providerId);
    if (provider) {
      await logActivity('UTILITY_PROVIDER_DELETED', {
        providerName: provider.provider_name,
        providerType: provider.provider_type
      }, providerId);
    }
  };

  const handleViewDetails = (provider: UtilityProvider) => {
    setDetailsProvider(provider);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProvider(null);
  };

  // Calculate stats
  const activeProviders = providers.filter(p => p.is_active).length;
  const electricProviders = providers.filter(p => p.provider_type === 'Electric').length;
  const internetProviders = providers.filter(p => p.provider_type === 'Internet').length;
  const waterProviders = providers.filter(p => p.provider_type === 'Water').length;

  if (loading && providers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <MikasaSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Utility Providers</h1>
          <p className="text-muted-foreground">
            Manage utility companies and service providers
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
                  All utility companies
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
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
                <Power className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Electric & Internet Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Electric & Internet</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  {loading ? '...' : electricProviders + internetProviders}
                </h3>
                <p className="text-xs text-purple-600 mt-1">
                  {electricProviders} electric, {internetProviders} internet
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Wifi className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Water & Gas Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Water Providers</p>
                <h3 className="text-3xl font-bold text-orange-900 mt-1">
                  {loading ? '...' : waterProviders}
                </h3>
                <p className="text-xs text-orange-600 mt-1">
                  Water utility companies
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <Droplet className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Utility Providers</CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: Create UtilityProviderTable component */}
          <div className="text-center py-8 text-muted-foreground">
            Utility Provider Table component will be created next
          </div>
        </CardContent>
      </Card>

      {/* Provider Form Modal */}
      {/* TODO: Create UtilityProviderForm component */}

      {/* Provider Details Dialog */}
      {/* TODO: Create UtilityProviderDetailsDialog component */}
    </div>
  );
}
