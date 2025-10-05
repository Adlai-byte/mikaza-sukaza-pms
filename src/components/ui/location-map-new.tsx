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

interface LocationMapProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
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
  const [isMapLoading, setIsMapLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapRef.current) {
      setIsMapLoading(true);
      return;
    }

    // Use requestAnimationFrame for smoother rendering
    requestAnimationFrame(() => {
      if (!mapRef.current) return;

      // Default center (Miami, FL or provided coordinates)
      const defaultCenter: [number, number] = initialLat && initialLng ?
        [initialLat, initialLng] : [25.7617, -80.1918];

      // Clean up existing map instance
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      // Create map with performance optimizations
      const map = L.map(mapRef.current, {
        center: defaultCenter,
        zoom: 13,
        scrollWheelZoom: true,
        dragging: true,
        zoomControl: true,
        preferCanvas: true, // Use Canvas for better performance
        fadeAnimation: false, // Disable fade for faster loading
        zoomAnimation: true,
        markerZoomAnimation: true
      });

      // Add tile layer with optimizations
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
        minZoom: 3,
        keepBuffer: 2, // Keep 2 rows of tiles loaded outside viewport
        updateWhenIdle: false, // Update tiles while panning for smoother experience
        updateWhenZooming: false,
        updateInterval: 150
      }).addTo(map);

      // Track tile loading
      let firstTileLoaded = false;
      tileLayer.on('tileload', () => {
        if (!firstTileLoaded) {
          firstTileLoaded = true;
          setIsMapLoading(false);
          console.log('✅ Map tiles loaded');
        }
      });

      tileLayer.on('tileerror', (error) => {
        console.warn('⚠️ Tile loading error:', error);
        setIsMapLoading(false); // Hide loader even on error
      });

      // Fallback: Hide loading after 1 second
      setTimeout(() => {
        setIsMapLoading(false);
      }, 1000);

      // Add click handler
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        updateMarker(lat, lng);
      });

      leafletMapRef.current = map;

      // Invalidate size immediately for proper rendering
      requestAnimationFrame(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      });

      // Add initial marker if coordinates exist
      if (initialLat && initialLng) {
        updateMarker(initialLat, initialLng);
      }
    });

    return () => {
      // Clean up on close
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLng]);

  const updateMarker = (lat: number, lng: number) => {
    if (!leafletMapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Add new marker
    markerRef.current = L.marker([lat, lng]).addTo(leafletMapRef.current);
    leafletMapRef.current.setView([lat, lng], 15);
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
        updateMarker(latitude, longitude);
        setSearchQuery(display_name);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = () => {
    if (markerRef.current) {
      const position = markerRef.current.getLatLng();
      onLocationSelect(position.lat, position.lng, searchQuery);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select Location
          </DialogTitle>
          <DialogDescription>
            Search for an address or click on the map to select the location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter address or coordinates..."
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          <div className="relative">
            <div
              ref={mapRef}
              className="h-[500px] w-full rounded-lg border-2 border-gray-300 overflow-hidden bg-gray-50"
              style={{ minHeight: '500px', width: '100%', zIndex: 1 }}
            />
            {isMapLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/90 backdrop-blur-sm rounded-lg">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-700 font-medium">Loading Leaflet Map...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!markerRef.current}
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