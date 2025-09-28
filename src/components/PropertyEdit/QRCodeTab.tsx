import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Scissors, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QRCodeData {
  qr_id: string;
  qr_type: string;
  qr_code_data: string;
  qr_code_image_url?: string;
  description?: string;
  is_active: boolean;
}

interface QRCodeTabProps {
  propertyId: string;
}

export function QRCodeTab({ propertyId }: QRCodeTabProps) {
  const [qrCodes, setQRCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProperty();
    fetchQRCodes();
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('property_name, units(*)')
        .eq('property_id', propertyId)
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (error) {
      console.error('Error fetching property:', error);
    }
  };

  const fetchQRCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('property_qr_codes')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQRCodes(data || []);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      toast({
        title: "Error",
        description: "Failed to load QR codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodes = async () => {
    try {
      const newQRCodes = [
        {
          qr_type: 'unit',
          qr_code_data: `Unit: ${property?.property_name || 'Property'}`,
          description: 'Unit Access QR Code',
        },
        {
          qr_type: 'vehicle',
          qr_code_data: `Vehicle: ${property?.property_name || 'Property'}`,
          description: 'Vehicle Access QR Code',
        },
        {
          qr_type: 'mail',
          qr_code_data: `Mail: ${property?.property_name || 'Property'}`,
          description: 'Mail Access QR Code',
        },
      ];

      const { data, error } = await supabase
        .from('property_qr_codes')
        .insert(
          newQRCodes.map(qr => ({
            ...qr,
            property_id: propertyId,
          }))
        )
        .select();

      if (error) throw error;
      
      setQRCodes(prev => [...prev, ...data]);
      
      toast({
        title: "Success",
        description: "QR codes generated successfully",
      });
    } catch (error) {
      console.error('Error generating QR codes:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR codes",
        variant: "destructive",
      });
    }
  };

  const printQRCode = (qrCode: QRCodeData) => {
    // In a real implementation, this would generate and print the actual QR code
    toast({
      title: "Print QR Code",
      description: `Printing ${qrCode.description}`,
    });
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
            <CardTitle>Property QRCode</CardTitle>
            <Button 
              onClick={generateQRCodes}
              className="bg-green-600 hover:bg-green-700"
              disabled={qrCodes.length > 0}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Print QRCode
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Instructions */}
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Ok!</strong> You will find the unit's QRCodes below. You must print it in sticker paper, cut it and place it inside the unit.
            </AlertDescription>
          </Alert>

          {/* QR Codes Grid */}
          {qrCodes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
              <QrCode className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No QR codes generated</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Click "Print QRCode" to generate QR codes for this property
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {qrCodes.map((qrCode) => (
                <Card key={qrCode.qr_id} className="text-center">
                  <CardContent className="pt-6">
                    {/* QR Code Placeholder */}
                    <div className="mx-auto mb-4 w-48 h-48 border-2 border-dashed border-gray-300 flex items-center justify-center bg-white relative">
                      {/* Mock QR Code Pattern */}
                      <div className="w-40 h-40 bg-black relative">
                        <div className="absolute top-0 left-0 w-12 h-12 bg-white border border-black"></div>
                        <div className="absolute top-0 right-0 w-12 h-12 bg-white border border-black"></div>
                        <div className="absolute bottom-0 left-0 w-12 h-12 bg-white border border-black"></div>
                        
                        {/* Random QR pattern */}
                        <div className="absolute inset-0 grid grid-cols-10 gap-px p-2">
                          {Array.from({ length: 100 }, (_, i) => (
                            <div
                              key={i}
                              className={`${Math.random() > 0.5 ? 'bg-black' : 'bg-white'} w-full h-full`}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {/* Scissors icon */}
                      <div className="absolute -top-2 -right-2">
                        <Scissors className="h-6 w-6 text-gray-400" />
                      </div>
                    </div>

                    {/* QR Code Info */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Unit code: {property?.property_name || 'Property'}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => printQRCode(qrCode)}
                        className="capitalize"
                      >
                        {qrCode.qr_type}
                      </Button>
                    </div>
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