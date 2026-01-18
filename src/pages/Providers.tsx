import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  Wrench,
  Zap,
} from "lucide-react";
import { useProviders, useProvidersRealtime } from "@/hooks/useProviders";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { ServiceProviderTable } from "@/components/ServiceProviders/ServiceProviderTable";
import { UtilityProviderTable } from "@/components/ServiceProviders/UtilityProviderTable";
import { ServiceProviderForm } from "@/components/ServiceProviders/ServiceProviderForm";
import { UtilityProviderForm } from "@/components/ServiceProviders/UtilityProviderForm";
import { ServiceProviderDetailsDialog } from "@/components/ServiceProviders/ServiceProviderDetailsDialog";
import { PageHeader } from "@/components/ui/page-header";
import {
  Provider,
  ProviderInsert,
} from "@/lib/schemas";
import { CasaSpinner } from "@/components/ui/casa-loader";

export default function Providers() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"service-contractors" | "utility-companies">("service-contractors");

  // Enable realtime updates
  useProvidersRealtime();

  // ==================== PROVIDERS STATE ====================
  // Service providers
  const {
    providers: serviceProviders,
    loading: serviceLoading,
    isFetching: serviceFetching,
    createProvider: createService,
    updateProvider: updateService,
    deleteProvider: deleteService,
    refetch: refetchService,
  } = useProviders("service");

  // Utility providers
  const {
    providers: utilityProviders,
    loading: utilityLoading,
    isFetching: utilityFetching,
    createProvider: createUtility,
    updateProvider: updateUtility,
    deleteProvider: deleteUtility,
    refetch: refetchUtility,
  } = useProviders("utility");

  const { logActivity } = useActivityLogs();
  const { hasPermission } = usePermissions();

  // Provider form states
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isUtilityFormOpen, setIsUtilityFormOpen] = useState(false);
  const [editingServiceProvider, setEditingServiceProvider] = useState<Provider | null>(null);
  const [editingUtilityProvider, setEditingUtilityProvider] = useState<Provider | null>(null);
  const [detailsProvider, setDetailsProvider] = useState<Provider | null>(null);

  // ==================== PERMISSIONS ====================
  const canCreateService = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_CREATE);
  const canEditService = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_EDIT);
  const canDeleteService = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_DELETE);
  const canCreateUtility = hasPermission(PERMISSIONS.UTILITY_PROVIDERS_CREATE);
  const canEditUtility = hasPermission(PERMISSIONS.UTILITY_PROVIDERS_EDIT);
  const canDeleteUtility = hasPermission(PERMISSIONS.UTILITY_PROVIDERS_DELETE);

  // ==================== SERVICE PROVIDER HANDLERS ====================
  const handleCreateServiceProvider = async (providerData: ProviderInsert) => {
    await createService(providerData);
    await logActivity("PROVIDER_CREATED", {
      providerName: providerData.provider_name,
      category: providerData.category,
      providerType: providerData.provider_type,
    });
    setIsServiceFormOpen(false);
  };

  const handleUpdateServiceProvider = async (providerData: ProviderInsert) => {
    if (editingServiceProvider?.provider_id) {
      await updateService(editingServiceProvider.provider_id, providerData);
      await logActivity(
        "PROVIDER_UPDATED",
        {
          providerName: providerData.provider_name,
          category: providerData.category,
          providerType: providerData.provider_type,
        },
        editingServiceProvider.provider_id,
      );
      setEditingServiceProvider(null);
      setIsServiceFormOpen(false);
    }
  };

  const handleEditServiceProvider = (provider: Provider) => {
    setEditingServiceProvider(provider);
    setIsServiceFormOpen(true);
  };

  const handleDeleteServiceProvider = async (providerId: string) => {
    const provider = serviceProviders.find((p) => p.provider_id === providerId);
    await deleteService(providerId);
    if (provider) {
      await logActivity(
        "PROVIDER_DELETED",
        {
          providerName: provider.provider_name,
          category: provider.category,
          providerType: provider.provider_type,
        },
        providerId,
      );
    }
  };

  // ==================== UTILITY PROVIDER HANDLERS ====================
  const handleCreateUtilityProvider = async (providerData: ProviderInsert) => {
    await createUtility(providerData);
    await logActivity("PROVIDER_CREATED", {
      providerName: providerData.provider_name,
      category: providerData.category,
      providerType: providerData.provider_type,
    });
    setIsUtilityFormOpen(false);
  };

  const handleUpdateUtilityProvider = async (providerData: ProviderInsert) => {
    if (editingUtilityProvider?.provider_id) {
      await updateUtility(editingUtilityProvider.provider_id, providerData);
      await logActivity(
        "PROVIDER_UPDATED",
        {
          providerName: providerData.provider_name,
          category: providerData.category,
          providerType: providerData.provider_type,
        },
        editingUtilityProvider.provider_id,
      );
      setEditingUtilityProvider(null);
      setIsUtilityFormOpen(false);
    }
  };

  const handleEditUtilityProvider = (provider: Provider) => {
    setEditingUtilityProvider(provider);
    setIsUtilityFormOpen(true);
  };

  const handleDeleteUtilityProvider = async (providerId: string) => {
    const provider = utilityProviders.find((p) => p.provider_id === providerId);
    await deleteUtility(providerId);
    if (provider) {
      await logActivity(
        "PROVIDER_DELETED",
        {
          providerName: provider.provider_name,
          category: provider.category,
          providerType: provider.provider_type,
        },
        providerId,
      );
    }
  };

  const handleViewDetails = (provider: Provider) => {
    setDetailsProvider(provider);
  };

  const handleServiceFormClose = () => {
    setIsServiceFormOpen(false);
    setEditingServiceProvider(null);
  };

  const handleUtilityFormClose = () => {
    setIsUtilityFormOpen(false);
    setEditingUtilityProvider(null);
  };

  // ==================== LOADING STATE ====================
  const loading = serviceLoading && utilityLoading;
  const isFetching =
    activeTab === "service-contractors" ? serviceFetching : utilityFetching;

  if (loading && serviceProviders.length === 0 && utilityProviders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <CasaSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={Wrench}
        title={t("vendorDirectory.title", "Vendor Directory")}
        subtitle={t("vendorDirectory.subtitle", "Manage service contractors and utility companies")}
        actions={
          <div className="flex gap-2 self-start sm:self-auto">
            {/* Refresh button */}
            <Button
              onClick={() => {
                if (activeTab === "service-contractors") refetchService();
                else refetchUtility();
              }}
              variant="outline"
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              {t("common.refresh")}
            </Button>
            {/* Add Provider button */}
            {activeTab === "service-contractors" && canCreateService && (
              <Button onClick={() => setIsServiceFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("vendorDirectory.addContractor", "Add Contractor")}
              </Button>
            )}
            {activeTab === "utility-companies" && canCreateUtility && (
              <Button onClick={() => setIsUtilityFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("vendorDirectory.addUtility", "Add Utility Company")}
              </Button>
            )}
          </div>
        }
      />

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "service-contractors" | "utility-companies")}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="service-contractors" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {t("vendorDirectory.tabs.contractors", "Service Contractors")}
          </TabsTrigger>
          <TabsTrigger value="utility-companies" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {t("vendorDirectory.tabs.utilities", "Utility Companies")}
          </TabsTrigger>
        </TabsList>

        {/* ==================== SERVICE CONTRACTORS TAB ==================== */}
        <TabsContent value="service-contractors" className="space-y-6 mt-6">
          <ServiceProviderTable
            providers={serviceProviders}
            onEditProvider={canEditService ? handleEditServiceProvider : undefined}
            onDeleteProvider={canDeleteService ? handleDeleteServiceProvider : undefined}
            onViewDetails={handleViewDetails}
            isLoading={serviceLoading}
            isFetching={serviceFetching}
          />
        </TabsContent>

        {/* ==================== UTILITY COMPANIES TAB ==================== */}
        <TabsContent value="utility-companies" className="space-y-6 mt-6">
          <UtilityProviderTable
            providers={utilityProviders}
            onEditProvider={canEditUtility ? handleEditUtilityProvider : undefined}
            onDeleteProvider={canDeleteUtility ? handleDeleteUtilityProvider : undefined}
            onViewDetails={handleViewDetails}
            isLoading={utilityLoading}
            isFetching={utilityFetching}
          />
        </TabsContent>
      </Tabs>

      {/* ==================== DIALOGS ==================== */}

      {/* Service Provider Form Modal */}
      <ServiceProviderForm
        open={isServiceFormOpen}
        onOpenChange={handleServiceFormClose}
        provider={editingServiceProvider}
        onSubmit={
          editingServiceProvider
            ? handleUpdateServiceProvider
            : handleCreateServiceProvider
        }
      />

      {/* Utility Provider Form Modal */}
      <UtilityProviderForm
        open={isUtilityFormOpen}
        onOpenChange={handleUtilityFormClose}
        provider={editingUtilityProvider}
        onSubmit={
          editingUtilityProvider
            ? handleUpdateUtilityProvider
            : handleCreateUtilityProvider
        }
      />

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
