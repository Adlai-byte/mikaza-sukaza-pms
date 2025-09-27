import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Building2, MapPin, Users } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { PropertyTable } from "@/components/PropertyManagement/PropertyTable";
import { PropertyForm } from "@/components/PropertyManagement/PropertyForm";
import { PropertyDetailsDialog } from "@/components/PropertyManagement/PropertyDetailsDialog";
import { PropertyImageDialog } from "@/components/PropertyManagement/PropertyImageDialog";
import { Property, PropertyInsert } from "@/lib/schemas";

export default function Properties() {
  const { properties, loading, amenities, rules, createProperty, updateProperty, deleteProperty } = useProperties();
  const { logActivity } = useActivityLogs();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [imageDialogProperty, setImageDialogProperty] = useState<Property | null>(null);

  const handleCreateProperty = async (propertyData: PropertyInsert & any) => {
    await createProperty(propertyData);
    await logActivity('PROPERTY_CREATED', { 
      propertyType: propertyData.property_type,
      ownerId: propertyData.owner_id
    }, undefined, 'Admin');
  };

  const handleUpdateProperty = async (propertyData: PropertyInsert & any) => {
    if (editingProperty?.property_id) {
      await updateProperty(editingProperty.property_id, propertyData);
      await logActivity('PROPERTY_UPDATED', { 
        propertyId: editingProperty.property_id,
        propertyType: propertyData.property_type 
      }, undefined, 'Admin');
      setEditingProperty(null);
    }
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setIsFormOpen(true);
  };

  const handleDeleteProperty = async (propertyId: string) => {
    const property = properties.find(p => p.property_id === propertyId);
    await deleteProperty(propertyId);
    if (property) {
      await logActivity('PROPERTY_DELETED', { 
        propertyId,
        propertyType: property.property_type 
      }, undefined, 'Admin');
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

  const activeProperties = properties.filter(property => property.is_active).length;
  const bookingProperties = properties.filter(property => property.is_booking).length;
  const petFriendlyProperties = properties.filter(property => property.is_pets_allowed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Management</h1>
          <p className="text-muted-foreground">
            Manage properties, locations, and amenities
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Home className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Available</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pet Friendly</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{petFriendlyProperties}</div>
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
            <PropertyTable
              properties={properties}
              onEditProperty={handleEditProperty}
              onDeleteProperty={handleDeleteProperty}
              onViewDetails={handleViewDetails}
              onViewImages={handleViewImages}
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