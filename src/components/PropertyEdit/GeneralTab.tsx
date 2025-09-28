import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

interface GeneralTabProps {
  property: any;
  onUpdate: (property: any) => void;
}

export function GeneralTab({ property, onUpdate }: GeneralTabProps) {
  const [formData, setFormData] = useState({
    // Basic Information
    is_active: property.is_active || false,
    is_booking: property.is_booking || false,
    is_pets_allowed: property.is_pets_allowed || false,
    property_name: property.property_name || '',
    
    // Location
    address: property.property_location?.[0]?.address || '',
    city: property.property_location?.[0]?.city || '',
    state: property.property_location?.[0]?.state || '',
    postal_code: property.property_location?.[0]?.postal_code || '',
    latitude: property.property_location?.[0]?.latitude || '',
    longitude: property.property_location?.[0]?.longitude || '',
    
    // Capacity
    property_type: property.property_type || 'Apartment',
    capacity: property.capacity || '',
    max_capacity: property.max_capacity || '',
    size_sqf: property.size_sqf || '',
    num_bedrooms: property.num_bedrooms || '',
    num_bathrooms: property.num_bathrooms || '',
    num_half_bath: property.num_half_bath || '',
    num_wcs: property.num_wcs || '',
    num_kitchens: property.num_kitchens || '',
    num_living_rooms: property.num_living_rooms || '',
    
    // Communication and Connectivity
    phone_number: property.property_communication?.[0]?.phone_number || '',
    wifi_name: property.property_communication?.[0]?.wifi_name || '',
    wifi_password: property.property_communication?.[0]?.wifi_password || '',
    
    // Access
    gate_code: property.property_access?.[0]?.gate_code || '',
    door_lock_password: property.property_access?.[0]?.door_lock_password || '',
    alarm_passcode: property.property_access?.[0]?.alarm_passcode || '',
    
    // Extras
    storage_number: property.property_extras?.[0]?.storage_number || '',
    storage_code: property.property_extras?.[0]?.storage_code || '',
    front_desk: property.property_extras?.[0]?.front_desk || '',
    garage_number: property.property_extras?.[0]?.garage_number || '',
    mailing_box: property.property_extras?.[0]?.mailing_box || '',
    pool_access_code: property.property_extras?.[0]?.pool_access_code || '',
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="active" 
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="active">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="booking" 
                checked={formData.is_booking}
                onCheckedChange={(checked) => handleInputChange('is_booking', checked)}
              />
              <Label htmlFor="booking">Booking</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="pets" 
                checked={formData.is_pets_allowed}
                onCheckedChange={(checked) => handleInputChange('is_pets_allowed', checked)}
              />
              <Label htmlFor="pets">Pets Allowed</Label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="property_name">Property Name</Label>
              <Input
                id="property_name"
                value={formData.property_name}
                onChange={(e) => handleInputChange('property_name', e.target.value)}
              />
            </div>
            <div>
              <Label>Owner</Label>
              <Input value="Adriana de Bortoli" disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capacity */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="property_type">Property Type</Label>
              <Select value={formData.property_type} onValueChange={(value) => handleInputChange('property_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apartment">Apartment</SelectItem>
                  <SelectItem value="House">House</SelectItem>
                  <SelectItem value="Condo">Condo</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Select value={formData.capacity?.toString()} onValueChange={(value) => handleInputChange('capacity', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(20)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="max_capacity">Max Capacity</Label>
              <Select value={formData.max_capacity?.toString()} onValueChange={(value) => handleInputChange('max_capacity', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(25)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="size_sqf">Size (sqf)</Label>
              <Input
                id="size_sqf"
                type="number"
                value={formData.size_sqf}
                onChange={(e) => handleInputChange('size_sqf', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="num_bedrooms">Number of bedrooms</Label>
              <Select value={formData.num_bedrooms?.toString()} onValueChange={(value) => handleInputChange('num_bedrooms', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="num_bathrooms">Number of bathrooms</Label>
              <Select value={formData.num_bathrooms?.toString()} onValueChange={(value) => handleInputChange('num_bathrooms', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="num_half_bath">Half Baths</Label>
              <Select value={formData.num_half_bath?.toString()} onValueChange={(value) => handleInputChange('num_half_bath', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="num_wcs">Number of WCs</Label>
              <Select value={formData.num_wcs?.toString()} onValueChange={(value) => handleInputChange('num_wcs', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="num_kitchens">Number of Kitchens</Label>
              <Select value={formData.num_kitchens?.toString()} onValueChange={(value) => handleInputChange('num_kitchens', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="num_living_rooms">Number of Living Rooms</Label>
            <Select value={formData.num_living_rooms?.toString()} onValueChange={(value) => handleInputChange('num_living_rooms', parseInt(value))}>
              <SelectTrigger className="w-full md:w-1/3">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {[...Array(5)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Communication and Connectivity */}
      <Card>
        <CardHeader>
          <CardTitle>Communication and Connectivity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="wifi_name">Wifi Name</Label>
              <Input
                id="wifi_name"
                value={formData.wifi_name}
                onChange={(e) => handleInputChange('wifi_name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="wifi_password">Wifi Password</Label>
              <Input
                id="wifi_password"
                value={formData.wifi_password}
                onChange={(e) => handleInputChange('wifi_password', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access */}
      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="gate_code">Gate Code</Label>
              <Input
                id="gate_code"
                value={formData.gate_code}
                onChange={(e) => handleInputChange('gate_code', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="door_lock_password">Door Lock Passcode</Label>
              <Input
                id="door_lock_password"
                value={formData.door_lock_password}
                onChange={(e) => handleInputChange('door_lock_password', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="alarm_passcode">Alarm Passcode</Label>
              <Input
                id="alarm_passcode"
                value={formData.alarm_passcode}
                onChange={(e) => handleInputChange('alarm_passcode', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extras */}
      <Card>
        <CardHeader>
          <CardTitle>Extras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="storage_number">Storage Number</Label>
              <Input
                id="storage_number"
                value={formData.storage_number}
                onChange={(e) => handleInputChange('storage_number', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="storage_code">Storage Code</Label>
              <Input
                id="storage_code"
                value={formData.storage_code}
                onChange={(e) => handleInputChange('storage_code', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="front_desk">Front Desk</Label>
              <Input
                id="front_desk"
                value={formData.front_desk}
                onChange={(e) => handleInputChange('front_desk', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="garage_number">Garage Number</Label>
              <Input
                id="garage_number"
                value={formData.garage_number}
                onChange={(e) => handleInputChange('garage_number', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mailing_box">Mailing Box</Label>
              <Input
                id="mailing_box"
                value={formData.mailing_box}
                onChange={(e) => handleInputChange('mailing_box', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pool_access_code">Pool access code</Label>
              <Input
                id="pool_access_code"
                value={formData.pool_access_code}
                onChange={(e) => handleInputChange('pool_access_code', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}