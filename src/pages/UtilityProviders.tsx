import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, RefreshCw, Zap, Power, Wifi, Droplet } from "lucide-react";
import { useUtilityProviders } from "@/hooks/useUtilityProviders";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UtilityProvider, UtilityProviderInsert } from "@/lib/schemas";
import { CasaSpinner } from "@/components/ui/casa-loader";
import { UtilityProviderForm } from "@/components/ServiceProviders/UtilityProviderForm";
import { UtilityProviderTable } from "@/components/ServiceProviders/UtilityProviderTable";
import { UtilityProviderDetailsDialog } from "@/components/ServiceProviders/UtilityProviderDetailsDialog";

export default function UtilityProviders() {
  const [showInactive, setShowInactive] = useState(false);
  const { providers, loading, isFetching, createProvider, updateProvider, deleteProvider, refetch } = useUtilityProviders(showInactive);
  const { logActivity } = useActivityLogs();
  const { hasPermission } = usePermissions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<UtilityProvider | null>(null);
  const [detailsProvider, setDetailsProvider] = useState<UtilityProvider | null>(null);

  const isAdmin = hasPermission(PERMISSIONS.UTILITY_PROVIDERS_DELETE); // Admin-level permission

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
        <CasaSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utility Providers"
        subtitle="Manage utility companies and service providers"
        icon={Zap}
        actions={
          <>
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-inactive-utility"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label htmlFor="show-inactive-utility" className="text-sm text-muted-foreground">
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
                <Zap className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Total Providers</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">
                    {loading ? '...' : providers.length}
                  </h3>
                  <span className="text-xs text-muted-foreground">All utility companies</span>
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
                <Power className="h-5 w-5 text-muted-foreground" />
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

        {/* Electric & Internet Card */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Wifi className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Electric & Internet</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">
                    {loading ? '...' : electricProviders + internetProviders}
                  </h3>
                  <span className="text-xs text-muted-foreground">{electricProviders} electric, {internetProviders} internet</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Water & Gas Card */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Droplet className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Water Providers</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">
                    {loading ? '...' : waterProviders}
                  </h3>
                  <span className="text-xs text-muted-foreground">Water utility companies</span>
                </div>
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
          <UtilityProviderTable
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
      <UtilityProviderForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        provider={editingProvider}
        onSubmit={editingProvider ? handleUpdateProvider : handleCreateProvider}
      />

      {/* Provider Details Dialog */}
      <UtilityProviderDetailsDialog
        provider={detailsProvider}
        open={!!detailsProvider}
        onOpenChange={(open) => !open && setDetailsProvider(null)}
      />
    </div>
  );
}
