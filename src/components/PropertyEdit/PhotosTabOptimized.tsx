import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Upload,
  X,
  Star,
  Edit3,
  Check,
  X as XIcon,
  Image as ImageIcon,
  Camera,
  Eye,
  Download,
} from 'lucide-react';
import { usePropertyPhotos } from '@/hooks/usePropertyEditTabs';
import { PhotosTabSkeleton, TabLoadingSpinner } from './PropertyEditSkeleton';

interface Photo {
  image_id: string;
  image_url: string;
  image_title?: string;
  is_primary: boolean;
}

interface PhotosTabProps {
  propertyId: string;
}

export function PhotosTabOptimized({ propertyId }: PhotosTabProps) {
  console.log('🖼️ [PhotosTabOptimized] Component rendered:', { propertyId });

  const { toast } = useToast();
  const {
    photos,
    isLoading,
    isFetching,
    error,
    createPhoto,
    updatePhoto,
    deletePhoto,
    setPrimaryPhoto,
    isUploading,
    isUpdating,
    isDeleting,
    isSettingPrimary,
  } = usePropertyPhotos(propertyId);

  console.log('🖼️ [PhotosTabOptimized] Hook state:', {
    photosCount: photos.length,
    isLoading,
    isFetching,
    isUploading,
    isUpdating,
    isDeleting,
    isSettingPrimary,
    photos
  });

  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle query errors properly with useEffect
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch photos",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Handler functions defined before use
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📤 [PhotosTabOptimized] handleFileUpload called');

    const files = event.target.files;
    if (!files) {
      console.log('📤 [PhotosTabOptimized] No files selected');
      return;
    }

    console.log('📤 [PhotosTabOptimized] Files to upload:', {
      count: files.length,
      files: Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileExt = file.name.split('.').pop();
        const fileName = `${propertyId}/${timestamp}-${randomStr}.${fileExt}`;

        console.log('📤 [PhotosTabOptimized] Uploading file:', fileName);

        // Upload to Supabase Storage
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ [PhotosTabOptimized] Upload failed:', uploadError);
          toast({
            title: 'Upload Failed',
            description: uploadError.message || `Failed to upload ${file.name}`,
            variant: 'destructive',
          });
          continue;
        }

        console.log('✅ [PhotosTabOptimized] Upload successful:', uploadData);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);

        console.log('🔗 [PhotosTabOptimized] Public URL:', publicUrl);

        const photoData = {
          image_url: publicUrl,
          image_title: file.name.split('.')[0],
          is_primary: photos.length === 0 && i === 0, // First photo is primary
          property_id: propertyId,
        };

        console.log('📤 [PhotosTabOptimized] Creating photo record:', photoData);

        createPhoto(photoData);
      } catch (error) {
        console.error('❌ [PhotosTabOptimized] Error uploading file:', error);
        toast({
          title: 'Upload Error',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
      }
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Test function to add sample photos
  const addSamplePhotos = async () => {
    console.log('🧪 [PhotosTabOptimized] Adding sample photos for testing');

    const samplePhotos = [
      {
        image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
        image_title: 'Living Room',
        is_primary: true,
        property_id: propertyId,
      },
      {
        image_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
        image_title: 'Kitchen',
        is_primary: false,
        property_id: propertyId,
      },
      {
        image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
        image_title: 'Bedroom',
        is_primary: false,
        property_id: propertyId,
      }
    ];

    for (const photo of samplePhotos) {
      createPhoto(photo);
    }
  };

  const handleSetPrimary = (photoId: string) => {
    setPrimaryPhoto(photoId);
  };

  const handleEditTitle = (photo: Photo) => {
    setEditingTitle(photo.image_id);
    setNewTitle(photo.image_title || '');
  };

  const handleSaveTitle = (photoId: string) => {
    updatePhoto({
      photoId,
      updates: { image_title: newTitle },
    });
    setEditingTitle(null);
    setNewTitle('');
  };

  const handleCancelEdit = () => {
    setEditingTitle(null);
    setNewTitle('');
  };

  const handleDownload = async (photo: Photo) => {
    try {
      const response = await fetch(photo.image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.image_title || 'property-photo.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Show loading skeleton on initial load
  if (isLoading) {
    return <PhotosTabSkeleton />;
  }

  // Show empty state
  if (!isLoading && photos.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Photos Added</h3>
        <p className="text-muted-foreground mb-6">
          Upload photos to showcase this property. The first photo will be set as primary.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary hover:bg-primary/90"
            disabled={isUploading}
          >
            <Camera className="mr-2 h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload First Photo'}
          </Button>
          <Button
            onClick={addSamplePhotos}
            variant="outline"
            disabled={isUploading}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Add Sample Photos
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay for background fetching */}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
          <TabLoadingSpinner message="Updating photos..." />
        </div>
      )}

      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Property Photos</h2>
          <p className="text-muted-foreground">
            Upload and manage photos for this property. Set a primary photo for listings.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="border-primary text-primary hover:bg-primary hover:text-white"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload Photos'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Photo Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <ImageIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-900">{photos.length}</p>
            <p className="text-sm text-blue-700">Total Photos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-900">
              {photos.filter(p => p.is_primary).length}
            </p>
            <p className="text-sm text-amber-700">Primary Photo</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <Camera className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-900">
              {photos.filter(p => p.image_title).length}
            </p>
            <p className="text-sm text-green-700">With Titles</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {photos.map((photo) => (
          <Card
            key={photo.image_id}
            className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden"
          >
            <div className="relative aspect-square">
              <OptimizedImage
                src={photo.image_url}
                alt={photo.image_title || 'Property photo'}
                className="w-full h-full object-cover cursor-pointer"
                lazy={true}
                placeholder="skeleton"
                category="properties"
                onClick={() => setSelectedPhoto(photo)}
              />

              {/* Primary badge */}
              {photo.is_primary && (
                <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-600">
                  <Star className="h-3 w-3 mr-1" />
                  Primary
                </Badge>
              )}

              {/* Action buttons overlay */}
              <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                  onClick={() => handleDownload(photo)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                      disabled={isDeleting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this photo? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deletePhoto(photo.image_id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Loading overlay for individual photo actions */}
              {(isSettingPrimary || isUpdating) && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <TabLoadingSpinner message="" />
                </div>
              )}
            </div>

            <CardContent className="p-4">
              {/* Title editing */}
              {editingTitle === photo.image_id ? (
                <div className="flex items-center space-x-2">
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="h-8"
                    placeholder="Enter title..."
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-green-600"
                    onClick={() => handleSaveTitle(photo.image_id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-600"
                    onClick={handleCancelEdit}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {photo.image_title || 'Untitled'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 ml-2"
                    onClick={() => handleEditTitle(photo)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Set primary button */}
              {!photo.is_primary && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => handleSetPrimary(photo.image_id)}
                  disabled={isSettingPrimary}
                >
                  <Star className="h-3 w-3 mr-1" />
                  Set as Primary
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedPhoto?.image_title || 'Property Photo'}
            </DialogTitle>
            <DialogDescription>
              {selectedPhoto?.is_primary ? 'Primary photo' : 'Property photo'}
            </DialogDescription>
          </DialogHeader>
          {selectedPhoto && (
            <div className="flex justify-center">
              <OptimizedImage
                src={selectedPhoto.image_url}
                alt={selectedPhoto.image_title || 'Property photo'}
                className="max-w-full max-h-[60vh] object-contain"
                lazy={false}
                placeholder="skeleton"
                category="properties"
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => selectedPhoto && handleDownload(selectedPhoto)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            {selectedPhoto && !selectedPhoto.is_primary && (
              <Button
                onClick={() => {
                  handleSetPrimary(selectedPhoto.image_id);
                  setSelectedPhoto(null);
                }}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Star className="h-4 w-4 mr-2" />
                Set as Primary
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}