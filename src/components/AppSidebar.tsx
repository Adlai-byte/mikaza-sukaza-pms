import { useState, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building,
  BriefcaseIcon,
  Calendar,
  CalendarDays,
  CheckSquare,
  AlertTriangle,
  FileText,
  DollarSign,
  Star,
  Image,
  Menu,
  Users,
  UserSquare2,
  Wrench,
  Zap,
  Activity,
  Receipt,
  FileBarChart,
  LayoutGrid,
  BarChart3,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Shield,
  KeyRound,
  MessageSquare,
  LogIn,
  Mail,
  FileSpreadsheet,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS, Permission } from "@/lib/rbac/permissions";
import { useUnseenExpiringCounts } from "@/hooks/useExpiringDocumentsCount";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

// Define menu items with their required permissions
// Organized by frequency of use: Daily → Weekly → Occasional
const mainMenuItems = [
  // Daily Operations (High Frequency)
  { titleKey: "sidebar.dashboard", url: "/", icon: LayoutDashboard, permission: null }, // Everyone can access
  { titleKey: "sidebar.bookings", url: "/bookings", icon: CalendarDays, permission: PERMISSIONS.BOOKINGS_VIEW },
  { titleKey: "sidebar.calendar", url: "/calendar", icon: Calendar, permission: PERMISSIONS.BOOKINGS_VIEW },
  { titleKey: "sidebar.guests", url: "/guests", icon: UserSquare2, permission: PERMISSIONS.GUESTS_VIEW },
  { titleKey: "sidebar.properties", url: "/properties", icon: Building, permission: PERMISSIONS.PROPERTIES_VIEW },
  { titleKey: "sidebar.activeJobs", url: "/jobs", icon: BriefcaseIcon, permission: PERMISSIONS.JOBS_VIEW },
  { titleKey: "sidebar.todoList", url: "/todos", icon: CheckSquare, permission: PERMISSIONS.TODOS_VIEW_OWN },

  // Weekly Operations (Medium Frequency)
  { titleKey: "sidebar.issuesPhotos", url: "/issues", icon: AlertTriangle, permission: PERMISSIONS.ISSUES_VIEW },
  { titleKey: "sidebar.messages", url: "/messages", icon: Mail, permission: PERMISSIONS.MESSAGES_VIEW },
  { titleKey: "sidebar.checkInOut", url: "/check-in-out", icon: LogIn, permission: PERMISSIONS.PROPERTIES_VIEW },
  { titleKey: "sidebar.checklistTemplates", url: "/checklist-templates", icon: CheckSquare, permission: PERMISSIONS.PROPERTIES_VIEW },
  { titleKey: "sidebar.providers", url: "/providers", icon: Wrench, permission: PERMISSIONS.SERVICE_PROVIDERS_VIEW },

  // Admin & System (Low Frequency)
  { titleKey: "sidebar.userManagement", url: "/users", icon: Users, permission: PERMISSIONS.USERS_VIEW },
  { titleKey: "sidebar.employeeDocs", url: "/employee-documents", icon: FileText, permission: PERMISSIONS.DOCUMENTS_EMPLOYEE_VIEW },
  { titleKey: "sidebar.activityLogs", url: "/activity-logs", icon: Activity, permission: PERMISSIONS.SYSTEM_AUDIT },
];

const supportMenuItems = [
  { titleKey: "sidebar.help", url: "/help", icon: HelpCircle, permission: null }, // Everyone can access
];

const documentMenuItems = [
  { titleKey: "sidebar.vendorCOIs", url: "/vendor-cois", icon: Shield, permission: PERMISSIONS.SERVICE_PROVIDERS_VIEW },
  { titleKey: "sidebar.accessAuth", url: "/access-authorizations", icon: KeyRound, permission: PERMISSIONS.SERVICE_PROVIDERS_VIEW },
  { titleKey: "sidebar.serviceDocuments", url: "/service-documents", icon: Wrench, permission: PERMISSIONS.DOCUMENTS_SERVICE_VIEW },
  { titleKey: "sidebar.messageTemplates", url: "/message-templates", icon: MessageSquare, permission: PERMISSIONS.DOCUMENTS_MESSAGES_VIEW },
];

const financeMenuItems = [
  // Daily/Weekly Financial Operations
  { titleKey: "sidebar.invoices", url: "/invoices", icon: Receipt, permission: PERMISSIONS.FINANCE_VIEW },
  { titleKey: "sidebar.expenses", url: "/expenses", icon: DollarSign, permission: PERMISSIONS.FINANCE_VIEW },
  { titleKey: "sidebar.contracts", url: "/contracts", icon: FileText, permission: PERMISSIONS.DOCUMENTS_CONTRACTS_VIEW },
  { titleKey: "sidebar.billTemplates", url: "/bill-templates", icon: LayoutGrid, permission: PERMISSIONS.FINANCE_VIEW },

  // Periodic Reports & Analysis
  { titleKey: "sidebar.highlights", url: "/highlights", icon: Star, permission: PERMISSIONS.FINANCE_VIEW },
  { titleKey: "sidebar.financialDashboard", url: "/financial-dashboard", icon: BarChart3, permission: PERMISSIONS.FINANCE_VIEW },
  { titleKey: "sidebar.ownerStatement", url: "/owner-statement", icon: FileBarChart, permission: PERMISSIONS.FINANCE_VIEW },
  { titleKey: "sidebar.serviceDocuments", url: "/finance/pipeline", icon: DollarSign, permission: PERMISSIONS.PIPELINE_VIEW },
  { titleKey: "sidebar.reports", url: "/reports", icon: FileSpreadsheet, permission: PERMISSIONS.REPORTS_VIEW },
];

const mediaMenuItems = [
  { titleKey: "sidebar.media", url: "/media", icon: Image, permission: PERMISSIONS.MEDIA_VIEW },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { hasPermission, userRole, getPermissions } = usePermissions();
  const { unseenCounts } = useUnseenExpiringCounts(30);

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    finance: true,
    documents: false,
    media: false,
    support: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Filter menu items based on permissions
  // Note: hasPermission is stable and already depends on userRole internally
  const visibleMainMenuItems = useMemo(
    () => mainMenuItems.filter(item => !item.permission || hasPermission(item.permission)),
    [hasPermission]
  );

  const visibleDocumentMenuItems = useMemo(
    () => documentMenuItems.filter(item => !item.permission || hasPermission(item.permission)),
    [hasPermission]
  );

  const visibleFinanceMenuItems = useMemo(
    () => financeMenuItems.filter(item => !item.permission || hasPermission(item.permission)),
    [hasPermission]
  );

  const visibleMediaMenuItems = useMemo(
    () => mediaMenuItems.filter(item => !item.permission || hasPermission(item.permission)),
    [hasPermission]
  );

  const visibleSupportMenuItems = useMemo(
    () => supportMenuItems.filter(item => !item.permission || hasPermission(item.permission)),
    [hasPermission]
  );

  // Debug logging - after filtering
  console.log('🔐 [AppSidebar] User Role:', userRole);
  console.log('🔐 [AppSidebar] Has USERS_VIEW?', hasPermission(PERMISSIONS.USERS_VIEW));
  console.log('📋 [AppSidebar] Main Menu Items:', mainMenuItems.length, '→ Visible:', visibleMainMenuItems.length);
  console.log('📋 [AppSidebar] Visible Main Items:', visibleMainMenuItems.map(i => i.titleKey));
  console.log('📋 [AppSidebar] Finance Items:', financeMenuItems.length, '→ Visible:', visibleFinanceMenuItems.length);
  console.log('📋 [AppSidebar] Visible Finance Items:', visibleFinanceMenuItems.map(i => i.titleKey));

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  // Get notification count for a specific menu item
  const getNotificationCount = (url: string): number => {
    if (url === "/contracts") return unseenCounts.contracts;
    if (url === "/vendor-cois") return unseenCounts.coi;
    return 0;
  };

  const getNavCls = (isActive: boolean) =>
    `transition-all duration-200 rounded-none ${
      isActive
        ? "bg-green-600 text-white font-medium border-l-4 border-green-400"
        : "bg-green-50/50 hover:bg-green-100 hover:text-green-700 text-muted-foreground border-l-4 border-transparent"
    }`;

  // Check if any item in a menu group is active
  const hasActiveItem = (items: typeof mainMenuItems) => {
    return items.some(item => isActive(item.url));
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar
        className={`${
          isCollapsed ? "w-16" : "w-64"
        } bg-gradient-primary border-r-0 transition-all duration-300`}
        collapsible="icon"
      >
        <SidebarContent className="bg-gradient-primary">
        {/* Brand Header */}
        <div className={`flex items-center p-6 ${isCollapsed ? "justify-center" : ""}`}>
          <div className={`flex items-center space-x-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-primary font-bold text-lg">C&C</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-white font-bold text-lg">Casa & Concierge</h1>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        {visibleMainMenuItems.length > 0 && (
          <SidebarGroup>
            {!isCollapsed && (
              <button
                onClick={() => toggleSection('main')}
                className={`w-full flex items-center justify-between text-xs uppercase tracking-wider px-6 mb-2 hover:text-white transition-colors cursor-pointer ${
                  hasActiveItem(visibleMainMenuItems) ? 'text-white font-semibold' : 'text-white/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Main</span>
                  {hasActiveItem(visibleMainMenuItems) && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  )}
                </div>
                {expandedSections.main ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {expandedSections.main && (
              <SidebarGroupContent className="px-3">
                <SidebarMenu className="space-y-1">
                  {visibleMainMenuItems.map((item) => {
                    const notificationCount = getNotificationCount(item.url);
                    return (
                      <SidebarMenuItem key={item.url}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild className="h-10">
                              <NavLink to={item.url} className={() => getNavCls(isActive(item.url))}>
                                <item.icon className="h-5 w-5 min-w-5" />
                                {!isCollapsed && (
                                  <span className="ml-3 flex items-center gap-2 flex-1">
                                    {t(item.titleKey)}
                                    {notificationCount > 0 && (
                                      <Badge className="ml-auto bg-red-500 hover:bg-red-600 text-white">
                                        {notificationCount}
                                      </Badge>
                                    )}
                                  </span>
                                )}
                                {isCollapsed && notificationCount > 0 && (
                                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {notificationCount}
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          {isCollapsed && (
                            <TooltipContent side="right" className="font-medium">
                              {t(item.titleKey)}
                              {notificationCount > 0 && ` (${notificationCount})`}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}

        {/* Finance */}
        {visibleFinanceMenuItems.length > 0 && (
          <SidebarGroup>
            {!isCollapsed && (
              <button
                onClick={() => toggleSection('finance')}
                className={`w-full flex items-center justify-between text-xs uppercase tracking-wider px-6 mb-2 hover:text-white transition-colors cursor-pointer ${
                  hasActiveItem(visibleFinanceMenuItems) ? 'text-white font-semibold' : 'text-white/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Finance</span>
                  {hasActiveItem(visibleFinanceMenuItems) && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  )}
                </div>
                {expandedSections.finance ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {expandedSections.finance && (
              <SidebarGroupContent className="px-3">
                <SidebarMenu className="space-y-1">
                  {visibleFinanceMenuItems.map((item) => {
                    const notificationCount = getNotificationCount(item.url);
                    return (
                      <SidebarMenuItem key={item.url}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild className="h-10">
                              <NavLink to={item.url} className={() => getNavCls(isActive(item.url))}>
                                <item.icon className="h-5 w-5 min-w-5" />
                                {!isCollapsed && (
                                  <span className="ml-3 flex items-center gap-2 flex-1">
                                    {t(item.titleKey)}
                                    {notificationCount > 0 && (
                                      <Badge className="ml-auto bg-red-500 hover:bg-red-600 text-white">
                                        {notificationCount}
                                      </Badge>
                                    )}
                                  </span>
                                )}
                                {isCollapsed && notificationCount > 0 && (
                                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {notificationCount}
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          {isCollapsed && (
                            <TooltipContent side="right" className="font-medium">
                              {t(item.titleKey)}
                              {notificationCount > 0 && ` (${notificationCount})`}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}

        {/* Documents */}
        {visibleDocumentMenuItems.length > 0 && (
          <SidebarGroup>
            {!isCollapsed && (
              <button
                onClick={() => toggleSection('documents')}
                className={`w-full flex items-center justify-between text-xs uppercase tracking-wider px-6 mb-2 hover:text-white transition-colors cursor-pointer ${
                  hasActiveItem(visibleDocumentMenuItems) ? 'text-white font-semibold' : 'text-white/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Documents</span>
                  {hasActiveItem(visibleDocumentMenuItems) && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  )}
                </div>
                {expandedSections.documents ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {expandedSections.documents && (
              <SidebarGroupContent className="px-3">
                <SidebarMenu className="space-y-1">
                  {visibleDocumentMenuItems.map((item) => {
                    const notificationCount = getNotificationCount(item.url);
                    return (
                      <SidebarMenuItem key={item.url}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild className="h-10">
                              <NavLink to={item.url} className={() => getNavCls(isActive(item.url))}>
                                <item.icon className="h-5 w-5 min-w-5" />
                                {!isCollapsed && (
                                  <span className="ml-3 flex items-center gap-2 flex-1">
                                    {t(item.titleKey)}
                                    {notificationCount > 0 && (
                                      <Badge className="ml-auto bg-red-500 hover:bg-red-600 text-white">
                                        {notificationCount}
                                      </Badge>
                                    )}
                                  </span>
                                )}
                                {isCollapsed && notificationCount > 0 && (
                                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {notificationCount}
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          {isCollapsed && (
                            <TooltipContent side="right" className="font-medium">
                              {t(item.titleKey)}
                              {notificationCount > 0 && ` (${notificationCount})`}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}

        {/* Media */}
        {visibleMediaMenuItems.length > 0 && (
          <SidebarGroup>
            {!isCollapsed && (
              <button
                onClick={() => toggleSection('media')}
                className={`w-full flex items-center justify-between text-xs uppercase tracking-wider px-6 mb-2 hover:text-white transition-colors cursor-pointer ${
                  hasActiveItem(visibleMediaMenuItems) ? 'text-white font-semibold' : 'text-white/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Media</span>
                  {hasActiveItem(visibleMediaMenuItems) && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  )}
                </div>
                {expandedSections.media ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {expandedSections.media && (
              <SidebarGroupContent className="px-3">
                <SidebarMenu className="space-y-1">
                  {visibleMediaMenuItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild className="h-10">
                            <NavLink to={item.url} className={() => getNavCls(isActive(item.url))}>
                              <item.icon className="h-5 w-5 min-w-5" />
                              {!isCollapsed && <span className="ml-3">{t(item.titleKey)}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {isCollapsed && (
                          <TooltipContent side="right" className="font-medium">
                            {t(item.titleKey)}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}

        {/* Support - Always at the bottom */}
        {visibleSupportMenuItems.length > 0 && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent className="px-3">
              <SidebarMenu className="space-y-1">
                {visibleSupportMenuItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild className="h-10">
                          <NavLink to={item.url} className={() => getNavCls(isActive(item.url))}>
                            <item.icon className="h-5 w-5 min-w-5" />
                            {!isCollapsed && <span className="ml-3">{t(item.titleKey)}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right" className="font-medium">
                          {t(item.titleKey)}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
    </TooltipProvider>
  );
}