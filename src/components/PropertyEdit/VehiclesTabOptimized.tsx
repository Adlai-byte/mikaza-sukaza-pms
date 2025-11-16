import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Edit,
  Trash2,
  Car,
  Calendar,
  User,
  CreditCard,
  FileText,
  Shield,
  Search,
  Key,
  Palette,
  Image as ImageIcon,
  X,
  Eye,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ListTabSkeleton, TabLoadingSpinner } from './PropertyEditSkeleton';
import { VehiclePhotoGallery } from './VehiclePhotoGallery';

interface Vehicle {
  vehicle_id: string;
  property_id: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  license_plate?: string;
  vin?: string;
  owner_name?: string;
  registration_info?: string;

  // Legacy insurance
  insurance_info?: string;

  // NEW: Structured insurance fields
  insurance_company?: string;
  insurance_policy_number?: string;
  insurance_expiry_date?: string;
  insurance_coverage_amount?: number;
  insurance_contact_phone?: string;
  insurance_document_url?: string;

  created_at?: string;
}

interface VehiclesTabOptimizedProps {
  propertyId: string;
}

// Query keys
const vehiclesKeys = {
  all: (propertyId: string) => ['vehicles', propertyId] as const,
};

// Fetch vehicles
const fetchVehicles = async (propertyId: string): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from('property_vehicles')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export function VehiclesTabOptimized({ propertyId }: VehiclesTabOptimizedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);

  const emptyVehicle = {
    make: '',
    model: '',
    year: undefined as number | undefined,
    color: '',
    license_plate: '',
    vin: '',
    owner_name: '',
    registration_info: '',
    insurance_info: '',

    // NEW: Insurance fields
    insurance_company: '',
    insurance_policy_number: '',
    insurance_expiry_date: '',
    insurance_coverage_amount: undefined as number | undefined,
    insurance_contact_phone: '',
    insurance_document_url: '',
  };

  const [formData, setFormData] = useState(emptyVehicle);

  // Fetch vehicles query
  const {
    data: vehicles = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: vehiclesKeys.all(propertyId),
    queryFn: () => fetchVehicles(propertyId),
    enabled: !!propertyId,
    staleTime: 30 * 1000, // Reduced to 30 seconds for faster updates
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true, // Always refetch on component mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter(vehicle =>
    `${vehicle.make} ${vehicle.model} ${vehicle.license_plate} ${vehicle.owner_name}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Add vehicle mutation
  const addVehicleMutation = useMutation({
    mutationFn: async (vehicleData: typeof emptyVehicle) => {
      // Step 1: Create the vehicle
      const { data, error } = await supabase
        .from('property_vehicles')
        .insert([{ ...vehicleData, property_id: propertyId }])
        .select()
        .single();

      if (error) throw error;

      // Step 2: Upload photos if any were selected
      if (selectedPhotos.length > 0) {
        const vehicleId = data.vehicle_id;
        let uploadedCount = 0;

        for (let i = 0; i < selectedPhotos.length; i++) {
          const file = selectedPhotos[i];

          try {
            // Upload to storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${vehicleId}/${Date.now()}_${i}.${fileExt}`;
            const filePath = `vehicles/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('property-images')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('property-images')
              .getPublicUrl(filePath);

            // Create database record
            const { error: dbError } = await supabase
              .from('vehicle_photos')
              .insert([{
                vehicle_id: vehicleId,
                photo_url: publicUrl,
                is_primary: i === 0, // First photo is primary
                display_order: i,
              }]);

            if (dbError) throw dbError;
            uploadedCount++;
          } catch (photoError) {
            console.error(`Failed to upload photo ${i + 1}:`, photoError);
            // Continue uploading other photos even if one fails
          }
        }

        // Add info about uploaded photos to response
        return { ...data, uploadedPhotoCount: uploadedCount };
      }

      return data;
    },
    onSuccess: async (data) => {
      // Force immediate refetch with active queries
      await queryClient.invalidateQueries({
        queryKey: vehiclesKeys.all(propertyId),
        refetchType: 'active'
      });

      const photoMessage = selectedPhotos.length > 0
        ? ` with ${(data as any).uploadedPhotoCount || 0} photo(s)`
        : '';

      toast({
        title: 'Success',
        description: `Vehicle added successfully${photoMessage}`,
      });
      handleCloseForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add vehicle',
        variant: 'destructive',
      });
    },
  });

  // Update vehicle mutation
  const updateVehicleMutation = useMutation({
    mutationFn: async ({ vehicleId, updates }: { vehicleId: string; updates: Partial<Vehicle> }) => {
      const { data, error } = await supabase
        .from('property_vehicles')
        .update(updates)
        .eq('vehicle_id', vehicleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Force immediate refetch with active queries
      await queryClient.invalidateQueries({
        queryKey: vehiclesKeys.all(propertyId),
        refetchType: 'active'
      });
      toast({
        title: 'Success',
        description: 'Vehicle updated successfully',
      });
      handleCloseForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update vehicle',
        variant: 'destructive',
      });
    },
  });

  // Delete vehicle mutation
  const deleteVehicleMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase
        .from('property_vehicles')
        .delete()
        .eq('vehicle_id', vehicleId);

      if (error) throw error;
      return vehicleId;
    },
    onSuccess: async () => {
      // Force immediate refetch with active queries
      await queryClient.invalidateQueries({
        queryKey: vehiclesKeys.all(propertyId),
        refetchType: 'active'
      });
      toast({
        title: 'Success',
        description: 'Vehicle removed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove vehicle',
        variant: 'destructive',
      });
    },
  });

  // Show loading skeleton on initial load
  if (isLoading) {
    return <ListTabSkeleton title="Vehicles" />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-4">
          <Car className="h-12 w-12 mx-auto mb-2" />
          <p>Failed to load vehicles</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: vehiclesKeys.all(propertyId) })}>
          Try Again
        </Button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clean the data: convert empty strings to null for date/number fields
    const cleanedData = {
      ...formData,
      insurance_expiry_date: formData.insurance_expiry_date || null,
      insurance_coverage_amount: formData.insurance_coverage_amount || null,
      year: formData.year || null,
    };

    if (editingVehicle) {
      updateVehicleMutation.mutate({
        vehicleId: editingVehicle.vehicle_id,
        updates: cleanedData,
      });
    } else {
      addVehicleMutation.mutate(cleanedData);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year,
      color: vehicle.color || '',
      license_plate: vehicle.license_plate || '',
      vin: vehicle.vin || '',
      owner_name: vehicle.owner_name || '',
      registration_info: vehicle.registration_info || '',
      insurance_info: vehicle.insurance_info || '',

      // NEW: Map insurance fields
      insurance_company: vehicle.insurance_company || '',
      insurance_policy_number: vehicle.insurance_policy_number || '',
      insurance_expiry_date: vehicle.insurance_expiry_date || '',
      insurance_coverage_amount: vehicle.insurance_coverage_amount,
      insurance_contact_phone: vehicle.insurance_contact_phone || '',
      insurance_document_url: vehicle.insurance_document_url || '',
    });
    setShowAddVehicleForm(true);
  };

  const handleCloseForm = () => {
    setShowAddVehicleForm(false);
    setEditingVehicle(null);
    setFormData(emptyVehicle);
    setSelectedPhotos([]); // Clear selected photos
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedPhotos(Array.from(files));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getVehicleDisplayName = (vehicle: Vehicle) => {
    const parts = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown Vehicle';
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay for background fetching */}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
          <TabLoadingSpinner message="Updating vehicles..." />
        </div>
      )}

      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Car className="h-6 w-6" />
            Property Vehicles
          </h2>
          <p className="text-muted-foreground">
            Manage vehicles registered to this property
          </p>
        </div>
        <Dialog open={showAddVehicleForm} onOpenChange={(open) => {
          if (!open) {
            handleCloseForm();
          } else {
            setShowAddVehicleForm(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 shadow-lg"
              disabled={addVehicleMutation.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </DialogTitle>
                <DialogDescription>
                  {editingVehicle
                    ? 'Update the vehicle information below.'
                    : 'Register a new vehicle for this property.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Vehicle Basic Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                      placeholder="e.g., Toyota"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="e.g., Camry"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <select
                      id="year"
                      value={formData.year || ''}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md"
                    >
                      <option value="">Select year</option>
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="e.g., Blue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_plate">License Plate</Label>
                    <Input
                      id="license_plate"
                      value={formData.license_plate}
                      onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                      placeholder="e.g., ABC-1234"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vin">VIN</Label>
                    <Input
                      id="vin"
                      value={formData.vin}
                      onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                      placeholder="17-character VIN"
                      maxLength={17}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner_name">Owner Name</Label>
                    <Input
                      id="owner_name"
                      value={formData.owner_name}
                      onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                      placeholder="Vehicle owner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registration_info">Registration Information</Label>
                  <Textarea
                    id="registration_info"
                    value={formData.registration_info}
                    onChange={(e) => setFormData({ ...formData, registration_info: e.target.value })}
                    placeholder="Registration details, expiry dates, etc."
                    rows={3}
                  />
                </div>

                {/* Photos Section */}
                {editingVehicle ? (
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Vehicle Photos
                    </Label>
                    <VehiclePhotoGallery vehicleId={editingVehicle.vehicle_id} />
                  </div>
                ) : (
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Vehicle Photos (Optional)
                    </Label>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoSelect}
                        className="cursor-pointer"
                      />
                      {selectedPhotos.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {selectedPhotos.length} photo(s) selected
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedPhotos.map((file, index) => (
                              <div key={index} className="relative border rounded-lg p-2">
                                <div className="flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-xs truncate flex-1">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemovePhoto(index)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                {index === 0 && (
                                  <Badge variant="secondary" className="mt-1 text-xs">Primary</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Insurance Information Section */}
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Insurance Information
                  </Label>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="insurance_company">Insurance Company</Label>
                      <Input
                        id="insurance_company"
                        value={formData.insurance_company}
                        onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
                        placeholder="e.g., State Farm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insurance_policy_number">Policy Number</Label>
                      <Input
                        id="insurance_policy_number"
                        value={formData.insurance_policy_number}
                        onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                        placeholder="Policy #"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="insurance_expiry_date">Expiry Date</Label>
                      <Input
                        id="insurance_expiry_date"
                        type="date"
                        value={formData.insurance_expiry_date}
                        onChange={(e) => setFormData({ ...formData, insurance_expiry_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insurance_coverage_amount">Coverage Amount ($)</Label>
                      <Input
                        id="insurance_coverage_amount"
                        type="number"
                        value={formData.insurance_coverage_amount || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          insurance_coverage_amount: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                        placeholder="e.g., 100000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insurance_contact_phone">Insurance Contact Phone</Label>
                    <Input
                      id="insurance_contact_phone"
                      value={formData.insurance_contact_phone}
                      onChange={(e) => setFormData({ ...formData, insurance_contact_phone: e.target.value })}
                      placeholder="e.g., (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insurance_info">Additional Notes</Label>
                    <Textarea
                      id="insurance_info"
                      value={formData.insurance_info}
                      onChange={(e) => setFormData({ ...formData, insurance_info: e.target.value })}
                      placeholder="Any additional insurance information..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addVehicleMutation.isPending || updateVehicleMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {addVehicleMutation.isPending || updateVehicleMutation.isPending
                    ? 'Saving...'
                    : editingVehicle
                    ? 'Update'
                    : 'Add Vehicle'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      {vehicles.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search vehicles by make, model, license plate, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Vehicles Table */}
      {filteredVehicles.length === 0 ? (
        <div className="text-center py-12">
          <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery ? 'No matching vehicles found' : 'No Vehicles Registered'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Register vehicles for this property to keep track of parking and access.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowAddVehicleForm(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Add First Vehicle
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.vehicle_id}>
                  <TableCell className="font-medium">{getVehicleDisplayName(vehicle)}</TableCell>
                  <TableCell>{vehicle.color || '-'}</TableCell>
                  <TableCell>
                    {vehicle.license_plate ? (
                      <Badge variant="outline" className="font-mono">
                        {vehicle.license_plate}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{vehicle.owner_name || '-'}</TableCell>
                  <TableCell>
                    {vehicle.vin ? (
                      <span className="font-mono text-xs">{vehicle.vin}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {vehicle.registration_info && (
                        <Badge variant="secondary" title={vehicle.registration_info}>
                          <FileText className="h-3 w-3 mr-1" />
                          Reg
                        </Badge>
                      )}
                      {vehicle.insurance_info && (
                        <Badge variant="secondary" title={vehicle.insurance_info}>
                          <Shield className="h-3 w-3 mr-1" />
                          Ins
                        </Badge>
                      )}
                      {!vehicle.registration_info && !vehicle.insurance_info && '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingVehicle(vehicle)}
                        title="View Vehicle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(vehicle)}
                        disabled={updateVehicleMutation.isPending}
                        title="Edit Vehicle"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleteVehicleMutation.isPending}
                            title="Delete Vehicle"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Vehicle</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {getVehicleDisplayName(vehicle)}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteVehicleMutation.mutate(vehicle.vehicle_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Vehicle Dialog */}
      {viewingVehicle && (
        <Dialog open={!!viewingVehicle} onOpenChange={() => setViewingVehicle(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vehicle Details</DialogTitle>
              <DialogDescription>
                View complete information for {getVehicleDisplayName(viewingVehicle)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Make</p>
                    <p className="font-medium">{viewingVehicle.make || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Model</p>
                    <p className="font-medium">{viewingVehicle.model || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year</p>
                    <p className="font-medium">{viewingVehicle.year || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Color</p>
                    <p className="font-medium">{viewingVehicle.color || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">License Plate</p>
                    <p className="font-medium font-mono">{viewingVehicle.license_plate || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">VIN</p>
                    <p className="font-medium font-mono text-xs">{viewingVehicle.vin || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              {viewingVehicle.owner_name && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Owner Information
                  </h3>
                  <p className="text-sm">{viewingVehicle.owner_name}</p>
                </div>
              )}

              {/* Registration Information */}
              {viewingVehicle.registration_info && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Registration Information
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{viewingVehicle.registration_info}</p>
                </div>
              )}

              {/* Photos */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Vehicle Photos
                </h3>
                <VehiclePhotoGallery vehicleId={viewingVehicle.vehicle_id} />
              </div>

              {/* Insurance Information */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Insurance Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Company</p>
                    <p className="font-medium">{viewingVehicle.insurance_company || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Policy Number</p>
                    <p className="font-medium font-mono">{viewingVehicle.insurance_policy_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expiry Date</p>
                    <p className="font-medium">
                      {viewingVehicle.insurance_expiry_date
                        ? new Date(viewingVehicle.insurance_expiry_date).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Coverage Amount</p>
                    <p className="font-medium">
                      {viewingVehicle.insurance_coverage_amount
                        ? `$${viewingVehicle.insurance_coverage_amount.toLocaleString()}`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Contact Phone</p>
                    <p className="font-medium">{viewingVehicle.insurance_contact_phone || '-'}</p>
                  </div>
                </div>
                {viewingVehicle.insurance_info && (
                  <div className="pt-2">
                    <p className="text-muted-foreground text-sm">Additional Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{viewingVehicle.insurance_info}</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingVehicle(null)}>
                Close
              </Button>
              <Button onClick={() => {
                setViewingVehicle(null);
                handleEdit(viewingVehicle);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Vehicle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}