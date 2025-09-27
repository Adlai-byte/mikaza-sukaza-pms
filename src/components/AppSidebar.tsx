import { useState } from "react";
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

const mainMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "User Management", url: "/users", icon: Users },
  { title: "Properties", url: "/properties", icon: Building },
  { title: "Active Jobs", url: "/jobs", icon: BriefcaseIcon },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "To-Do List", url: "/todos", icon: CheckSquare },
  { title: "Issues & Photos", url: "/issues", icon: AlertTriangle },
];

const documentMenuItems = [
  { title: "Contracts", url: "/documents/contracts", icon: FileText },
  { title: "Employee Documents", url: "/documents/employee", icon: FileText },
  { title: "Access Authorization", url: "/documents/access", icon: FileText },
  { title: "Building COIs", url: "/documents/building", icon: FileText },
  { title: "Service Authorization", url: "/documents/service", icon: FileText },
  { title: "Messages Templates", url: "/documents/messages", icon: FileText },
];

const financeMenuItems = [
  { title: "Service Pipeline", url: "/finance/pipeline", icon: DollarSign },
  { title: "Invoices", url: "/finance/invoices", icon: DollarSign },
  { title: "Commissions", url: "/finance/commissions", icon: DollarSign },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

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
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-white/70 text-xs uppercase tracking-wider px-6 mb-2">
              Main
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="px-3">
            <SidebarMenu className="space-y-1">
              {mainMenuItems.map((item) => (
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

        {/* Documents */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-white/70 text-xs uppercase tracking-wider px-6 mb-2">
              Documents
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="px-3">
            <SidebarMenu className="space-y-1">
              {documentMenuItems.map((item) => (
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

        {/* Finance */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-white/70 text-xs uppercase tracking-wider px-6 mb-2">
              Finance
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="px-3">
            <SidebarMenu className="space-y-1">
              {financeMenuItems.map((item) => (
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