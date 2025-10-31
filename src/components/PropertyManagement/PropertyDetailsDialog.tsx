import { useState } from "react";
import { Property } from "@/lib/schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageViewer } from "@/components/ui/image-viewer";
import { useToast } from "@/hooks/use-toast";
import { generatePropertyPDF } from "@/lib/property-pdf";
import {
  Home,
  MapPin,
  Phone,
  Wifi,
  Key,
  Car,
  Package,
  Users,
  Bed,
  Bath,
  Square,
  Building,
  Camera,
  Download,
  Loader2,
  DollarSign,
  AlertCircle,
  FileText
} from "lucide-react";

interface PropertyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
}

export function PropertyDetailsDialog({ open, onOpenChange, property }: PropertyDetailsDialogProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; title?: string } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();
  const primaryImage = property.images?.find(img => img.is_primary) || property.images?.[0];

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we create your property details PDF.",
      });

      const pdfUrl = await generatePropertyPDF(property);

      // Open PDF in new tab
      window.open(pdfUrl, '_blank');

      toast({
        title: "Success",
        description: "Property details PDF generated successfully.",
      });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Home className="h-5 w-5" />
              <span>Property Details - {property.property_type}</span>
            </DialogTitle>
            <Button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              variant="outline"
              size="sm"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Summary Card */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.num_bedrooms !== undefined && (
                  <div className="text-center">
                    <Bed className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{property.num_bedrooms}</p>
                    <p className="text-xs text-muted-foreground">Bedrooms</p>
                  </div>
                )}
                {property.num_bathrooms !== undefined && (
                  <div className="text-center">
                    <Bath className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{property.num_bathrooms}</p>
                    <p className="text-xs text-muted-foreground">Bathrooms</p>
                  </div>
                )}
                {property.capacity && (
                  <div className="text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{property.capacity}</p>
                    <p className="text-xs text-muted-foreground">Max Guests</p>
                  </div>
                )}
                {property.size_sqf && (
                  <div className="text-center">
                    <Square className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{property.size_sqf}</p>
                    <p className="text-xs text-muted-foreground">Sq Ft</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Property Images Gallery */}
          {property.images && property.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="h-4 w-4" />
                  <span>Property Photos ({property.images.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.images.map((image, index) => (
                    <div
                      key={image.image_id || index}
                      className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity group"
                      onClick={() => setSelectedImage({ url: image.image_url, title: image.image_title || property.property_type })}
                    >
                      <img
                        src={image.image_url}
                        alt={image.image_title || `Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {image.is_primary && (
                        <Badge className="absolute top-2 right-2" variant="default">
                          Primary
                        </Badge>
                      )}
                      {image.image_title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {image.image_title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Property Name & Type */}
              {property.property_name && (
                <div className="pb-4 border-b">
                  <label className="text-sm font-medium text-muted-foreground">Property Name</label>
                  <p className="text-xl font-bold text-primary">{property.property_name}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Property Type</label>
                  <p className="text-lg font-semibold">{property.property_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Property ID</label>
                  <p className="text-sm font-mono text-muted-foreground">{property.property_id?.slice(0, 8)}...</p>
                </div>
              </div>

              {/* Owner Information */}
              <div className="pt-3 border-t">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Property Owner</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-lg font-semibold">
                      {property.owner?.first_name} {property.owner?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{property.owner?.email}</p>
                  </div>
                  {property.owner?.cellphone_primary && (
                    <div>
                      <label className="text-xs text-muted-foreground">Phone</label>
                      <p className="text-sm font-medium">{property.owner.cellphone_primary}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 pt-3 border-t">
                <Badge variant={property.is_active ? 'default' : 'destructive'} className="text-sm">
                  {property.is_active ? '✓ Active' : '✗ Inactive'}
                </Badge>
                {property.is_booking && (
                  <Badge variant="secondary" className="text-sm">📅 Booking Available</Badge>
                )}
                {property.is_pets_allowed && (
                  <Badge variant="outline" className="text-sm">🐾 Pet Friendly</Badge>
                )}
              </div>

              {/* Timestamps */}
              {(property.created_at || property.updated_at) && (
                <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
                  {property.created_at && (
                    <p>Created: {new Date(property.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  )}
                  {property.updated_at && (
                    <p>Last Updated: {new Date(property.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-6">
                {property.size_sqf && (
                  <div className="flex items-center space-x-2">
                    <Square className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Size</p>
                      <p className="font-semibold">{property.size_sqf} sq ft</p>
                    </div>
                  </div>
                )}

                {property.num_bedrooms !== undefined && (
                  <div className="flex items-center space-x-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-semibold">{property.num_bedrooms}</p>
                    </div>
                  </div>
                )}

                {property.num_bathrooms !== undefined && (
                  <div className="flex items-center space-x-2">
                    <Bath className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-semibold">{property.num_bathrooms}</p>
                    </div>
                  </div>
                )}

                {property.capacity && (
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Capacity</p>
                      <p className="font-semibold">{property.capacity}/{property.max_capacity}</p>
                    </div>
                  </div>
                )}
              </div>

              {(property.num_half_bath !== undefined || property.num_wcs !== undefined || 
                property.num_kitchens !== undefined || property.num_living_rooms !== undefined) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    {property.num_half_bath !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Half Baths:</span>
                        <span className="ml-2 font-medium">{property.num_half_bath}</span>
                      </div>
                    )}
                    {property.num_wcs !== undefined && (
                      <div>
                        <span className="text-muted-foreground">WCs:</span>
                        <span className="ml-2 font-medium">{property.num_wcs}</span>
                      </div>
                    )}
                    {property.num_kitchens !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Kitchens:</span>
                        <span className="ml-2 font-medium">{property.num_kitchens}</span>
                      </div>
                    )}
                    {property.num_living_rooms !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Living Rooms:</span>
                        <span className="ml-2 font-medium">{property.num_living_rooms}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          {property.location && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Location</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {property.location.address && (
                    <div>
                      <label className="text-xs text-muted-foreground">Street Address</label>
                      <p className="text-lg font-medium">{property.location.address}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {property.location.city && (
                      <div>
                        <label className="text-xs text-muted-foreground">City</label>
                        <p className="font-medium">{property.location.city}</p>
                      </div>
                    )}
                    {property.location.state && (
                      <div>
                        <label className="text-xs text-muted-foreground">State</label>
                        <p className="font-medium">{property.location.state}</p>
                      </div>
                    )}
                    {property.location.postal_code && (
                      <div>
                        <label className="text-xs text-muted-foreground">Postal Code</label>
                        <p className="font-medium">{property.location.postal_code}</p>
                      </div>
                    )}
                    {property.location.country && (
                      <div>
                        <label className="text-xs text-muted-foreground">Country</label>
                        <p className="font-medium">{property.location.country}</p>
                      </div>
                    )}
                  </div>
                  {(property.location.latitude && property.location.longitude) && (
                    <div className="pt-2 border-t">
                      <label className="text-xs text-muted-foreground">Coordinates</label>
                      <p className="text-sm font-mono">
                        {property.location.latitude}, {property.location.longitude}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Communication & Access */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {property.communication && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>Communication</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {property.communication.phone_number && (
                    <div>
                      <label className="text-sm text-muted-foreground">Phone</label>
                      <p className="font-medium">{property.communication.phone_number}</p>
                    </div>
                  )}
                  {property.communication.wifi_name && (
                    <div className="flex items-center space-x-2">
                      <Wifi className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{property.communication.wifi_name}</p>
                        {property.communication.wifi_password && (
                          <p className="text-sm text-muted-foreground">
                            Password: {property.communication.wifi_password}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {property.access && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Key className="h-4 w-4" />
                    <span>Access Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {property.access.gate_code && (
                    <div>
                      <label className="text-sm text-muted-foreground">Gate Code</label>
                      <p className="font-medium font-mono">{property.access.gate_code}</p>
                    </div>
                  )}
                  {property.access.door_lock_password && (
                    <div>
                      <label className="text-sm text-muted-foreground">Door Lock</label>
                      <p className="font-medium font-mono">{property.access.door_lock_password}</p>
                    </div>
                  )}
                  {property.access.alarm_passcode && (
                    <div>
                      <label className="text-sm text-muted-foreground">Alarm Code</label>
                      <p className="font-medium font-mono">{property.access.alarm_passcode}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Extras */}
          {property.extras && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-4 w-4" />
                  <span>Additional Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.extras.storage_number && (
                    <div>
                      <label className="text-sm text-muted-foreground">Storage Unit</label>
                      <p className="font-medium">{property.extras.storage_number}</p>
                      {property.extras.storage_code && (
                        <p className="text-sm text-muted-foreground">Code: {property.extras.storage_code}</p>
                      )}
                    </div>
                  )}
                  {property.extras.garage_number && (
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <label className="text-sm text-muted-foreground">Garage</label>
                        <p className="font-medium">{property.extras.garage_number}</p>
                      </div>
                    </div>
                  )}
                  {property.extras.mailing_box && (
                    <div>
                      <label className="text-sm text-muted-foreground">Mailbox</label>
                      <p className="font-medium">{property.extras.mailing_box}</p>
                    </div>
                  )}
                  {property.extras.front_desk && (
                    <div>
                      <label className="text-sm text-muted-foreground">Front Desk</label>
                      <p className="font-medium">{property.extras.front_desk}</p>
                    </div>
                  )}
                  {property.extras.pool_access_code && (
                    <div>
                      <label className="text-sm text-muted-foreground">Pool Access</label>
                      <p className="font-medium font-mono">{property.extras.pool_access_code}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Units */}
          {property.units && property.units.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Units ({property.units.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {property.units.map((unit, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="grid grid-cols-3 gap-4">
                        {unit.property_name && (
                          <div>
                            <label className="text-sm text-muted-foreground">Name</label>
                            <p className="font-medium">{unit.property_name}</p>
                          </div>
                        )}
                        {unit.license_number && (
                          <div>
                            <label className="text-sm text-muted-foreground">License</label>
                            <p className="font-medium">{unit.license_number}</p>
                          </div>
                        )}
                        {unit.folio && (
                          <div>
                            <label className="text-sm text-muted-foreground">Folio</label>
                            <p className="font-medium">{unit.folio}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {property.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Description</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {property.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Financial Information */}
          {(property.nightly_rate || property.cleaning_fee || property.security_deposit) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Financial Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {property.nightly_rate && (
                    <div>
                      <label className="text-sm text-muted-foreground">Nightly Rate</label>
                      <p className="text-lg font-semibold">${property.nightly_rate}</p>
                    </div>
                  )}
                  {property.cleaning_fee && (
                    <div>
                      <label className="text-sm text-muted-foreground">Cleaning Fee</label>
                      <p className="text-lg font-semibold">${property.cleaning_fee}</p>
                    </div>
                  )}
                  {property.security_deposit && (
                    <div>
                      <label className="text-sm text-muted-foreground">Security Deposit</label>
                      <p className="text-lg font-semibold">${property.security_deposit}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emergency Contacts */}
          {property.emergency_contact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Emergency Contact</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {property.emergency_contact.name && (
                    <div>
                      <label className="text-sm text-muted-foreground">Name</label>
                      <p className="font-medium">{property.emergency_contact.name}</p>
                    </div>
                  )}
                  {property.emergency_contact.phone && (
                    <div>
                      <label className="text-sm text-muted-foreground">Phone</label>
                      <p className="font-medium">{property.emergency_contact.phone}</p>
                    </div>
                  )}
                  {property.emergency_contact.relationship && (
                    <div>
                      <label className="text-sm text-muted-foreground">Relationship</label>
                      <p className="font-medium">{property.emergency_contact.relationship}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Highlights */}
          {property.highlights && property.highlights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Property Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {property.highlights.map((highlight: any) => (
                    <div key={highlight.highlight_id} className="p-3 border rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                        <div className="flex-1">
                          <h4 className="font-medium">{highlight.title}</h4>
                          {highlight.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {highlight.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Features Section - Amenities & Rules */}
          {((property.amenities && property.amenities.length > 0) || (property.rules && property.rules.length > 0)) && (
            <Card className="border-2 border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-xl flex items-center space-x-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span>Property Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Amenities */}
                  {property.amenities && property.amenities.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-green-500 rounded" />
                        Amenities ({property.amenities.length})
                      </h3>
                      <div className="space-y-2">
                        {property.amenities.map((amenity, index) => (
                          <div key={amenity.amenity_id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-semibold text-xs">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium">{amenity.amenity_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* House Rules */}
                  {property.rules && property.rules.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-orange-500 rounded" />
                        House Rules ({property.rules.length})
                      </h3>
                      <div className="space-y-2">
                        {property.rules.map((rule, index) => (
                          <div key={rule.rule_id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-semibold text-xs">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium">{rule.rule_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>

      <ImageViewer
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
        imageUrl={selectedImage?.url || ""}
        title={selectedImage?.title}
      />
    </Dialog>
  );
}