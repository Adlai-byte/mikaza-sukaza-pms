import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Provider {
  provider_id: string;
  provider_name: string;
  provider_type: string;
  phone_number?: string;
  account_number?: string;
  billing_name?: string;
  website?: string;
  username?: string;
  password?: string;
  observations?: string;
}

interface ProvidersTabProps {
  propertyId: string;
}

export function ProvidersTab({ propertyId }: ProvidersTabProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const emptyProvider: Omit<Provider, 'provider_id'> = {
    provider_name: '',
    provider_type: '',
    phone_number: '',
    account_number: '',
    billing_name: '',
    website: '',
    username: '',
    password: '',
    observations: '',
  };

  const [formData, setFormData] = useState(emptyProvider);

  useEffect(() => {
    fetchProviders();
  }, [propertyId]);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('property_providers')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast({
        title: "Error",
        description: "Failed to load providers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingProvider) {
        // Update existing provider
        const { error } = await supabase
          .from('property_providers')
          .update(formData)
          .eq('provider_id', editingProvider.provider_id);

        if (error) throw error;
        
        setProviders(prev => prev.map(p => 
          p.provider_id === editingProvider.provider_id 
            ? { ...p, ...formData }
            : p
        ));
        
        toast({
          title: "Success",
          description: "Provider updated successfully",
        });
      } else {
        // Create new provider
        const { data, error } = await supabase
          .from('property_providers')
          .insert({
            ...formData,
            property_id: propertyId,
          })
          .select()
          .single();

        if (error) throw error;
        
        setProviders(prev => [...prev, data]);
        
        toast({
          title: "Success",
          description: "Provider added successfully",
        });
      }

      resetForm();
    } catch (error) {
      console.error('Error saving provider:', error);
      toast({
        title: "Error",
        description: "Failed to save provider",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (providerId: string) => {
    try {
      const { error } = await supabase
        .from('property_providers')
        .delete()
        .eq('provider_id', providerId);

      if (error) throw error;
      
      setProviders(prev => prev.filter(p => p.provider_id !== providerId));
      
      toast({
        title: "Success",
        description: "Provider deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast({
        title: "Error",
        description: "Failed to delete provider",
        variant: "destructive",
      });
    }
  };

  const startEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData({ ...provider });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData(emptyProvider);
    setEditingProvider(null);
    setShowForm(false);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
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
            <CardTitle>Provider (Water, electricity, Internet, Tv...)</CardTitle>
            <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Provider
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Provider Form */}
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingProvider ? 'Edit Provider' : 'Add New Provider'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="provider_name">Provider Name</Label>
                    <Input
                      id="provider_name"
                      value={formData.provider_name}
                      onChange={(e) => handleInputChange('provider_name', e.target.value)}
                      placeholder="e.g., Hotwire"
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider_type">Provider Type</Label>
                    <Input
                      id="provider_type"
                      value={formData.provider_type}
                      onChange={(e) => handleInputChange('provider_type', e.target.value)}
                      placeholder="e.g., Internet"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone_number">Phone</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => handleInputChange('phone_number', e.target.value)}
                      placeholder="N/A"
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_number">Account</Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => handleInputChange('account_number', e.target.value)}
                      placeholder="N/A"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="billing_name">Billing Name</Label>
                  <Input
                    id="billing_name"
                    value={formData.billing_name}
                    onChange={(e) => handleInputChange('billing_name', e.target.value)}
                    placeholder="e.g., Nilton Vortoli"
                  />
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="e.g., www.gethotwired.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="Login username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Login password"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="observations">Observations</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => handleInputChange('observations', e.target.value)}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    {editingProvider ? 'Update' : 'Save'}
                  </Button>
                  <Button onClick={resetForm} variant="destructive">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Providers List */}
          {providers.length === 0 && !showForm ? (
            <div className="text-center py-8 text-muted-foreground">
              No providers added yet. Click "Add Provider" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <Card key={provider.provider_id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                        <div>
                          <p className="font-semibold">{provider.provider_name}</p>
                          <p className="text-sm text-muted-foreground">{provider.provider_type}</p>
                        </div>
                        <div>
                          <p className="text-sm"><strong>Phone:</strong> {provider.phone_number || 'N/A'}</p>
                          <p className="text-sm"><strong>Account:</strong> {provider.account_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm"><strong>Billing:</strong> {provider.billing_name || 'N/A'}</p>
                          <p className="text-sm"><strong>Website:</strong> {provider.website || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(provider)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(provider.provider_id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {provider.observations && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">{provider.observations}</p>
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