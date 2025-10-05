import { useState, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building,
  BriefcaseIcon,
  Calendar,
  CheckSquare,
  AlertTriangle,
  FileText,
  DollarSign,
  Star,
  Image,
  Menu,
  Users,
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
const mainMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permission: null }, // Everyone can access
  { title: "User Management", url: "/users", icon: Users, permission: PERMISSIONS.USERS_VIEW },
  { title: "Properties", url: "/properties", icon: Building, permission: PERMISSIONS.PROPERTIES_VIEW },
  { title: "Active Jobs", url: "/jobs", icon: BriefcaseIcon, permission: PERMISSIONS.JOBS_VIEW },
  { title: "Calendar", url: "/calendar", icon: Calendar, permission: PERMISSIONS.BOOKINGS_VIEW },
  { title: "To-Do List", url: "/todos", icon: CheckSquare, permission: PERMISSIONS.TODOS_VIEW_OWN },
  { title: "Issues & Photos", url: "/issues", icon: AlertTriangle, permission: PERMISSIONS.ISSUES_VIEW },
];

const documentMenuItems = [
  { title: "Contracts", url: "/documents/contracts", icon: FileText, permission: PERMISSIONS.DOCUMENTS_CONTRACTS_VIEW },
  { title: "Employee Documents", url: "/documents/employee", icon: FileText, permission: PERMISSIONS.DOCUMENTS_EMPLOYEE_VIEW },
  { title: "Access Authorization", url: "/documents/access", icon: FileText, permission: PERMISSIONS.DOCUMENTS_ACCESS_VIEW },
  { title: "Building COIs", url: "/documents/building", icon: FileText, permission: PERMISSIONS.DOCUMENTS_COI_VIEW },
  { title: "Service Authorization", url: "/documents/service", icon: FileText, permission: PERMISSIONS.DOCUMENTS_SERVICE_VIEW },
  { title: "Messages Templates", url: "/documents/messages", icon: FileText, permission: PERMISSIONS.DOCUMENTS_MESSAGES_VIEW },
];

const financeMenuItems = [
  { title: "Service Pipeline", url: "/finance/pipeline", icon: DollarSign, permission: PERMISSIONS.PIPELINE_VIEW },
  { title: "Invoices", url: "/finance/invoices", icon: DollarSign, permission: PERMISSIONS.INVOICES_VIEW },
  { title: "Commissions", url: "/finance/commissions", icon: DollarSign, permission: PERMISSIONS.COMMISSIONS_VIEW_ALL },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { hasPermission } = usePermissions();

  // Filter menu items based on permissions
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

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    `transition-all duration-200 ${
      isActive 
        ? "bg-gradient-primary text-primary-foreground font-medium shadow-primary" 
        : "hover:bg-primary/10 hover:text-primary text-muted-foreground"
    }`;

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
              <SidebarGroupLabel className="text-white/70 text-xs uppercase tracking-wider px-6 mb-2">
                Main
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="px-3">
              <SidebarMenu className="space-y-1">
                {visibleMainMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-5 w-5 min-w-5" />
                        {!isCollapsed && <span className="ml-3">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Documents */}
        {visibleDocumentMenuItems.length > 0 && (
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-white/70 text-xs uppercase tracking-wider px-6 mb-2">
                Documents
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="px-3">
              <SidebarMenu className="space-y-1">
                {visibleDocumentMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-5 w-5 min-w-5" />
                        {!isCollapsed && <span className="ml-3">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Finance */}
        {visibleFinanceMenuItems.length > 0 && (
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-white/70 text-xs uppercase tracking-wider px-6 mb-2">
                Finance
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="px-3">
              <SidebarMenu className="space-y-1">
                {visibleFinanceMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-5 w-5 min-w-5" />
                        {!isCollapsed && <span className="ml-3">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Media */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-white/70 text-xs uppercase tracking-wider px-6 mb-2">
              Media
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="px-3">
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/media" className={getNavCls}>
                    <Image className="h-5 w-5 min-w-5" />
                    {!isCollapsed && <span className="ml-3">Photos & Videos</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Highlights */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-white/70 text-xs uppercase tracking-wider px-6 mb-2">
              Highlights
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="px-3">
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/highlights" className={getNavCls}>
                    <Star className="h-5 w-5 min-w-5" />
                    {!isCollapsed && <span className="ml-3">Highlights</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}