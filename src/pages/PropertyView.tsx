import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import {
  ArrowLeft,
  Home,
  Users,
  Car,
  FileText,
  Zap,
  Sparkles,
  CalendarDays,
  DollarSign,
} from 'lucide-react';
import { CasaSpinner } from '@/components/ui/casa-loader';
import { usePropertyDetail } from '@/hooks/usePropertiesOptimized';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Tab Components
import { GeneralTabOptimized } from '@/components/PropertyEdit/GeneralTabOptimized';
import { FeaturesTabOptimized } from '@/components/PropertyEdit/FeaturesTabOptimized';
import { ProvidersTabOptimized } from '@/components/PropertyEdit/ProvidersTabOptimized';
import { UnitOwnersTabOptimized } from '@/components/PropertyEdit/UnitOwnersTabOptimized';
import { VehiclesTabOptimized } from '@/components/PropertyEdit/VehiclesTabOptimized';
import { NotesTabOptimized } from '@/components/PropertyEdit/NotesTabOptimized';
import { HighlightsTab } from '@/components/PropertyEdit/HighlightsTab';
import { BookingsTab } from '@/components/PropertyEdit/BookingsTab';
import { FinancialTab } from '@/components/PropertyEdit/FinancialTab';

export default function PropertyView() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use the optimized detail hook that loads only this property's full data
  let { property, loading, error, refetch } = usePropertyDetail(propertyId);

  // Safety check: Handle raw Supabase response from cache
  if (property && typeof property === 'object' && 'data' in property && 'error' in property && 'status' in property) {
    console.warn('[PropertyView] Detected raw Supabase response, extracting data...');
    property = (property as any).data;
  }

  const handleTabChange = (newTab: string) => {
    if (hasUnsavedChanges && newTab !== activeTab) {
      setPendingTab(newTab);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleConfirmTabChange = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setHasUnsavedChanges(false);
    }
    setShowUnsavedDialog(false);
    setPendingTab(null);
  };

  const handleCancelTabChange = () => {
    setShowUnsavedDialog(false);
    setPendingTab(null);
  };

  // Listen for unsaved changes events from tabs
  React.useEffect(() => {
    const handleUnsavedChanges = (e: CustomEvent) => {
      setHasUnsavedChanges(e.detail.hasChanges);
    };
    window.addEventListener('property-edit-unsaved-changes', handleUnsavedChanges as EventListener);
    return () => window.removeEventListener('property-edit-unsaved-changes', handleUnsavedChanges as EventListener);
  }, []);

  // Listen for property updates from tabs (to refresh header)
  React.useEffect(() => {
    const handlePropertyUpdate = () => {
      console.log('[PropertyView] Received property update event, refetching...');
      if (refetch) {
        refetch();
      }
    };
    window.addEventListener('property-updated', handlePropertyUpdate);
    return () => window.removeEventListener('property-updated', handlePropertyUpdate);
  }, [refetch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <CasaSpinner />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-destructive">Error Loading Property</h1>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Failed to load property details'}
          </p>
          <Button variant="outline" onClick={() => navigate('/properties')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  // Handle not found state
  if (!loading && !property) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The property you're looking for doesn't exist or has been deleted.
          </p>
          <Button variant="outline" onClick={() => navigate('/properties')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  // Handle property loaded but missing ID (data integrity issue)
  if (!loading && property && !property.property_id) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center max-w-2xl">
          <h1 className="text-2xl font-bold mb-4 text-destructive">Data Error</h1>
          <p className="text-muted-foreground mb-4">
            Property data is corrupted or incomplete (missing property_id).
          </p>
          <Button variant="outline" onClick={() => navigate('/properties')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto p-6">
        {/* Enhanced Header */}
        <PageHeader
          icon={Home}
          title={property.property_name}
          subtitle={`${property.property_type || 'Property'} - ${property.num_bedrooms || 0} bed, ${property.num_bathrooms || 0} bath`}
          action={
            <Button variant="outline" onClick={() => navigate('/properties')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />

        {/* Enhanced Tabs Card */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              {/* Clean Tab Navigation */}
              <div className="border-b bg-muted/30">
                <div className="px-6 pt-4 overflow-x-auto">
                  <TabsList className="inline-flex h-auto p-1 bg-muted/50 rounded-lg gap-1">
                    <TabsTrigger
                      value="general"
                      className="px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium flex items-center gap-2 transition-all"
                    >
                      <Home className="h-4 w-4" />
                      <span className="hidden sm:inline">General</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="features"
                      className="px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium flex items-center gap-2 transition-all"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline">Features</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="highlights"
                      className="px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium flex items-center gap-2 transition-all"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline">Highlights</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="providers"
                      className="px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium flex items-center gap-2 transition-all"
                    >
                      <Zap className="h-4 w-4" />
                      <span className="hidden sm:inline">Providers</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="owners"
                      className="px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium flex items-center gap-2 transition-all"
                    >
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Owners</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="vehicles"
                      className="px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium flex items-center gap-2 transition-all"
                    >
                      <Car className="h-4 w-4" />
                      <span className="hidden sm:inline">Vehicles</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="notes"
                      className="px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium flex items-center gap-2 transition-all"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Notes</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="bookings"
                      className="px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium flex items-center gap-2 transition-all"
                    >
                      <CalendarDays className="h-4 w-4" />
                      <span className="hidden sm:inline">Bookings</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="financial"
                      className="px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium flex items-center gap-2 transition-all"
                    >
                      <DollarSign className="h-4 w-4" />
                      <span className="hidden sm:inline">Financial</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <div className="p-6">
                <TabsContent value="general" className="mt-0">
                  <GeneralTabOptimized property={property} />
                </TabsContent>

                <TabsContent value="features" className="mt-0">
                  <FeaturesTabOptimized propertyId={property.property_id} />
                </TabsContent>

                <TabsContent value="highlights" className="mt-0">
                  <HighlightsTab propertyId={property.property_id} />
                </TabsContent>

                <TabsContent value="providers" className="mt-0">
                  <ProvidersTabOptimized propertyId={property.property_id} />
                </TabsContent>

                <TabsContent value="owners" className="mt-0">
                  <UnitOwnersTabOptimized propertyId={property.property_id} />
                </TabsContent>

                <TabsContent value="vehicles" className="mt-0">
                  <VehiclesTabOptimized propertyId={property.property_id} />
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  <NotesTabOptimized propertyId={property.property_id} />
                </TabsContent>

                <TabsContent value="bookings" className="mt-0">
                  <BookingsTab propertyId={property.property_id} propertyName={property.property_name} />
                </TabsContent>

                <TabsContent value="financial" className="mt-0">
                  <FinancialTab propertyId={property.property_id} propertyName={property.property_name} />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Unsaved Changes Confirmation Dialog */}
        <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes on this tab. If you leave now, your changes will be lost. Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelTabChange}>Stay on This Tab</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmTabChange} className="bg-destructive hover:bg-destructive/90">
                Leave Without Saving
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
