import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { MikasaSpinner } from '@/components/ui/mikasa-loader';
import { usePropertyData } from '@/hooks/usePropertyData';

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
  const [activeTab, setActiveTab] = useState('general');
  
  const { data, loading, saving, updateProperty, updateGeneralDetails } = usePropertyData(propertyId!);

  const handleSave = async () => {
    // Broadcast a save event so tabs (e.g., GeneralTab) can persist their local form state
    window.dispatchEvent(new CustomEvent('property-edit-save'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <MikasaSpinner />
      </div>
    );
  }

  if (!data?.property) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/properties')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Edit: {data.property.property_name}
              </h1>
              <p className="text-muted-foreground">Property ID: {data.property.property_id}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary-hover shadow-primary">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Enhanced Tabs Card */}
        <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="bg-gradient-secondary p-1 m-6 rounded-lg overflow-x-auto">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 bg-transparent gap-1 min-w-max">
                  <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:text-primary">General</TabsTrigger>
                  <TabsTrigger value="providers" className="data-[state=active]:bg-white data-[state=active]:text-primary">Providers</TabsTrigger>
                  <TabsTrigger value="owners" className="data-[state=active]:bg-white data-[state=active]:text-primary">Unit Owners</TabsTrigger>
                  <TabsTrigger value="vehicles" className="data-[state=active]:bg-white data-[state=active]:text-primary">Vehicles</TabsTrigger>
                  <TabsTrigger value="photos" className="data-[state=active]:bg-white data-[state=active]:text-primary">Photos</TabsTrigger>
                  <TabsTrigger value="qrcode" className="data-[state=active]:bg-white data-[state=active]:text-primary">QRCode</TabsTrigger>
                  <TabsTrigger value="financial" className="data-[state=active]:bg-white data-[state=active]:text-primary">Financial</TabsTrigger>
                  <TabsTrigger value="checklists" className="data-[state=active]:bg-white data-[state=active]:text-primary">Check Lists</TabsTrigger>
                  <TabsTrigger value="booking" className="data-[state=active]:bg-white data-[state=active]:text-primary">Booking</TabsTrigger>
                  <TabsTrigger value="notes" className="data-[state=active]:bg-white data-[state=active]:text-primary">Notes</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="general" className="mt-0">
                  <GeneralTab property={data.property} onUpdate={updateGeneralDetails} />
                </TabsContent>

                <TabsContent value="providers" className="mt-0">
                  <ProvidersTab propertyId={data.property.property_id} />
                </TabsContent>

                <TabsContent value="owners" className="mt-0">
                  <UnitOwnersTab propertyId={data.property.property_id} />
                </TabsContent>

                <TabsContent value="vehicles" className="mt-0">
                  <VehiclesTab propertyId={data.property.property_id} />
                </TabsContent>

                <TabsContent value="photos" className="mt-0">
                  <PhotosTab propertyId={data.property.property_id} />
                </TabsContent>

                <TabsContent value="qrcode" className="mt-0">
                  <QRCodeTab propertyId={data.property.property_id} qrCodes={data.qrCodes} property={data.property} />
                </TabsContent>

                <TabsContent value="financial" className="mt-0">
                  <FinancialTab propertyId={data.property.property_id} />
                </TabsContent>

                <TabsContent value="checklists" className="mt-0">
                  <CheckListsTab propertyId={data.property.property_id} />
                </TabsContent>

                <TabsContent value="booking" className="mt-0">
                  <BookingTab propertyId={data.property.property_id} />
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  <NotesTab propertyId={data.property.property_id} />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}