import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Plus,
  RefreshCw,
  Wrench,
  Zap,
  Calendar as CalendarIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Pencil,
} from "lucide-react";
import { useProviders } from "@/hooks/useProviders";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import {
  useScheduledServices,
  useUpdateScheduledService,
} from "@/hooks/useServiceScheduling";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { ServiceProviderTable } from "@/components/ServiceProviders/ServiceProviderTable";
import { UtilityProviderTable } from "@/components/ServiceProviders/UtilityProviderTable";
import { ServiceProviderForm } from "@/components/ServiceProviders/ServiceProviderForm";
import { UtilityProviderForm } from "@/components/ServiceProviders/UtilityProviderForm";
import { ServiceProviderDetailsDialog } from "@/components/ServiceProviders/ServiceProviderDetailsDialog";
import { ServiceScheduleDialog } from "@/components/scheduling/ServiceScheduleDialog";
import { AssignVendorDialog } from "@/components/scheduling/AssignVendorDialog";
import {
  Provider,
  ProviderInsert,
  ScheduledService,
  ScheduledServiceFilters,
  SERVICE_TYPE_CONFIG,
  SCHEDULE_STATUS_CONFIG,
  PARTNER_PAYMENT_STATUS_CONFIG,
  ALLOCATION_STATUS_CONFIG,
  ServiceType,
  ScheduleStatus,
  PartnerPaymentStatus,
  AllocationStatus,
} from "@/lib/schemas";
import { CasaSpinner } from "@/components/ui/casa-loader";

export default function Providers() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"services" | "service-vendors" | "utility-providers">("services");

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

  // ==================== SERVICE SCHEDULING STATE ====================
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [editingScheduledService, setEditingScheduledService] = useState<ScheduledService | null>(null);
  const [assigningService, setAssigningService] = useState<ScheduledService | null>(null);

  // Service scheduling filter states
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<string>('all');
  const [serviceStatusFilter, setServiceStatusFilter] = useState<string>('all');
  const [allocationFilter, setAllocationFilter] = useState<string>('all');

  // Pagination for services
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  // Build filters for query
  const queryFilters = useMemo(() => {
    const f: ScheduledServiceFilters = {};
    if (startDate) f.date_from = format(startDate, 'yyyy-MM-dd');
    if (endDate) f.date_to = format(endDate, 'yyyy-MM-dd');
    if (serviceStatusFilter !== 'all') f.status = serviceStatusFilter as ScheduleStatus;
    if (serviceFilter !== 'all') f.service_type = serviceFilter as ServiceType;
    if (selectedPropertyId !== 'all') f.property_id = selectedPropertyId;
    return f;
  }, [startDate, endDate, serviceStatusFilter, serviceFilter, selectedPropertyId]);

  // Fetch scheduled services and properties
  const { data: scheduledServices, isLoading: scheduledServicesLoading, isFetching: servicesFetching, refetch: refetchServices } = useScheduledServices(queryFilters);
  const { properties } = usePropertiesOptimized();
  const updateScheduledService = useUpdateScheduledService();

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

  // ==================== SERVICE SCHEDULING HANDLERS ====================
  const filteredScheduledServices = useMemo(() => {
    if (!scheduledServices) return [];

    return scheduledServices.filter(service => {
      // Partner status filter
      if (partnerStatusFilter !== 'all') {
        if (service.partner_payment_status !== partnerStatusFilter) return false;
      }

      // Allocation filter
      if (allocationFilter !== 'all') {
        if (service.allocation_status !== allocationFilter) return false;
      }

      return true;
    });
  }, [scheduledServices, partnerStatusFilter, allocationFilter]);

  // Pagination
  const totalRecords = filteredScheduledServices.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const paginatedServices = filteredScheduledServices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleScheduleService = () => {
    setEditingScheduledService(null);
    setIsScheduleDialogOpen(true);
  };

  const handleEditScheduledService = (service: ScheduledService) => {
    setEditingScheduledService(service);
    setIsScheduleDialogOpen(true);
  };

  const handleAssignVendor = (service: ScheduledService) => {
    setAssigningService(service);
  };

  const handleAssignmentComplete = (vendorId: string) => {
    if (assigningService) {
      updateScheduledService.mutate({
        scheduleId: assigningService.schedule_id,
        updates: {
          vendor_id: vendorId,
          allocation_status: 'assigned',
        },
      });
      setAssigningService(null);
    }
  };

  // ==================== BADGE HELPERS ====================
  const getPartnerStatusBadge = (status: PartnerPaymentStatus | undefined) => {
    const config = PARTNER_PAYMENT_STATUS_CONFIG[status || 'pending'];
    return (
      <Badge
        variant="outline"
        style={{
          backgroundColor: config.bgColor,
          color: config.color,
          borderColor: config.color,
        }}
      >
        {config.label}
      </Badge>
    );
  };

  const getServiceStatusBadge = (status: ScheduleStatus) => {
    const config = SCHEDULE_STATUS_CONFIG[status];
    return (
      <Badge
        variant="outline"
        style={{
          backgroundColor: config.bgColor,
          color: config.color,
          borderColor: config.color,
        }}
      >
        {config.label}
      </Badge>
    );
  };

  const getAllocationButton = (service: ScheduledService) => {
    const status = service.allocation_status || 'unassigned';
    const config = ALLOCATION_STATUS_CONFIG[status as AllocationStatus];

    if (status === 'unassigned') {
      return (
        <Button
          size="sm"
          variant="outline"
          className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
          onClick={() => handleAssignVendor(service)}
        >
          Assign
        </Button>
      );
    }

    return (
      <Badge
        variant="outline"
        style={{
          backgroundColor: config.bgColor,
          color: config.color,
          borderColor: config.color,
        }}
      >
        {config.label}
      </Badge>
    );
  };

  // ==================== LOADING STATE ====================
  const loading = serviceLoading && utilityLoading;
  const isFetching =
    activeTab === "service-vendors" ? serviceFetching :
    activeTab === "utility-providers" ? utilityFetching :
    servicesFetching;

  // All providers (both service and utility) for dropdown in assign dialog
  // IMPORTANT: This must be before any early returns to follow React hooks rules
  const allVendors = useMemo(() => {
    const serviceVendors = serviceProviders.map(p => ({
      ...p,
      vendor_type: 'service' as const,
    }));
    const utilityVendors = utilityProviders.map(p => ({
      ...p,
      vendor_type: 'utility' as const,
    }));
    return [...serviceVendors, ...utilityVendors];
  }, [serviceProviders, utilityProviders]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("providers.title")}
          </h1>
          <p className="text-muted-foreground">{t("providers.subtitle")}</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          {/* Refresh button for all tabs */}
          <Button
            onClick={() => {
              if (activeTab === "service-vendors") refetchService();
              else if (activeTab === "utility-providers") refetchUtility();
              else refetchServices();
            }}
            variant="outline"
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            {t("common.refresh")}
          </Button>
          {/* Schedule Service button for services tab */}
          {activeTab === "services" && (
            <Button onClick={handleScheduleService}>
              <Plus className="mr-2 h-4 w-4" />
              {t("serviceScheduling.scheduleService", "Schedule Service")}
            </Button>
          )}
          {/* Add Provider button */}
          {activeTab === "service-vendors" && canCreateService && (
            <Button onClick={() => setIsServiceFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("providers.addServiceProvider")}
            </Button>
          )}
          {activeTab === "utility-providers" && canCreateUtility && (
            <Button onClick={() => setIsUtilityFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("providers.addUtilityProvider")}
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "services" | "service-vendors" | "utility-providers")}
      >
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="services" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {t("serviceScheduling.services", "Services")}
          </TabsTrigger>
          <TabsTrigger value="service-vendors" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {t("providers.tabs.serviceProviders")}
          </TabsTrigger>
          <TabsTrigger value="utility-providers" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {t("providers.tabs.utilityProviders")}
          </TabsTrigger>
        </TabsList>

        {/* ==================== SERVICES TAB ==================== */}
        <TabsContent value="services" className="space-y-4 mt-6">
          {/* Filters Section */}
          <Card className="shadow-md border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t("serviceScheduling.filters", "Filters")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Property Name (Combobox) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("serviceScheduling.propertyName", "Property Name")}
                  </label>
                  <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.allProperties", "All Properties")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allProperties", "All Properties")}</SelectItem>
                      {properties?.map((prop) => (
                        <SelectItem key={prop.property_id} value={prop.property_id!}>
                          {prop.property_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("serviceScheduling.service", "Service")}
                  </label>
                  <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.allServices", "All Services")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allServices", "All Services")}</SelectItem>
                      {Object.entries(SERVICE_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("serviceScheduling.serviceStatus", "Service Status")}
                  </label>
                  <Select value={serviceStatusFilter} onValueChange={setServiceStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.allStatuses", "All Statuses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allStatuses", "All Statuses")}</SelectItem>
                      {Object.entries(SCHEDULE_STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("serviceScheduling.startDate", "Start Date")}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'MM/dd/yyyy') : t("common.pickDate", "Pick a date")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("serviceScheduling.endDate", "End Date")}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'MM/dd/yyyy') : t("common.pickDate", "Pick a date")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Partner Payment Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("serviceScheduling.paymentStatus", "Payment Status")}
                  </label>
                  <Select value={partnerStatusFilter} onValueChange={setPartnerStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.all", "All")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                      {Object.entries(PARTNER_PAYMENT_STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vendor Assignment Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" title="Filter by vendor assignment status">
                    {t("serviceScheduling.vendorAssignment", "Vendor Assignment")}
                  </label>
                  <Select value={allocationFilter} onValueChange={setAllocationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.all", "All")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                      {Object.entries(ALLOCATION_STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPropertyId('all');
                    setServiceFilter('all');
                    setServiceStatusFilter('all');
                    setPartnerStatusFilter('all');
                    setAllocationFilter('all');
                    setStartDate(undefined);
                    setEndDate(undefined);
                    setCurrentPage(1);
                  }}
                >
                  {t("common.clearFilters", "Clear Filters")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {t("serviceScheduling.showingRecords", "Showing records {{from}} to {{to}} of {{total}}:", {
              from: ((currentPage - 1) * pageSize) + 1,
              to: Math.min(currentPage * pageSize, totalRecords),
              total: totalRecords,
            })}
          </div>

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              {scheduledServicesLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">
                        {t("serviceScheduling.startDateTime", "Start Date and Time")}
                      </TableHead>
                      <TableHead>{t("serviceScheduling.propertyName", "Property Name")}</TableHead>
                      <TableHead>{t("serviceScheduling.partner", "Partner")}</TableHead>
                      <TableHead>{t("serviceScheduling.categoryService", "Category / Service")}</TableHead>
                      <TableHead>{t("serviceScheduling.paymentStatus", "Payment Status")}</TableHead>
                      <TableHead>{t("serviceScheduling.serviceStatus", "Service Status")}</TableHead>
                      <TableHead>{t("serviceScheduling.allocation", "Allocation")}</TableHead>
                      <TableHead className="w-[80px]">{t("common.actions", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedServices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {t("serviceScheduling.noServicesFound", "No services found. Click 'Schedule Service' to create one.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedServices.map((service) => (
                        <TableRow key={service.schedule_id}>
                          <TableCell>
                            {format(parseISO(service.scheduled_date), 'M/d/yyyy')}{' '}
                            {service.scheduled_time ? service.scheduled_time.slice(0, 8) : ''}
                          </TableCell>
                          <TableCell>
                            {service.property?.property_name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {service.vendor?.provider_name || '-'}
                          </TableCell>
                          <TableCell>
                            {SERVICE_TYPE_CONFIG[service.service_type as ServiceType]?.label || service.service_type}
                            {service.custom_service_name && ` / ${service.custom_service_name}`}
                          </TableCell>
                          <TableCell>
                            {getPartnerStatusBadge(service.partner_payment_status as PartnerPaymentStatus)}
                          </TableCell>
                          <TableCell>
                            {getServiceStatusBadge(service.status as ScheduleStatus)}
                          </TableCell>
                          <TableCell>
                            {getAllocationButton(service)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-blue-500 text-white hover:bg-blue-600"
                              onClick={() => handleEditScheduledService(service)}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              {t("common.edit", "Edit")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("common.previous", "Previous")}
              </Button>
              <span className="text-sm">
                {t("common.pageOf", "Page {{current}} of {{total}}", { current: currentPage, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {t("common.next", "Next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ==================== SERVICE VENDORS TAB ==================== */}
        <TabsContent value="service-vendors" className="space-y-6 mt-6">
          <ServiceProviderTable
            providers={serviceProviders}
            onEditProvider={canEditService ? handleEditServiceProvider : undefined}
            onDeleteProvider={canDeleteService ? handleDeleteServiceProvider : undefined}
            onViewDetails={handleViewDetails}
            isLoading={serviceLoading}
            isFetching={serviceFetching}
          />
        </TabsContent>

        {/* ==================== UTILITY PROVIDERS TAB ==================== */}
        <TabsContent value="utility-providers" className="space-y-6 mt-6">
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

      {/* Schedule/Edit Service Dialog */}
      <ServiceScheduleDialog
        open={isScheduleDialogOpen}
        onOpenChange={setIsScheduleDialogOpen}
        service={editingScheduledService}
        defaultDate={null}
        properties={properties || []}
      />

      {/* Assign Vendor Dialog */}
      <AssignVendorDialog
        open={!!assigningService}
        onOpenChange={(open) => !open && setAssigningService(null)}
        service={assigningService}
        vendors={allVendors || []}
        onAssign={handleAssignmentComplete}
      />
    </div>
  );
}
