import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  RefreshCw,
  Building2,
  Star,
  UserCheck,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useProviders } from "@/hooks/useProviders";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { ServiceProviderTable } from "@/components/ServiceProviders/ServiceProviderTable";
import { UtilityProviderTable } from "@/components/ServiceProviders/UtilityProviderTable";
import { ServiceProviderForm } from "@/components/ServiceProviders/ServiceProviderForm";
import { UtilityProviderForm } from "@/components/ServiceProviders/UtilityProviderForm";
import { ServiceProviderDetailsDialog } from "@/components/ServiceProviders/ServiceProviderDetailsDialog";
import { Provider, ProviderInsert } from "@/lib/schemas";
import { CasaSpinner } from "@/components/ui/casa-loader";

export default function Providers() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"service" | "utility">("service");

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

  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isUtilityFormOpen, setIsUtilityFormOpen] = useState(false);
  const [editingServiceProvider, setEditingServiceProvider] =
    useState<Provider | null>(null);
  const [editingUtilityProvider, setEditingUtilityProvider] =
    useState<Provider | null>(null);
  const [detailsProvider, setDetailsProvider] = useState<Provider | null>(null);

  // Permissions
  const canCreateService = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_CREATE);
  const canEditService = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_EDIT);
  const canDeleteService = hasPermission(PERMISSIONS.SERVICE_PROVIDERS_DELETE);
  const canCreateUtility = hasPermission(PERMISSIONS.UTILITY_PROVIDERS_CREATE);
  const canEditUtility = hasPermission(PERMISSIONS.UTILITY_PROVIDERS_EDIT);
  const canDeleteUtility = hasPermission(PERMISSIONS.UTILITY_PROVIDERS_DELETE);

  // Service provider handlers
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

  // Utility provider handlers
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

  // Calculate combined provider stats
  const allProviders = [...serviceProviders, ...utilityProviders];
  const totalProviders = allProviders.length;
  const activeProviders = allProviders.filter((p) => p.is_active).length;
  const preferredProviders = allProviders.filter((p) => p.is_preferred).length;
  const averageRating =
    allProviders.length > 0
      ? (
          allProviders.reduce((sum, p) => sum + (p.rating || 0), 0) /
          allProviders.length
        ).toFixed(2)
      : "0.00";

  const loading = serviceLoading && utilityLoading;
  const isFetching =
    activeTab === "service" ? serviceFetching : utilityFetching;

  if (
    loading &&
    serviceProviders.length === 0 &&
    utilityProviders.length === 0
  ) {
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("providers.title")}
          </h1>
          <p className="text-muted-foreground">{t("providers.subtitle")}</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button
            onClick={() =>
              activeTab === "service" ? refetchService() : refetchUtility()
            }
            variant="outline"
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            {t("common.refresh")}
          </Button>
          {((activeTab === "service" && canCreateService) ||
            (activeTab === "utility" && canCreateUtility)) && (
            <Button
              onClick={() =>
                activeTab === "service"
                  ? setIsServiceFormOpen(true)
                  : setIsUtilityFormOpen(true)
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              {activeTab === "service"
                ? t("providers.addServiceProvider")
                : t("providers.addUtilityProvider")}
            </Button>
          )}
        </div>
      </div>

      {/* Unified Metrics Cards - Outside Tabs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  {t("providers.metrics.totalProviders")}
                </p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {loading ? "..." : totalProviders}
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  {t("providers.metrics.serviceUtilityBreakdown", {
                    service: serviceProviders.length,
                    utility: utilityProviders.length,
                  })}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">
                  {t("providers.metrics.activeProviders")}
                </p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {loading ? "..." : activeProviders}
                </h3>
                <p className="text-xs text-green-600 mt-1">
                  {totalProviders - activeProviders}{" "}
                  {t("providers.metrics.inactive")}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">
                  {t("providers.metrics.preferredVendors")}
                </p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  {loading ? "..." : preferredProviders}
                </h3>
                <p className="text-xs text-purple-600 mt-1">
                  {t("providers.metrics.topRatedVendors")}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">
                  {t("providers.metrics.averageRating")}
                </p>
                <h3 className="text-3xl font-bold text-orange-900 mt-1">
                  {loading ? "..." : averageRating}
                </h3>
                <p className="text-xs text-orange-600 mt-1">
                  {t("providers.metrics.outOfFive")}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "service" | "utility")}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="service" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {t("providers.tabs.serviceProviders")}
          </TabsTrigger>
          <TabsTrigger value="utility" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {t("providers.tabs.utilityProviders")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="service" className="space-y-6 mt-6">
          <ServiceProviderTable
            providers={serviceProviders}
            onEditProvider={
              canEditService ? handleEditServiceProvider : undefined
            }
            onDeleteProvider={
              canDeleteService ? handleDeleteServiceProvider : undefined
            }
            onViewDetails={handleViewDetails}
            isLoading={serviceLoading}
            isFetching={serviceFetching}
          />
        </TabsContent>

        <TabsContent value="utility" className="space-y-6 mt-6">
          <UtilityProviderTable
            providers={utilityProviders}
            onEditProvider={
              canEditUtility ? handleEditUtilityProvider : undefined
            }
            onDeleteProvider={
              canDeleteUtility ? handleDeleteUtilityProvider : undefined
            }
            onViewDetails={handleViewDetails}
            isLoading={utilityLoading}
            isFetching={utilityFetching}
          />
        </TabsContent>
      </Tabs>

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
