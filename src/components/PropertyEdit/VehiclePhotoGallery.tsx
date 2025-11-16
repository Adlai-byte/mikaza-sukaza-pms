import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Star } from 'lucide-react';
import { useVehiclePhotos } from '@/hooks/useVehiclePhotos';
import { cn } from '@/lib/utils';

interface VehiclePhotoGalleryProps {
  vehicleId: string;
}

export function VehiclePhotoGallery({ vehicleId }: VehiclePhotoGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const {
    photos,
    uploadPhoto,
    deletePhoto,
    setPrimaryPhoto,
    isUploading,
    isDeleting,
  } = useVehiclePhotos(vehicleId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadPhoto({ file: files[i] });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {photos.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">No photos uploaded yet</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload Photos'}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.photo_id}
                className={cn(
                  "relative group border-2 rounded-lg overflow-hidden aspect-square",
                  photo.is_primary && "border-primary"
                )}
              >
                <img
                  src={photo.photo_url}
                  alt={photo.photo_title || 'Vehicle photo'}
                  className="w-full h-full object-cover"
                />

                {/* Photo overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPrimaryPhoto(photo.photo_id)}
                    disabled={photo.is_primary}
                    className="text-white hover:text-primary"
                    title="Set as primary"
                  >
                    <Star className={cn("h-4 w-4", photo.is_primary && "fill-primary")} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePhoto(photo.photo_id)}
                    className="text-white hover:text-destructive"
                    title="Delete photo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Primary badge */}
                {photo.is_primary && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium">
                    Primary
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isUploading}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload More Photos'}
          </Button>
        </>
      )}
    </div>
  );
}
