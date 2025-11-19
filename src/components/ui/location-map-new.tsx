import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, WifiOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Retry utility with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`⏳ Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Fix Leaflet's default icon path issues - use CDN for reliability
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Use unpkg CDN for Leaflet marker icons (more reliable than local files)
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

// Create a custom icon with CDN paths
const customIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Also set as default
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
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
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [tilesLoading, setTilesLoading] = useState(true);
  const [tileError, setTileError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleMarkerRef = useRef<L.CircleMarker | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: '🌐 Connection Restored',
        description: 'You are back online. The map should load now.',
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: '📡 No Internet Connection',
        description: 'Map tiles may not load without an internet connection.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

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
        setTilesLoading(true);
        setTileError(false);

        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        });

        tileLayer.addTo(map);
        console.log('✅ Tile layer added');

        tileLayer.on('load', () => {
          console.log('✅ Tiles loaded successfully');
          setTilesLoading(false);
          setTileError(false);
        });

        tileLayer.on('tileerror', (error) => {
          console.error('❌ Tile loading error:', error);
          setTileError(true);
          setTilesLoading(false);

          // Show user-friendly error toast
          toast({
            title: '⚠️ Map Tiles Failed to Load',
            description: 'The map may appear blank. Check your internet connection or try refreshing. You can still search for locations.',
            variant: 'destructive',
          });
        });

        // Create debounced update function to prevent rate limiting
        const debouncedUpdate = debounce((lat: number, lng: number) => {
          updateMarker(lat, lng);
          setSelectedLocation({ lat, lng });
        }, 500);

        // Add click handler to place marker with debouncing
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          console.log('🖱️ Map clicked at:', lat, lng);
          debouncedUpdate(lat, lng);
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
      if (circleMarkerRef.current) {
        circleMarkerRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLng]);

  // Reverse geocode coordinates to get address details with retry logic
  const reverseGeocode = async (lat: number, lng: number): Promise<LocationData> => {
    try {
      setIsReverseGeocoding(true);

      const data = await retryWithBackoff(async () => {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'PropertyManagementSystem/1.0'
            }
          }
        );

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Rate limit exceeded - will retry');
          }
          throw new Error('Reverse geocoding failed');
        }

        return await response.json();
      });

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

      // Show user-friendly error
      toast({
        title: '⚠️ Address Lookup Failed',
        description: 'Could not retrieve address details for this location. The coordinates will still be saved.',
        variant: 'destructive',
      });

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

    // Remove existing markers
    if (markerRef.current) {
      markerRef.current.remove();
      console.log('🗑️ Removed old marker');
    }
    if (circleMarkerRef.current) {
      circleMarkerRef.current.remove();
      console.log('🗑️ Removed old circle marker');
    }

    try {
      // Try using the custom icon, fallback to default if it fails
      try {
        markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(leafletMapRef.current);
        console.log('✅ Marker added with custom icon');
      } catch (iconError) {
        console.warn('⚠️ Custom icon failed, using default:', iconError);
        // Fallback to default marker
        markerRef.current = L.marker([lat, lng]).addTo(leafletMapRef.current);
        console.log('✅ Marker added with default icon');
      }

      // Also add a circle marker as a backup visual indicator
      circleMarkerRef.current = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#3B82F6',
        color: '#FFFFFF',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(leafletMapRef.current);

      leafletMapRef.current.setView([lat, lng], 15);
      console.log('✅ Marker and circle added, view updated');

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
      const data = await retryWithBackoff(async () => {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
          {
            headers: {
              'User-Agent': 'PropertyManagementSystem/1.0'
            }
          }
        );

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Rate limit exceeded - will retry');
          }
          throw new Error('Search failed');
        }

        return await response.json();
      });

      if (data && data[0]) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        // Use the search result's display name but still fetch detailed address components
        await updateMarker(latitude, longitude, false);
        console.log('🔍 Search result:', latitude, longitude);
      } else {
        toast({
          title: '🔍 No Results Found',
          description: `Could not find "${searchQuery}". Try being more specific or use a different search term.`,
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: '❌ Search Failed',
        description: 'Could not complete the search. Please check your internet connection and try again.',
        variant: 'destructive',
      });
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
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select Location on Map
          </DialogTitle>
          <DialogDescription>
            Click on the map to place a marker or search for an address
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Offline Warning Banner */}
          {!isOnline && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 flex-shrink-0">
              <WifiOff className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">No Internet Connection</p>
                <p className="text-xs text-red-600">Map tiles and address lookup require an internet connection.</p>
              </div>
            </div>
          )}

          {/* Tiles Loading/Error Banner */}
          {tilesLoading && isOnline && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 flex-shrink-0">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">Loading Map Tiles...</p>
                <p className="text-xs text-blue-600">The map is loading. This may take a few seconds.</p>
              </div>
            </div>
          )}

          {tileError && !tilesLoading && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Map Tiles Failed to Load</p>
                <p className="text-xs text-amber-600">The map may appear blank, but you can still search for locations.</p>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="flex gap-2 flex-shrink-0">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for an address..."
              className="flex-1"
              disabled={!isOnline}
            />
            <Button type="button" onClick={handleSearch} disabled={isSearching || !isOnline}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {/* Content area with map and details side by side */}
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Map container */}
            <div
              ref={mapRef}
              className="flex-1 rounded-lg border-2 border-gray-300 overflow-hidden bg-gray-100"
              style={{
                minHeight: '400px',
                position: 'relative',
                zIndex: 0
              }}
            />

            {/* Side panel for location details */}
            <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
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
                  <div className="font-semibold text-green-800 flex items-center gap-2 mb-3">
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

              {/* Helper text when no location selected */}
              {!selectedLocation && !isReverseGeocoding && (
                <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded p-4">
                  <p className="font-medium mb-2">How to select a location:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Click anywhere on the map</li>
                    <li>Or search for an address above</li>
                    <li>Review the address details</li>
                    <li>Click "Save Location" below</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons - Fixed at bottom */}
          <div className="flex justify-end gap-2 pt-2 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!selectedLocation || !isOnline}
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
