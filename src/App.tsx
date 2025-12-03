import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedRoute as RBACProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "./components/MainLayout";
import { Analytics } from "@vercel/analytics/react";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import PropertyView from "./pages/PropertyView";
import Jobs from "./pages/Jobs";
import UserManagement from "./pages/UserManagement";
import GuestManagement from "./pages/GuestManagement";
import Providers from "./pages/Providers";
// ServiceProviders and UtilityProviders routes redirect to /vendors
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Calendar from "./pages/Calendar";
import BookingManagement from "./pages/BookingManagement";
import Todos from "./pages/Todos";
import Issues from "./pages/Issues";
import ActivityLogs from "./pages/ActivityLogs";
import Invoices from "./pages/Invoices";
import InvoiceForm from "./pages/InvoiceForm";
import BookingSelector from "./pages/BookingSelector";
import Expenses from "./pages/Expenses";
import OwnerStatement from "./pages/OwnerStatement";
import BillTemplates from "./pages/BillTemplates";
import FinancialDashboard from "./pages/FinancialDashboard";
import ServicePipeline from "./pages/ServicePipeline";
import Contracts from "./pages/Contracts";
import EmployeeDocuments from "./pages/EmployeeDocuments";
import ServiceDocuments from "./pages/ServiceDocuments";
import MessageTemplates from "./pages/MessageTemplates";
import Messages from "./pages/Messages";
import Reports from "./pages/Reports";
import Help from "./pages/Help";
import VendorCOIs from "./pages/VendorCOIs";
import AccessAuthorizations from "./pages/AccessAuthorizations";
// ServiceScheduling functionality merged into Providers.tsx
import CheckInOut from "./pages/CheckInOut";
import ChecklistTemplates from "./pages/ChecklistTemplates";
import Media from "./pages/Media";
import Highlights from "./pages/Highlights";
import Commissions from "./pages/Commissions";
import Notifications from "./pages/Notifications";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createOptimizedQueryClient, initializeCacheManagers } from "@/lib/cache-manager-simplified";
import { initializeOptimizedPrefetcher } from "@/lib/intelligent-prefetcher-optimized";
import { initializeRealtimeSync } from "@/lib/realtime-cache-sync";
import { serviceWorkerManager } from "@/lib/service-worker-manager";
import { indexedDBCache } from "@/lib/indexeddb-cache";
import { initializeStatePersistence } from "@/lib/state-persistence";

// Create optimized query client with simplified caching (no localStorage redundancy)
const queryClient = createOptimizedQueryClient();

// Extend window for debugging utilities
declare global {
  interface Window {
    __queryClient: typeof queryClient;
    getCacheStats?: () => void;
  }
}

// Make queryClient available globally for debugging
if (typeof window !== 'undefined') {
  window.__queryClient = queryClient;
}

// Initialize cache managers for intelligent prefetching and background sync
let backgroundSyncManager: ReturnType<typeof initializeCacheManagers>['backgroundSyncManager'] | null = null;
let cacheInvalidationManager: ReturnType<typeof initializeCacheManagers>['cacheInvalidationManager'] | null = null;
let cacheWarmer: ReturnType<typeof initializeCacheManagers>['cacheWarmer'] | null = null;
let intelligentPrefetcher: ReturnType<typeof initializeOptimizedPrefetcher> | null = null;
let realtimeSync: ReturnType<typeof initializeRealtimeSync> | null = null;

// Initialize state persistence for complete offline capability
const statePersistenceManager = initializeStatePersistence(queryClient);

// Initialize service worker and browser-level caching
if (typeof window !== 'undefined') {
  // Initialize simplified cache managers (no localStorage redundancy)
  const managers = initializeCacheManagers(queryClient);
  backgroundSyncManager = managers.backgroundSyncManager;
  cacheInvalidationManager = managers.cacheInvalidationManager;
  cacheWarmer = managers.cacheWarmer;
  console.log('✅ Simplified cache managers initialized');

  // Initialize optimized prefetcher (less aggressive: 85% confidence, 5-item queue)
  intelligentPrefetcher = initializeOptimizedPrefetcher(queryClient);
  console.log('✅ Optimized prefetcher initialized');

  // Initialize realtime cache sync (auto-invalidate on DB changes)
  realtimeSync = initializeRealtimeSync(queryClient);
  realtimeSync.initialize().then(() => {
    console.log('✅ Realtime cache sync active');
  }).catch((error: unknown) => {
    console.warn('⚠️ Realtime sync initialization failed (will continue without auto-invalidation):', error);
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

        // Get optimized prefetch insights
        if (intelligentPrefetcher) {
          try {
            prefetchInsights = intelligentPrefetcher.getInsights();
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

        // Also log React Query cache stats
        if (typeof window.getCacheStats === 'function') {
          window.getCacheStats();
        }
      } catch (error) {
        console.warn('⚠️ Performance monitoring error:', error);
      }
    }, 30 * 1000);
  }

  console.log('🚀 All cache systems initialized successfully');
}

const App = () => (
  <ErrorBoundary>
    <Analytics />
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SessionTimeoutWarning />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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

                {/* Vendors - Admin and Ops can access */}
                <Route
                  path="/vendors"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.SERVICE_PROVIDERS_VIEW}>
                      <Providers />
                    </RBACProtectedRoute>
                  }
                />
                {/* Legacy redirect for /providers */}
                <Route path="/providers" element={<Navigate to="/vendors" replace />} />

                {/* Service Scheduling - Redirect to unified Vendors page */}
                <Route
                  path="/service-scheduling"
                  element={<Navigate to="/vendors" replace />}
                />

                {/* Legacy Routes - Keep for backward compatibility, redirect to unified page */}
                <Route
                  path="/service-providers"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.SERVICE_PROVIDERS_VIEW}>
                      <Providers />
                    </RBACProtectedRoute>
                  }
                />
                <Route
                  path="/utility-providers"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.UTILITY_PROVIDERS_VIEW}>
                      <Providers />
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
                  path="/properties/:propertyId/view"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.PROPERTIES_VIEW}>
                      <PropertyView />
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

                {/* Booking Management - Both can access */}
                <Route
                  path="/bookings"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.BOOKINGS_VIEW}>
                      <BookingManagement />
                    </RBACProtectedRoute>
                  }
                />

                {/* Guest Management - Admin and Ops can access */}
                <Route
                  path="/guests"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.GUESTS_VIEW}>
                      <GuestManagement />
                    </RBACProtectedRoute>
                  }
                />

                {/* To-Do List / Tasks - View own or all based on role */}
                <Route
                  path="/todos"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.TODOS_VIEW_OWN}>
                      <Todos />
                    </RBACProtectedRoute>
                  }
                />

                {/* Profile - Everyone can access */}
                <Route path="/profile" element={<Profile />} />

                {/* Help - Everyone can access */}
                <Route path="/help" element={<Help />} />

                {/* Notifications - Everyone can access */}
                <Route path="/notifications" element={<Notifications />} />

                {/* Messages - Everyone can access */}
                <Route path="/messages" element={<Messages />} />

                {/* Reports - Admin and Ops can access */}
                <Route
                  path="/reports"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.REPORTS_VIEW}>
                      <Reports />
                    </RBACProtectedRoute>
                  }
                />

                {/* Issues & Photos - Both can access */}
                <Route
                  path="/issues"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.ISSUES_VIEW}>
                      <Issues />
                    </RBACProtectedRoute>
                  }
                />

                {/* Activity Logs - Admin Only */}
                <Route
                  path="/activity-logs"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.SYSTEM_AUDIT}>
                      <ActivityLogs />
                    </RBACProtectedRoute>
                  }
                />

                {/* Contracts - Finance team */}
                <Route
                  path="/contracts"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.DOCUMENTS_CONTRACTS_VIEW}>
                      <Contracts />
                    </RBACProtectedRoute>
                  }
                />

                {/* Employee Documents - HR/Admin */}
                <Route
                  path="/employee-documents"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.DOCUMENTS_EMPLOYEE_VIEW}>
                      <EmployeeDocuments />
                    </RBACProtectedRoute>
                  }
                />

                {/* Service Documents - Operations */}
                <Route
                  path="/service-documents"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.DOCUMENTS_SERVICE_VIEW}>
                      <ServiceDocuments />
                    </RBACProtectedRoute>
                  }
                />

                {/* Message Templates - Communications */}
                <Route
                  path="/message-templates"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.DOCUMENTS_MESSAGES_VIEW}>
                      <MessageTemplates />
                    </RBACProtectedRoute>
                  }
                />

                {/* Vendor COIs - Admin and Ops can access */}
                <Route
                  path="/vendor-cois"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.SERVICE_PROVIDERS_VIEW}>
                      <VendorCOIs />
                    </RBACProtectedRoute>
                  }
                />

                {/* Access Authorizations - Admin and Ops can access */}
                <Route
                  path="/access-authorizations"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.SERVICE_PROVIDERS_VIEW}>
                      <AccessAuthorizations />
                    </RBACProtectedRoute>
                  }
                />

                {/* Accounting & Billing - View permissions required */}
                <Route
                  path="/invoices"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <Invoices />
                    </RBACProtectedRoute>
                  }
                />
                <Route
                  path="/invoices/new"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <BookingSelector />
                    </RBACProtectedRoute>
                  }
                />
                <Route
                  path="/invoices/new/from-booking/:bookingId"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <InvoiceForm />
                    </RBACProtectedRoute>
                  }
                />
                <Route
                  path="/invoices/new/manual"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <InvoiceForm />
                    </RBACProtectedRoute>
                  }
                />
                <Route
                  path="/invoices/:invoiceId"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <InvoiceForm />
                    </RBACProtectedRoute>
                  }
                />
                <Route
                  path="/expenses"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <Expenses />
                    </RBACProtectedRoute>
                  }
                />
                <Route
                  path="/owner-statement"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <OwnerStatement />
                    </RBACProtectedRoute>
                  }
                />
                <Route
                  path="/bill-templates"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <BillTemplates />
                    </RBACProtectedRoute>
                  }
                />
                <Route
                  path="/financial-dashboard"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <FinancialDashboard />
                    </RBACProtectedRoute>
                  }
                />

                {/* Finance - Service Pipeline */}
                <Route
                  path="/finance/pipeline"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.PIPELINE_VIEW}>
                      <ServicePipeline />
                    </RBACProtectedRoute>
                  }
                />

                {/* Media - Both can access */}
                <Route
                  path="/media"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.MEDIA_VIEW}>
                      <Media />
                    </RBACProtectedRoute>
                  }
                />

                {/* Check-In / Check-Out - Both can access */}
                <Route
                  path="/check-in-out"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.PROPERTIES_VIEW}>
                      <CheckInOut />
                    </RBACProtectedRoute>
                  }
                />

                {/* Checklist Templates - Both can access */}
                <Route
                  path="/checklist-templates"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.PROPERTIES_VIEW}>
                      <ChecklistTemplates />
                    </RBACProtectedRoute>
                  }
                />

                {/* Highlights - Finance team can access */}
                <Route
                  path="/highlights"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <Highlights />
                    </RBACProtectedRoute>
                  }
                />

                {/* Commissions - Finance team can access */}
                <Route
                  path="/commissions"
                  element={
                    <RBACProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
                      <Commissions />
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
