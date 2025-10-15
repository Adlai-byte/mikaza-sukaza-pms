import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Building2, MapPin, Users, Database } from "lucide-react";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { PropertyTableOptimized } from "@/components/PropertyManagement/PropertyTableOptimized";
import { PropertyForm } from "@/components/PropertyManagement/PropertyForm";
import { PropertyDetailsDialog } from "@/components/PropertyManagement/PropertyDetailsDialog";
import { PropertyImageDialog } from "@/components/PropertyManagement/PropertyImageDialog";
import { Property, PropertyInsert } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";

export default function Properties() {
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

  const { logActivity } = useActivityLogs();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [imageDialogProperty, setImageDialogProperty] = useState<Property | null>(null);

  // Show error message if properties failed to load
  useEffect(() => {
    if (propertiesError) {
      toast({
        title: "Error loading properties",
        description: propertiesError instanceof Error ? propertiesError.message : "Failed to load properties",
        variant: "destructive",
      });
    }
  }, [propertiesError, toast]);

  const handleGenerateMockProperties = async () => {
    setIsGeneratingMocks(true);
    try {
      const results = await generateMockProperties(100);
      
      // React Query will automatically update the cache
      
      toast({
        title: "Success",
        description: `Successfully generated ${results.length} mock properties`,
      });
    } catch (error) {
      console.error('Error generating properties:', error);
      toast({
        title: "Error loading properties",
        description: propertiesError instanceof Error ? propertiesError.message : "Failed to load properties",
        variant: "destructive",
      });
    }
  }, [propertiesError, toast]);

  const handleCreateProperty = async (propertyData: PropertyInsert & any) => {
    try {
      await createProperty(propertyData);
      await logActivity('PROPERTY_CREATED', { 
        propertyType: propertyData.property_type,
        ownerId: propertyData.owner_id
      }, undefined, 'Admin');
      toast({
        title: "Success",
        description: "Property created successfully",
      });
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error creating property:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create property",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProperty = async (propertyData: PropertyInsert & any) => {
    if (!editingProperty?.property_id) {
      toast({
        title: "Error",
        description: "No property selected for update",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProperty(editingProperty.property_id, propertyData);
      await logActivity('PROPERTY_UPDATED', { 
        propertyId: editingProperty.property_id,
        propertyType: propertyData.property_type 
      }, undefined, 'Admin');
      setEditingProperty(null);
      setIsFormOpen(false);
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update property",
        variant: "destructive",
      });
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
        title: "Error",
        description: "Property not found",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteProperty(propertyId);
      await logActivity('PROPERTY_DELETED', { 
        propertyId,
        propertyType: property.property_type 
      }, undefined, 'Admin');
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete property",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (property: Property) => {
    setViewingProperty(property);
  };

  const handleViewImages = (property: Property) => {
    setImageDialogProperty(property);
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
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Property Management</h1>
          <p className="text-muted-foreground">
            Manage properties, locations, and amenities
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="self-start sm:self-auto">
          <Home className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Properties</p>
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
                <p className="text-sm font-medium text-green-700">Active Properties</p>
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
                <p className="text-sm font-medium text-purple-700">Booking Available</p>
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
                <p className="text-sm font-medium text-orange-700">Pet Friendly</p>
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
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading properties...</div>
            </div>
          ) : (
            <PropertyTableOptimized
              properties={properties}
              onEditProperty={handleEditProperty}
              onDeleteProperty={handleDeleteProperty}
              onViewDetails={handleViewDetails}
              onViewImages={handleViewImages}
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
    </div>
  );
}