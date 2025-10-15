import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

interface LocationMapProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, address?: string, city?: string, state?: string, postal_code?: string, country?: string) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
}

export function LocationMap({
  isOpen,
  onClose,
  onLocationSelect,
  initialLat,
  initialLng,
  initialAddress = ''
}: LocationMapProps) {
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize map when dialog opens
  useEffect(() => {
    if (!isOpen) {
      console.log('❌ Dialog not open, skipping map init');
      return;
    }

    console.log('🚀 Starting map initialization...');

    // Small delay to ensure dialog is fully rendered
    const timer = setTimeout(() => {
      if (!mapRef.current) {
        console.error('❌ Map ref is null!');
        return;
      }

      console.log('📦 Map ref found:', mapRef.current);

      // Default center
      const defaultCenter: [number, number] = initialLat && initialLng
        ? [initialLat, initialLng]
        : [25.7617, -80.1918]; // Miami, FL

      // Clean up existing map
      if (leafletMapRef.current) {
        console.log('🧹 Cleaning up existing map...');
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      console.log('🗺️ Creating Leaflet map at:', defaultCenter);

      try {
        // Create map
        const map = L.map(mapRef.current, {
          center: defaultCenter,
          zoom: 13,
          scrollWheelZoom: true,
          dragging: true,
          zoomControl: true,
          preferCanvas: false,
        });

        console.log('✅ Map instance created');

        // Add OpenStreetMap tiles
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        });

        tileLayer.addTo(map);
        console.log('✅ Tile layer added');

        tileLayer.on('load', () => {
          console.log('✅ Tiles loaded successfully');
        });

        tileLayer.on('tileerror', (error) => {
          console.error('❌ Tile loading error:', error);
        });

        // Add click handler to place marker
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          console.log('🖱️ Map clicked at:', lat, lng);
          updateMarker(lat, lng);
          setSelectedLocation({ lat, lng });
        });

        leafletMapRef.current = map;
        console.log('✅ Map reference stored');

        // Add initial marker if coordinates exist
        if (initialLat && initialLng) {
          console.log('📍 Adding initial marker at:', initialLat, initialLng);
          updateMarker(initialLat, initialLng);
          setSelectedLocation({ lat: initialLat, lng: initialLng });
        }

        // Fix map size after render
        setTimeout(() => {
          if (leafletMapRef.current) {
            leafletMapRef.current.invalidateSize();
            console.log('✅ Map size invalidated');
          }
        }, 150);

      } catch (error) {
        console.error('❌ Error creating map:', error);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (leafletMapRef.current) {
        console.log('🧹 Cleanup: Removing map');
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLng]);

  // Reverse geocode coordinates to get address details
  const reverseGeocode = async (lat: number, lng: number): Promise<LocationData> => {
    try {
      setIsReverseGeocoding(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PropertyManagementSystem/1.0'
          }
        }
      );

      if (!response.ok) throw new Error('Reverse geocoding failed');

      const data = await response.json();
      console.log('🌍 Reverse geocoding result:', data);

      const addressComponents = data.address || {};

      // Extract address components
      const road = addressComponents.road || '';
      const houseNumber = addressComponents.house_number || '';
      const streetAddress = houseNumber ? `${houseNumber} ${road}`.trim() : road;

      const locationData: LocationData = {
        lat,
        lng,
        address: streetAddress || data.display_name?.split(',')[0] || '',
        city: addressComponents.city || addressComponents.town || addressComponents.village || addressComponents.municipality || '',
        state: addressComponents.state || '',
        postal_code: addressComponents.postcode || '',
        country: addressComponents.country || 'USA'
      };

      console.log('📍 Extracted location data:', locationData);
      return locationData;
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      // Return basic location data if reverse geocoding fails
      return { lat, lng };
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const updateMarker = async (lat: number, lng: number, skipReverseGeocode: boolean = false) => {
    if (!leafletMapRef.current) {
      console.error('❌ Cannot update marker: map not initialized');
      return;
    }

    console.log('📍 Updating marker at:', lat, lng);

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
      console.log('🗑️ Removed old marker');
    }

    try {
      // Add new marker
      markerRef.current = L.marker([lat, lng]).addTo(leafletMapRef.current);
      leafletMapRef.current.setView([lat, lng], 15);
      console.log('✅ Marker added and view updated');

      // Fetch address details via reverse geocoding
      if (!skipReverseGeocode) {
        const locationData = await reverseGeocode(lat, lng);
        setSelectedLocation(locationData);

        // Update search query with the address
        if (locationData.address) {
          const fullAddress = [
            locationData.address,
            locationData.city,
            locationData.state,
            locationData.postal_code
          ].filter(Boolean).join(', ');
          setSearchQuery(fullAddress);
        }
      }
    } catch (error) {
      console.error('❌ Error adding marker:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !leafletMapRef.current) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        {
          headers: {
            'User-Agent': 'PropertyManagementSystem/1.0'
          }
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      if (data && data[0]) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        // Use the search result's display name but still fetch detailed address components
        await updateMarker(latitude, longitude, false);
        console.log('🔍 Search result:', latitude, longitude);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = () => {
    if (selectedLocation) {
      onLocationSelect(
        selectedLocation.lat,
        selectedLocation.lng,
        selectedLocation.address,
        selectedLocation.city,
        selectedLocation.state,
        selectedLocation.postal_code,
        selectedLocation.country
      );
      console.log('💾 Saved location:', selectedLocation);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select Location on Map
          </DialogTitle>
          <DialogDescription>
            Click on the map to place a marker or search for an address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for an address..."
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {/* Map container */}
          <div
            ref={mapRef}
            className="w-full rounded-lg border-2 border-gray-300 overflow-hidden bg-gray-100"
            style={{
              height: '500px',
              minHeight: '500px',
              width: '100%',
              position: 'relative',
              zIndex: 0
            }}
          />

          {/* Reverse geocoding indicator */}
          {isReverseGeocoding && (
            <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Fetching address details...</span>
            </div>
          )}

          {/* Selected location display */}
          {selectedLocation && !isReverseGeocoding && (
            <div className="text-sm text-gray-700 bg-green-50 border border-green-200 rounded p-4 space-y-2">
              <div className="font-semibold text-green-800 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Selected Location
              </div>
              {selectedLocation.address && (
                <div><strong>Address:</strong> {selectedLocation.address}</div>
              )}
              {selectedLocation.city && (
                <div><strong>City:</strong> {selectedLocation.city}</div>
              )}
              {selectedLocation.state && (
                <div><strong>State:</strong> {selectedLocation.state}</div>
              )}
              {selectedLocation.postal_code && (
                <div><strong>Postal Code:</strong> {selectedLocation.postal_code}</div>
              )}
              {selectedLocation.country && (
                <div><strong>Country:</strong> {selectedLocation.country}</div>
              )}
              <div className="text-xs text-gray-500 pt-2 border-t border-green-300">
                Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedLocation}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Save Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
