import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedRoute as RBACProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import PropertyEdit from "./pages/PropertyEdit";
import Jobs from "./pages/Jobs";
import UserManagement from "./pages/UserManagement";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Calendar from "./pages/Calendar";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createOptimizedQueryClient, initializeCacheManagers } from "@/lib/cache-manager";
import { serviceWorkerManager } from "@/lib/service-worker-manager";
import { indexedDBCache } from "@/lib/indexeddb-cache";
import { initializeStatePersistence } from "@/lib/state-persistence";

// Create optimized query client with advanced caching and persistence
const queryClient = createOptimizedQueryClient();

// Initialize cache managers for intelligent prefetching and background sync
let prefetchManager: any = null;
let backgroundSyncManager: any = null;
let intelligentPrefetcher: any = null;

// Initialize state persistence for complete offline capability
const statePersistenceManager = initializeStatePersistence(queryClient);

// Initialize service worker and browser-level caching
if (typeof window !== 'undefined') {
  // Initialize cache managers asynchronously
  initializeCacheManagers(queryClient).then((managers) => {
    if (managers.prefetchManager) {
      prefetchManager = managers.prefetchManager;
      console.log('✅ Prefetch manager ready');
    }
    if (managers.backgroundSyncManager) {
      backgroundSyncManager = managers.backgroundSyncManager;
      console.log('✅ Background sync manager ready');
    }
    if (managers.intelligentPrefetcher) {
      intelligentPrefetcher = managers.intelligentPrefetcher;
      console.log('✅ Intelligent prefetcher ready');
    }
    console.log('🧠 Cache managers initialization completed');
  }).catch((error) => {
    console.warn('⚠️ Failed to initialize cache managers (app will continue without advanced caching):', error);
  });

  // Register service worker for advanced caching strategies
  serviceWorkerManager.register().then(() => {
    // Preload critical resources once service worker is ready
    serviceWorkerManager.preloadCriticalResources();
  });

  // Initialize IndexedDB cache
  indexedDBCache.init().then(() => {
    console.log('🗄️ Browser-level caching initialized');

    // Restore query state from persistence
    statePersistenceManager.restoreQueryState();
  });

  // Clean up expired cache periodically
  setInterval(() => {
    indexedDBCache.clearExpired();
  }, 60 * 60 * 1000); // Every hour

  // Performance monitoring
  if (process.env.NODE_ENV === 'development') {
    // Log cache performance statistics every 30 seconds
    setInterval(async () => {
      try {
        const cacheStats = await serviceWorkerManager.getCacheStats();
        let prefetchInsights = null;

        // Safely get prefetch insights
        if (intelligentPrefetcher) {
          try {
            prefetchInsights = await intelligentPrefetcher.getInsights();
          } catch (error) {
            console.warn('⚠️ Failed to get prefetch insights:', error);
          }
        }

        const stateSize = statePersistenceManager.getStateSize();

        console.log('📊 Performance Stats:', {
          cache: cacheStats,
          prefetch: prefetchInsights,
          state: stateSize
        });
      } catch (error) {
        console.warn('⚠️ Performance monitoring error:', error);
      }
    }, 30 * 1000);
  }
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              <Route path="/" element={
                <ProtectedRoute requireAuth={true}>
                  <MainLayout />
                </ProtectedRoute>
              }>
                {/* Dashboard - Everyone can access */}
                <Route index element={<Dashboard />} />

                {/* User Management - Admin Only */}
                <Route
                  path="/users"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.USERS_VIEW}>
                      <UserManagement />
                    </RBACProtectedRoute>
                  }
                />

                {/* Properties - Both Admin and Ops can access */}
                <Route
                  path="/properties"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.PROPERTIES_VIEW}>
                      <Properties />
                    </RBACProtectedRoute>
                  }
                />
                <Route
                  path="/properties/:propertyId/edit"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.PROPERTIES_EDIT}>
                      <PropertyEdit />
                    </RBACProtectedRoute>
                  }
                />

                {/* Jobs - Both Admin and Ops can access */}
                <Route
                  path="/jobs"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.JOBS_VIEW}>
                      <Jobs />
                    </RBACProtectedRoute>
                  }
                />

                {/* Calendar - Both can access */}
                <Route
                  path="/calendar"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.BOOKINGS_VIEW}>
                      <Calendar />
                    </RBACProtectedRoute>
                  }
                />

                {/* Profile - Everyone can access */}
                <Route path="/profile" element={<Profile />} />

                {/* Issues & Photos - Both can access */}
                <Route
                  path="/issues"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.ISSUES_VIEW}>
                      <div className="p-8 text-center text-muted-foreground">Issues & Photos - Coming Soon</div>
                    </RBACProtectedRoute>
                  }
                />

                {/* Documents - Various permissions */}
                <Route path="/documents/*" element={<div className="p-8 text-center text-muted-foreground">Documents - Coming Soon</div>} />

                {/* Finance - View permissions required */}
                <Route
                  path="/finance/*"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <div className="p-8 text-center text-muted-foreground">Finance - Coming Soon</div>
                    </RBACProtectedRoute>
                  }
                />

                {/* Media - Both can access */}
                <Route
                  path="/media"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.MEDIA_VIEW}>
                      <div className="p-8 text-center text-muted-foreground">Media - Coming Soon</div>
                    </RBACProtectedRoute>
                  }
                />

                {/* Highlights - Both can access */}
                <Route
                  path="/highlights"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.HIGHLIGHTS_VIEW}>
                      <div className="p-8 text-center text-muted-foreground">Highlights - Coming Soon</div>
                    </RBACProtectedRoute>
                  }
                />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
