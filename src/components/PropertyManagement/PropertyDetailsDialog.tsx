import { Property } from "@/lib/schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Building
} from "lucide-react";

interface PropertyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
}

export function PropertyDetailsDialog({ open, onOpenChange, property }: PropertyDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Home className="h-5 w-5" />
            <span>Property Details - {property.property_type}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Property Type</label>
                  <p className="text-lg font-semibold">{property.property_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Owner</label>
                  <p className="text-lg font-semibold">
                    {property.owner?.first_name} {property.owner?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{property.owner?.email}</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Badge variant={property.is_active ? 'default' : 'destructive'}>
                  {property.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {property.is_booking && (
                  <Badge variant="secondary">Booking Available</Badge>
                )}
                {property.is_pets_allowed && (
                  <Badge variant="outline">Pet Friendly</Badge>
                )}
              </div>
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
                <div className="space-y-2">
                  {property.location.address && (
                    <p className="text-lg">{property.location.address}</p>
                  )}
                  <p className="text-muted-foreground">
                    {property.location.city && `${property.location.city}, `}
                    {property.location.state && `${property.location.state} `}
                    {property.location.postal_code}
                  </p>
                  {(property.location.latitude && property.location.longitude) && (
                    <p className="text-sm text-muted-foreground">
                      Coordinates: {property.location.latitude}, {property.location.longitude}
                    </p>
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

          {/* Amenities & Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {property.amenities && property.amenities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((amenity) => (
                      <Badge key={amenity.amenity_id} variant="secondary">
                        {amenity.amenity_name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {property.rules && property.rules.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {property.rules.map((rule) => (
                      <div key={rule.rule_id} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span className="text-sm">{rule.rule_name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}