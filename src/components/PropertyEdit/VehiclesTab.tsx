import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Vehicle {
  vehicle_id: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  license_plate?: string;
  vin?: string;
  owner_name?: string;
  registration_info?: string;
  insurance_info?: string;
}

interface VehiclesTabProps {
  propertyId: string;
}

export function VehiclesTab({ propertyId }: VehiclesTabProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const emptyVehicle: Omit<Vehicle, 'vehicle_id'> = {
    make: '',
    model: '',
    year: undefined,
    color: '',
    license_plate: '',
    vin: '',
    owner_name: '',
    registration_info: '',
    insurance_info: '',
  };

  const [formData, setFormData] = useState(emptyVehicle);

  useEffect(() => {
    fetchVehicles();
  }, [propertyId]);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('property_vehicles')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast({
        title: "Error",
        description: "Failed to load vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingVehicle) {
        // Update existing vehicle
        const { error } = await supabase
          .from('property_vehicles')
          .update(formData)
          .eq('vehicle_id', editingVehicle.vehicle_id);

        if (error) throw error;
        
        setVehicles(prev => prev.map(v => 
          v.vehicle_id === editingVehicle.vehicle_id 
            ? { ...v, ...formData }
            : v
        ));
        
        toast({
          title: "Success",
          description: "Vehicle updated successfully",
        });
      } else {
        // Create new vehicle
        const { data, error } = await supabase
          .from('property_vehicles')
          .insert({
            ...formData,
            property_id: propertyId,
          })
          .select()
          .single();

        if (error) throw error;
        
        setVehicles(prev => [...prev, data]);
        
        toast({
          title: "Success",
          description: "Vehicle added successfully",
        });
      }

      resetForm();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to save vehicle",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (vehicleId: string) => {
    try {
      const { error } = await supabase
        .from('property_vehicles')
        .delete()
        .eq('vehicle_id', vehicleId);

      if (error) throw error;
      
      setVehicles(prev => prev.filter(v => v.vehicle_id !== vehicleId));
      
      toast({
        title: "Success",
        description: "Vehicle deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to delete vehicle",
        variant: "destructive",
      });
    }
  };

  const startEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({ ...vehicle });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData(emptyVehicle);
    setEditingVehicle(null);
    setShowForm(false);
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vehicles</CardTitle>
            <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Warning Message */}
          {vehicles.length === 0 && !showForm && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: No vehicle has been added to this property.
              </AlertDescription>
            </Alert>
          )}

          {/* Vehicle Form */}
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => handleInputChange('make', e.target.value)}
                      placeholder="e.g., Toyota"
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      placeholder="e.g., Camry"
                    />
                  </div>
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year || ''}
                      onChange={(e) => handleInputChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="e.g., 2020"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                      placeholder="e.g., Blue"
                    />
                  </div>
                  <div>
                    <Label htmlFor="license_plate">License Plate</Label>
                    <Input
                      id="license_plate"
                      value={formData.license_plate}
                      onChange={(e) => handleInputChange('license_plate', e.target.value)}
                      placeholder="e.g., ABC-1234"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vin">VIN</Label>
                    <Input
                      id="vin"
                      value={formData.vin}
                      onChange={(e) => handleInputChange('vin', e.target.value)}
                      placeholder="Vehicle Identification Number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="owner_name">Owner Name</Label>
                    <Input
                      id="owner_name"
                      value={formData.owner_name}
                      onChange={(e) => handleInputChange('owner_name', e.target.value)}
                      placeholder="Vehicle owner name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="registration_info">Registration Information</Label>
                  <Textarea
                    id="registration_info"
                    value={formData.registration_info}
                    onChange={(e) => handleInputChange('registration_info', e.target.value)}
                    placeholder="Registration details..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="insurance_info">Insurance Information</Label>
                  <Textarea
                    id="insurance_info"
                    value={formData.insurance_info}
                    onChange={(e) => handleInputChange('insurance_info', e.target.value)}
                    placeholder="Insurance details..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    {editingVehicle ? 'Update' : 'Save'}
                  </Button>
                  <Button onClick={resetForm} variant="destructive">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vehicles List */}
          {vehicles.length === 0 && !showForm ? (
            <div className="text-center py-8 text-muted-foreground">
              No vehicles registered for this property.
            </div>
          ) : (
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.vehicle_id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                        <div>
                          <p className="font-semibold">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Color: {vehicle.color || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm"><strong>License Plate:</strong> {vehicle.license_plate || 'Not specified'}</p>
                          <p className="text-sm"><strong>Owner:</strong> {vehicle.owner_name || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm"><strong>VIN:</strong> {vehicle.vin || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(vehicle)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(vehicle.vehicle_id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {(vehicle.registration_info || vehicle.insurance_info) && (
                      <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                        {vehicle.registration_info && (
                          <div>
                            <p className="text-sm font-medium">Registration:</p>
                            <p className="text-sm text-muted-foreground">{vehicle.registration_info}</p>
                          </div>
                        )}
                        {vehicle.insurance_info && (
                          <div>
                            <p className="text-sm font-medium">Insurance:</p>
                            <p className="text-sm text-muted-foreground">{vehicle.insurance_info}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}