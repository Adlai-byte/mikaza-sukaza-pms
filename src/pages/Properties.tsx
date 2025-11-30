import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Home, Building2, MapPin, Users, Database, Settings } from "lucide-react";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { PropertyTableOptimized } from "@/components/PropertyManagement/PropertyTableOptimized";
import { PropertyForm } from "@/components/PropertyManagement/PropertyForm";
import { PropertyDetailsDialog } from "@/components/PropertyManagement/PropertyDetailsDialog";
import { PropertyImageDialog } from "@/components/PropertyManagement/PropertyImageDialog";
import { PropertyQRCodeDialog } from "@/components/PropertyManagement/PropertyQRCodeDialog";
import { PropertySettingsDialog } from "@/components/PropertyManagement/PropertySettingsDialog";
import { Property, PropertyInsert } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";

export default function Properties() {
  const { t } = useTranslation();
  const {
    properties = [],
    loading,
    isFetching,
    amenities = [],
    rules = [],
    createProperty,
    updateProperty,
    deleteProperty,
    refetch,
    isCreating,
    isUpdating,
    isDeleting,
    error: propertiesError
  } = usePropertiesOptimized();

  // Force refetch on mount to ensure fresh data with owner and images
  useEffect(() => {
    refetch();
  }, []);

  const { logActivity } = useActivityLogs();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [imageDialogProperty, setImageDialogProperty] = useState<Property | null>(null);
  const [qrCodeDialogProperty, setQrCodeDialogProperty] = useState<Property | null>(null);

  // Show error message if properties failed to load
  useEffect(() => {
    if (propertiesError) {
      toast({
        title: t('properties.errorLoading'),
        description: propertiesError instanceof Error ? propertiesError.message : t('properties.failedToLoad'),
        variant: "destructive",
      });
    }
  }, [propertiesError, toast, t]);

  const handleCreateProperty = async (propertyData: PropertyInsert & any) => {
    try {
      console.log('🏠 [Properties] Creating property:', propertyData);
      await createProperty(propertyData);

      // Hook handles cache update, refetch, and success toast
      setIsFormOpen(false);
    } catch (error) {
      // Hook handles error toast
      console.error('❌ [Properties] Error creating property:', error);
    }
  };

  const handleUpdateProperty = async (propertyData: PropertyInsert & any) => {
    if (!editingProperty?.property_id) {
      toast({
        title: t('common.error'),
        description: t('properties.noPropertySelected'),
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🏠 [Properties] Updating property:', editingProperty.property_id);
      await updateProperty(editingProperty.property_id, propertyData);

      // Hook handles cache update, refetch, and success toast
      setEditingProperty(null);
      setIsFormOpen(false);
    } catch (error) {
      // Hook handles error toast
      console.error('❌ [Properties] Error updating property:', error);
    }
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setIsFormOpen(true);
  };

  const handleDeleteProperty = async (propertyId: string) => {
    const property = properties.find(p => p.property_id === propertyId);
    if (!property) {
      toast({
        title: t('common.error'),
        description: t('properties.propertyNotFound'),
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🗑️ [Properties] Deleting property:', propertyId);
      await deleteProperty(propertyId);

      // Hook handles cache update, refetch, and success toast
    } catch (error) {
      // Hook handles error toast
      console.error('❌ [Properties] Error deleting property:', error);
    }
  };

  const handleViewDetails = (property: Property) => {
    setViewingProperty(property);
  };

  const handleViewImages = (property: Property) => {
    setImageDialogProperty(property);
  };

  const handleViewQRCodes = (property: Property) => {
    setQrCodeDialogProperty(property);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProperty(null);
  };

  const activeProperties = properties?.filter(property => property.is_active)?.length ?? 0;
  const bookingProperties = properties?.filter(property => property.is_booking)?.length ?? 0;
  const petFriendlyProperties = properties?.filter(property => property.is_pets_allowed)?.length ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">{t('properties.loadingProperties')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('properties.title')}
        subtitle={t('properties.subtitle')}
        icon={Home}
        actions={
          <>
            <Button onClick={() => setIsSettingsOpen(true)} variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>
              <Home className="mr-2 h-4 w-4" />
              {t('properties.newProperty')}
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">{t('properties.totalProperties')}</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">{properties.length}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">{t('properties.activeProperties')}</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">{activeProperties}</h3>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <Home className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">{t('properties.bookingAvailable')}</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">{bookingProperties}</h3>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">{t('properties.petFriendly')}</p>
                <h3 className="text-3xl font-bold text-orange-900 mt-1">{petFriendlyProperties}</h3>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('properties.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">{t('properties.loadingProperties')}</div>
            </div>
          ) : (
            <PropertyTableOptimized
              properties={properties}
              onEditProperty={handleEditProperty}
              onDeleteProperty={handleDeleteProperty}
              onViewDetails={handleViewDetails}
              onViewImages={handleViewImages}
              onViewQRCodes={handleViewQRCodes}
              isLoading={loading}
              isFetching={isFetching}
            />
          )}
        </CardContent>
      </Card>

      {/* Property Form Modal */}
      <PropertyForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        property={editingProperty}
        onSubmit={editingProperty ? handleUpdateProperty : handleCreateProperty}
        amenities={amenities}
        rules={rules}
      />

      {/* Property Settings Dialog */}
      <PropertySettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />

      {/* Property Details Dialog */}
      {viewingProperty && (
        <PropertyDetailsDialog
          open={!!viewingProperty}
          onOpenChange={(open) => !open && setViewingProperty(null)}
          property={viewingProperty}
        />
      )}

      {/* Property Image Dialog */}
      {imageDialogProperty && (
        <PropertyImageDialog
          open={!!imageDialogProperty}
          onOpenChange={(open) => !open && setImageDialogProperty(null)}
          property={imageDialogProperty}
        />
      )}

      {/* Property QR Code Dialog */}
      {qrCodeDialogProperty && (
        <PropertyQRCodeDialog
          open={!!qrCodeDialogProperty}
          onOpenChange={(open) => !open && setQrCodeDialogProperty(null)}
          property={qrCodeDialogProperty}
        />
      )}
    </div>
  );
}