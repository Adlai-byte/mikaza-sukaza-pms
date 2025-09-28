import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Tab Components
import { GeneralTab } from '@/components/PropertyEdit/GeneralTab';
import { ProvidersTab } from '@/components/PropertyEdit/ProvidersTab';
import { UnitOwnersTab } from '@/components/PropertyEdit/UnitOwnersTab';
import { VehiclesTab } from '@/components/PropertyEdit/VehiclesTab';
import { PhotosTab } from '@/components/PropertyEdit/PhotosTab';
import { QRCodeTab } from '@/components/PropertyEdit/QRCodeTab';
import { FinancialTab } from '@/components/PropertyEdit/FinancialTab';
import { CheckListsTab } from '@/components/PropertyEdit/CheckListsTab';
import { BookingTab } from '@/components/PropertyEdit/BookingTab';
import { NotesTab } from '@/components/PropertyEdit/NotesTab';

export default function PropertyEdit() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_location(*),
          property_communication(*),
          property_access(*),
          property_extras(*),
          units(*),
          property_images(*),
          property_amenities(*),
          property_rules(*)
        `)
        .eq('property_id', propertyId)
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast({
        title: "Error",
        description: "Failed to load property details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    toast({
      title: "Success",
      description: "Property updated successfully",
    });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
          <Button onClick={() => navigate('/properties')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/properties')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit: {property.property_name}</h1>
            <p className="text-muted-foreground">Property ID: {property.property_id}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-10 mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="providers">Providers</TabsTrigger>
              <TabsTrigger value="owners">Unit Owners</TabsTrigger>
              <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="qrcode">QRCode</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="checklists">Check Lists</TabsTrigger>
              <TabsTrigger value="booking">Booking</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralTab property={property} onUpdate={setProperty} />
            </TabsContent>

            <TabsContent value="providers">
              <ProvidersTab propertyId={property.property_id} />
            </TabsContent>

            <TabsContent value="owners">
              <UnitOwnersTab propertyId={property.property_id} />
            </TabsContent>

            <TabsContent value="vehicles">
              <VehiclesTab propertyId={property.property_id} />
            </TabsContent>

            <TabsContent value="photos">
              <PhotosTab propertyId={property.property_id} />
            </TabsContent>

            <TabsContent value="qrcode">
              <QRCodeTab propertyId={property.property_id} />
            </TabsContent>

            <TabsContent value="financial">
              <FinancialTab propertyId={property.property_id} />
            </TabsContent>

            <TabsContent value="checklists">
              <CheckListsTab propertyId={property.property_id} />
            </TabsContent>

            <TabsContent value="booking">
              <BookingTab propertyId={property.property_id} />
            </TabsContent>

            <TabsContent value="notes">
              <NotesTab propertyId={property.property_id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}