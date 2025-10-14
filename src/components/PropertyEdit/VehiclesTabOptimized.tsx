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
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ListTabSkeleton, TabLoadingSpinner } from './PropertyEditSkeleton';

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
  insurance_info?: string;
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
  const [searchQuery, setSearchQuery] = useState('');

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
  };

  const [formData, setFormData] = useState(emptyVehicle);

  // Fetch vehicles query
  const {
    data: vehicles = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: vehiclesKeys.all(propertyId),
    queryFn: () => fetchVehicles(propertyId),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
      const { data, error } = await supabase
        .from('property_vehicles')
        .insert([{ ...vehicleData, property_id: propertyId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.all(propertyId) });
      toast({
        title: 'Success',
        description: 'Vehicle added successfully',
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.all(propertyId) });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.all(propertyId) });
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

    if (editingVehicle) {
      updateVehicleMutation.mutate({
        vehicleId: editingVehicle.vehicle_id,
        updates: formData,
      });
    } else {
      addVehicleMutation.mutate(formData);
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
    });
    setShowAddVehicleForm(true);
  };

  const handleCloseForm = () => {
    setShowAddVehicleForm(false);
    setEditingVehicle(null);
    setFormData(emptyVehicle);
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
        <Dialog open={showAddVehicleForm} onOpenChange={setShowAddVehicleForm}>
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

                <div className="space-y-2">
                  <Label htmlFor="insurance_info">Insurance Information</Label>
                  <Textarea
                    id="insurance_info"
                    value={formData.insurance_info}
                    onChange={(e) => setFormData({ ...formData, insurance_info: e.target.value })}
                    placeholder="Insurance company, policy number, expiry, etc."
                    rows={3}
                  />
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
    </div>
  );
}