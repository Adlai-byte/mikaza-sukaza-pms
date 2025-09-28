import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UnitOwner {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth?: string;
  cellphone_primary?: string;
  cellphone_usa?: string;
  whatsapp?: string;
}

interface UnitOwnersTabProps {
  propertyId: string;
}

export function UnitOwnersTab({ propertyId }: UnitOwnersTabProps) {
  const [owners, setOwners] = useState<UnitOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOwners();
  }, [propertyId]);

  const fetchOwners = async () => {
    try {
      // Get the property to find the owner
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('property_id', propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Get the owner details
      if (property.owner_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', property.owner_id);

        if (userError) throw userError;
        setOwners(userData || []);
      }
    } catch (error) {
      console.error('Error fetching owners:', error);
      toast({
        title: "Error",
        description: "Failed to load unit owners",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
            <CardTitle>Unit Owners</CardTitle>
            <Button 
              onClick={() => setShowRegisterForm(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Register New Owner
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Register New Owner Form */}
          {showRegisterForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Register New Owner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" placeholder="Enter first name" />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" placeholder="Enter last name" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="Enter email address" />
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input id="date_of_birth" type="date" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cellphone_primary">Cell phone (Primary)</Label>
                    <Input id="cellphone_primary" placeholder="Primary phone" />
                  </div>
                  <div>
                    <Label htmlFor="cellphone_usa">Cell phone (USA)</Label>
                    <Input id="cellphone_usa" placeholder="USA phone" />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input id="whatsapp" placeholder="WhatsApp number" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Register Owner
                  </Button>
                  <Button 
                    onClick={() => setShowRegisterForm(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Owners */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Main Owner</h3>
            {owners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No owners found for this property.
              </div>
            ) : (
              <div className="space-y-4">
                {owners.map((owner) => (
                  <Card key={owner.user_id}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">First Name</p>
                          <p className="font-medium">{owner.first_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Last Name</p>
                          <p className="font-medium">{owner.last_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">E-mail</p>
                          <p className="font-medium">{owner.email}</p>
                        </div>
                        {owner.date_of_birth && (
                          <div>
                            <p className="text-sm text-muted-foreground">Date of birth</p>
                            <p className="font-medium">{new Date(owner.date_of_birth).toLocaleDateString()}</p>
                          </div>
                        )}
                        {owner.cellphone_primary && owner.cellphone_primary !== 'N/A' && (
                          <div>
                            <p className="text-sm text-muted-foreground">Cell phone (Primary)</p>
                            <p className="font-medium">{owner.cellphone_primary}</p>
                          </div>
                        )}
                        {owner.cellphone_usa && (
                          <div>
                            <p className="text-sm text-muted-foreground">Cell phone (USA)</p>
                            <p className="font-medium">{owner.cellphone_usa}</p>
                          </div>
                        )}
                        {owner.whatsapp && (
                          <div>
                            <p className="text-sm text-muted-foreground">WhatsApp</p>
                            <p className="font-medium">{owner.whatsapp}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}