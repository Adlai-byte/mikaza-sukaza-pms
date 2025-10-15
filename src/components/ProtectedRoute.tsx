import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean; // Can be disabled temporarily
}

export function ProtectedRoute({ children, requireAuth = false }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  // Check if user is authenticated (either via Supabase auth or session mode)
  const isAuthenticated = !!(user || profile);

  useEffect(() => {
    // If auth is not required, always show the content
    if (!requireAuth) {
      return;
    }

    // If auth is required but still loading, wait
    if (loading) {
      return;
    }

    // If auth is required and not authenticated, redirect to auth page
    if (!isAuthenticated) {
      console.log('🚫 ProtectedRoute: Not authenticated, redirecting to /auth');
      navigate("/auth", { replace: true });
    } else {
      console.log('✅ ProtectedRoute: Authenticated, allowing access');
    }
  }, [isAuthenticated, loading, navigate, requireAuth]);

  // Show loading while checking auth status
  if (requireAuth && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If auth is required but not authenticated, don't render anything (will redirect)
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}