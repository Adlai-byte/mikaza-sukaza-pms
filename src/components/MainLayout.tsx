import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "./ui/button";
import { Bell, User, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MainLayout() {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar key={profile?.user_type} />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 sm:h-16 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center justify-between h-full px-3 sm:px-6">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <SidebarTrigger />
                <div className="hidden sm:block text-sm text-foreground font-medium">
                  Agent: Casa & Concierge
                </div>
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-[10px] flex items-center justify-center text-white">
                    3
                  </span>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 h-8 sm:h-10 px-2 sm:px-3">
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                        <AvatarImage src={profile?.photo_url} alt={profile?.first_name || 'User'} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                          {getInitials(profile?.first_name, profile?.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden xs:inline text-xs sm:text-sm">
                        {profile?.first_name || 'User'}
                      </span>
                      {isAdmin && (
                        <Badge variant="secondary" className="text-xs ml-1">
                          Admin
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      <p>{profile?.email}</p>
                      <p className="text-xs">Role: {profile?.user_type}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}