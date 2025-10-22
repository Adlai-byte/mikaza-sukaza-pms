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
  Wrench,
  Zap,
  Activity,
  Receipt,
  FileBarChart,
  LayoutGrid,
  BarChart3,
  ChevronDown,
  ChevronRight,
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
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS, Permission } from "@/lib/rbac/permissions";

// Define menu items with their required permissions
// Organized by frequency of use: Daily → Weekly → Occasional
const mainMenuItems = [
  // Daily Operations (High Frequency)
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permission: null }, // Everyone can access
  { title: "Bookings", url: "/bookings", icon: CalendarDays, permission: PERMISSIONS.BOOKINGS_VIEW },
  { title: "Calendar", url: "/calendar", icon: Calendar, permission: PERMISSIONS.BOOKINGS_VIEW },
  { title: "Properties", url: "/properties", icon: Building, permission: PERMISSIONS.PROPERTIES_VIEW },
  { title: "Active Jobs", url: "/jobs", icon: BriefcaseIcon, permission: PERMISSIONS.JOBS_VIEW },
  { title: "To-Do List", url: "/todos", icon: CheckSquare, permission: PERMISSIONS.TODOS_VIEW_OWN },

  // Weekly Operations (Medium Frequency)
  { title: "Issues & Photos", url: "/issues", icon: AlertTriangle, permission: PERMISSIONS.ISSUES_VIEW },
  { title: "Providers", url: "/providers", icon: Wrench, permission: PERMISSIONS.SERVICE_PROVIDERS_VIEW },

  // Admin & System (Low Frequency)
  { title: "User Management", url: "/users", icon: Users, permission: PERMISSIONS.USERS_VIEW },
  { title: "Activity Logs", url: "/activity-logs", icon: Activity, permission: PERMISSIONS.SYSTEM_AUDIT },
];

const documentMenuItems = [
  { title: "Documents", url: "/documents", icon: FileText, permission: PERMISSIONS.DOCUMENTS_CONTRACTS_VIEW },
];

const financeMenuItems = [
  // Daily/Weekly Financial Operations
  { title: "Invoices", url: "/invoices", icon: FileText, permission: PERMISSIONS.FINANCE_VIEW },
  { title: "Expenses", url: "/expenses", icon: Receipt, permission: PERMISSIONS.FINANCE_VIEW },
  { title: "Bill Templates", url: "/bill-templates", icon: LayoutGrid, permission: PERMISSIONS.FINANCE_VIEW },

  // Periodic Reports & Analysis
  { title: "Financial Dashboard", url: "/financial-dashboard", icon: BarChart3, permission: PERMISSIONS.FINANCE_VIEW },
  { title: "Owner Statement", url: "/owner-statement", icon: FileBarChart, permission: PERMISSIONS.FINANCE_VIEW },
  { title: "Service Pipeline", url: "/finance/pipeline", icon: DollarSign, permission: PERMISSIONS.PIPELINE_VIEW },
  { title: "Commissions", url: "/finance/commissions", icon: DollarSign, permission: PERMISSIONS.COMMISSIONS_VIEW_ALL },
  { title: "My Commissions", url: "/finance/commissions", icon: DollarSign, permission: PERMISSIONS.COMMISSIONS_VIEW_OWN },
];

const mediaMenuItems = [
  { title: "Photos & Videos", url: "/media", icon: Image, permission: PERMISSIONS.MEDIA_VIEW },
];

const highlightsMenuItems = [
  { title: "Highlights", url: "/highlights", icon: Star, permission: PERMISSIONS.HIGHLIGHTS_VIEW },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { hasPermission, userRole, getPermissions } = usePermissions();

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    finance: true,
    documents: false,
    media: false,
    highlights: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Filter menu items based on permissions
  const visibleMainMenuItems = useMemo(
    () => mainMenuItems.filter(item => !item.permission || hasPermission(item.permission)),
    [hasPermission, userRole]
  );

  const visibleDocumentMenuItems = useMemo(
    () => documentMenuItems.filter(item => !item.permission || hasPermission(item.permission)),
    [hasPermission, userRole]
  );

  const visibleFinanceMenuItems = useMemo(
    () => financeMenuItems.filter(item => !item.permission || hasPermission(item.permission)),
    [hasPermission, userRole]
  );

  const visibleMediaMenuItems = useMemo(
    () => mediaMenuItems.filter(item => !item.permission || hasPermission(item.permission)),
    [hasPermission, userRole]
  );

  const visibleHighlightsMenuItems = useMemo(
    () => highlightsMenuItems.filter(item => !item.permission || hasPermission(item.permission)),
    [hasPermission, userRole]
  );

  // Debug logging - after filtering
  console.log('🔐 [AppSidebar] User Role:', userRole);
  console.log('🔐 [AppSidebar] Has USERS_VIEW?', hasPermission(PERMISSIONS.USERS_VIEW));
  console.log('📋 [AppSidebar] Main Menu Items:', mainMenuItems.length, '→ Visible:', visibleMainMenuItems.length);
  console.log('📋 [AppSidebar] Visible Main Items:', visibleMainMenuItems.map(i => i.title));
  console.log('📋 [AppSidebar] Finance Items:', financeMenuItems.length, '→ Visible:', visibleFinanceMenuItems.length);
  console.log('📋 [AppSidebar] Visible Finance Items:', visibleFinanceMenuItems.map(i => i.title));

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
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
              <span className="text-primary font-bold text-lg">MS</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-white font-bold text-lg">mikaza sukaza</h1>
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
                  {visibleMainMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild className="h-10">
                        <NavLink to={item.url} className={() => getNavCls(isActive(item.url))}>
                          <item.icon className="h-5 w-5 min-w-5" />
                          {!isCollapsed && <span className="ml-3">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
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
                  {visibleFinanceMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild className="h-10">
                        <NavLink to={item.url} className={() => getNavCls(isActive(item.url))}>
                          <item.icon className="h-5 w-5 min-w-5" />
                          {!isCollapsed && <span className="ml-3">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
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
                  {visibleDocumentMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild className="h-10">
                        <NavLink to={item.url} className={() => getNavCls(isActive(item.url))}>
                          <item.icon className="h-5 w-5 min-w-5" />
                          {!isCollapsed && <span className="ml-3">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
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
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild className="h-10">
                        <NavLink to={item.url} className={() => getNavCls(isActive(item.url))}>
                          <item.icon className="h-5 w-5 min-w-5" />
                          {!isCollapsed && <span className="ml-3">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}

        {/* Highlights */}
        {visibleHighlightsMenuItems.length > 0 && (
          <SidebarGroup>
            {!isCollapsed && (
              <button
                onClick={() => toggleSection('highlights')}
                className={`w-full flex items-center justify-between text-xs uppercase tracking-wider px-6 mb-2 hover:text-white transition-colors cursor-pointer ${
                  hasActiveItem(visibleHighlightsMenuItems) ? 'text-white font-semibold' : 'text-white/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Highlights</span>
                  {hasActiveItem(visibleHighlightsMenuItems) && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  )}
                </div>
                {expandedSections.highlights ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {expandedSections.highlights && (
              <SidebarGroupContent className="px-3">
                <SidebarMenu className="space-y-1">
                  {visibleHighlightsMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild className="h-10">
                        <NavLink to={item.url} className={() => getNavCls(isActive(item.url))}>
                          <item.icon className="h-5 w-5 min-w-5" />
                          {!isCollapsed && <span className="ml-3">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}