import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from 'date-fns';
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
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Pencil,
} from "lucide-react";
import { useProviders } from "@/hooks/useProviders";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import {
  useScheduledServices,
  useUpdateScheduledService,
  useServiceSchedulingRealtime,
} from "@/hooks/useServiceScheduling";
import { ServiceScheduleDialog } from "@/components/scheduling/ServiceScheduleDialog";
import { AssignVendorDialog } from "@/components/scheduling/AssignVendorDialog";
import { PageHeader } from "@/components/ui/page-header";
import {
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

export default function ServiceScheduling() {
  const { t } = useTranslation();

  // Enable realtime updates
  useServiceSchedulingRealtime();

  // ==================== SERVICE SCHEDULING STATE ====================
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [editingScheduledService, setEditingScheduledService] = useState<ScheduledService | null>(null);
  const [assigningService, setAssigningService] = useState<ScheduledService | null>(null);

  // Filter states
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<string>('all');
  const [serviceStatusFilter, setServiceStatusFilter] = useState<string>('all');
  const [allocationFilter, setAllocationFilter] = useState<string>('all');

  // Pagination
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

  // ==================== DATA FETCHING ====================
  const { data: scheduledServices, isLoading: scheduledServicesLoading, isFetching, refetch: refetchServices } = useScheduledServices(queryFilters);
  const { properties } = usePropertiesOptimized();
  const updateScheduledService = useUpdateScheduledService();

  // Get vendors for assignment dialog
  const { providers: serviceProviders } = useProviders("service");
  const { providers: utilityProviders } = useProviders("utility");

  // All providers for dropdown in assign dialog
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

  // ==================== FILTERING & PAGINATION ====================
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

  const totalRecords = filteredScheduledServices.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const paginatedServices = filteredScheduledServices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // ==================== HANDLERS ====================
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

  const handleClearFilters = () => {
    setSelectedPropertyId('all');
    setServiceFilter('all');
    setServiceStatusFilter('all');
    setPartnerStatusFilter('all');
    setAllocationFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
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
  if (scheduledServicesLoading && !scheduledServices) {
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
        icon={ClipboardList}
        title={t("serviceScheduling.title", "Service Scheduling")}
        subtitle={t("serviceScheduling.subtitle", "Schedule and manage property maintenance services")}
        actions={
          <div className="flex gap-2 self-start sm:self-auto">
            <Button
              onClick={() => refetchServices()}
              variant="outline"
              disabled={isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              {t("common.refresh")}
            </Button>
            <Button onClick={handleScheduleService}>
              <Plus className="mr-2 h-4 w-4" />
              {t("serviceScheduling.scheduleService", "Schedule Service")}
            </Button>
          </div>
        }
      />

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
            {/* Property Name */}
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
            <Button variant="outline" onClick={handleClearFilters}>
              {t("common.clearFilters", "Clear Filters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {t("serviceScheduling.showingRecords", "Showing records {{from}} to {{to}} of {{total}}:", {
          from: totalRecords === 0 ? 0 : ((currentPage - 1) * pageSize) + 1,
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
                  <TableHead>{t("serviceScheduling.vendorAssignment", "Vendor Assignment")}</TableHead>
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

      {/* ==================== DIALOGS ==================== */}

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
