import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean; // Can be disabled temporarily
}

export function ProtectedRoute({ children, requireAuth = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If auth is not required, always show the content
    if (!requireAuth) {
      return;
    }

    // If auth is required but user is not loaded yet, wait
    if (loading) {
      return;
    }

    // If auth is required and no user, redirect to auth page
    if (!user) {
      navigate("/auth");
    }
  }, [user, loading, navigate, requireAuth]);

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

  // If auth is required but no user, don't render anything (will redirect)
  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}