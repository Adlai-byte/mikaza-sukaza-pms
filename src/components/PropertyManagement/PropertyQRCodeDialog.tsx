import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Info, Download, Printer, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';

interface QRCodeData {
  qr_id: string;
  qr_type: string;
  qr_code_data: string;
  qr_code_image_url?: string;
  description?: string;
  is_active: boolean;
}

interface Property {
  property_id: string;
  property_name: string;
  property_location?: Array<{ address?: string }>;
}

interface PropertyQRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
}

export function PropertyQRCodeDialog({ open, onOpenChange, property }: PropertyQRCodeDialogProps) {
  const [qrCodes, setQRCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch existing QR codes when dialog opens
  useEffect(() => {
    if (open && property.property_id) {
      fetchQRCodes();
    }
  }, [open, property.property_id]);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('property_qr_codes')
        .select('*')
        .eq('property_id', property.property_id);

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

  const generateQRCodeImage = async (data: string): Promise<string> => {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  };

  const generateQRCodes = async () => {
    try {
      setGenerating(true);

      const propertyData = {
        id: property.property_id,
        name: property.property_name || 'Property',
        address: property.property_location?.[0]?.address || ''
      };

      const newQRCodes = [
        {
          qr_type: 'unit',
          qr_code_data: JSON.stringify({ type: 'unit_access', ...propertyData }),
          description: 'Unit Access QR Code',
        },
        {
          qr_type: 'vehicle',
          qr_code_data: JSON.stringify({ type: 'vehicle_access', ...propertyData }),
          description: 'Vehicle Access QR Code',
        },
        {
          qr_type: 'mail',
          qr_code_data: JSON.stringify({ type: 'mail_access', ...propertyData }),
          description: 'Mail Access QR Code',
        },
      ];

      // Generate QR code images for each
      const qrCodesWithImages = await Promise.all(
        newQRCodes.map(async (qr) => ({
          ...qr,
          qr_code_image_url: await generateQRCodeImage(qr.qr_code_data),
          property_id: property.property_id,
        }))
      );

      const { data, error } = await supabase
        .from('property_qr_codes')
        .insert(qrCodesWithImages)
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
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRCode = async (qrCode: QRCodeData) => {
    try {
      if (!qrCode.qr_code_image_url) {
        const imageUrl = await generateQRCodeImage(qrCode.qr_code_data);
        qrCode.qr_code_image_url = imageUrl;
      }

      const link = document.createElement('a');
      link.download = `QR-${qrCode.qr_type}-${property.property_name || 'property'}.png`;
      link.href = qrCode.qr_code_image_url;
      link.click();

      toast({
        title: "Success",
        description: `QR code downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      });
    }
  };

  const printQRCode = (qrCode: QRCodeData) => {
    if (qrCode.qr_code_image_url) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Print QR Code</title></head>
            <body style="text-align: center; padding: 20px;">
              <h2>${qrCode.description}</h2>
              <img src="${qrCode.qr_code_image_url}" style="max-width: 300px;" />
              <p>Property: ${property.property_name}</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Property QR Codes - {property.property_name}
            </DialogTitle>
            <Button
              onClick={generateQRCodes}
              disabled={qrCodes.length > 0 || generating || loading}
              size="sm"
              className="bg-accent hover:bg-accent-hover text-accent-foreground"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Generate QR Codes
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <Alert className="border-accent bg-accent/10">
            <Info className="h-4 w-4 text-accent" />
            <AlertDescription className="text-accent-foreground">
              <strong>Instructions:</strong> Generate QR codes for unit access, vehicle registration, and mail delivery. Print on sticker paper and place in appropriate locations.
            </AlertDescription>
          </Alert>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">Loading QR codes...</p>
            </div>
          ) : qrCodes.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg bg-gradient-subtle">
              <QrCode className="mx-auto h-16 w-16 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">No QR codes generated</h3>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                Generate QR codes for this property to enable quick access to unit, vehicle, and mail information.
              </p>
            </div>
          ) : (
            /* QR Codes Grid */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {qrCodes.map((qrCode) => (
                <Card key={qrCode.qr_id} className="text-center shadow-card hover:shadow-glow transition-all duration-300">
                  <CardContent className="pt-6">
                    {/* Actual QR Code */}
                    <div className="mx-auto mb-4 p-4 bg-white rounded-lg shadow-inner">
                      {qrCode.qr_code_image_url ? (
                        <img
                          src={qrCode.qr_code_image_url}
                          alt={`QR Code for ${qrCode.qr_type}`}
                          className="w-48 h-48 mx-auto"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-muted rounded flex items-center justify-center">
                          <QrCode className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* QR Code Info */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-primary capitalize">{qrCode.qr_type} Access</h4>
                        <p className="text-sm text-muted-foreground">
                          {property.property_name || 'Property'}
                        </p>
                      </div>

                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadQRCode(qrCode)}
                          className="flex-1"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => printQRCode(qrCode)}
                          className="flex-1 bg-primary hover:bg-primary-hover"
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
