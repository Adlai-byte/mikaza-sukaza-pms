import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Star, Edit3, Check, X as XIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Photo {
  image_id: string;
  image_url: string;
  image_title?: string;
  is_primary: boolean;
}

interface PhotosTabProps {
  propertyId: string;
}

export function PhotosTab({ propertyId }: PhotosTabProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPhotos();
  }, [propertyId]);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', propertyId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast({
        title: "Error",
        description: "Failed to load photos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${propertyId}/${Date.now()}-${Math.random()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);

        const { data: imageData, error: imageError } = await supabase
          .from('property_images')
          .insert({
            property_id: propertyId,
            image_url: urlData.publicUrl,
            image_title: file.name,
            is_primary: photos.length === 0 // First image becomes primary
          })
          .select()
          .single();

        if (imageError) throw imageError;
        return imageData;
      });

      const newPhotos = await Promise.all(uploadPromises);
      setPhotos(prev => [...prev, ...newPhotos]);
      
      toast({
        title: "Success",
        description: `${files.length} photo(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: "Error",
        description: "Failed to upload photos",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('property_images')
        .delete()
        .eq('image_id', photoId);

      if (error) throw error;

      setPhotos(prev => prev.filter(photo => photo.image_id !== photoId));
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive",
      });
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    try {
      // First, remove primary status from all photos
      await supabase
        .from('property_images')
        .update({ is_primary: false })
        .eq('property_id', propertyId);

      // Then set the selected photo as primary
      const { error } = await supabase
        .from('property_images')
        .update({ is_primary: true })
        .eq('image_id', photoId);

      if (error) throw error;

      setPhotos(prev => prev.map(photo => ({
        ...photo,
        is_primary: photo.image_id === photoId
      })));

      toast({
        title: "Success",
        description: "Primary photo updated",
      });
    } catch (error) {
      console.error('Error setting primary photo:', error);
      toast({
        title: "Error",
        description: "Failed to set primary photo",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTitle = async (photoId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('property_images')
        .update({ image_title: title })
        .eq('image_id', photoId);

      if (error) throw error;

      setPhotos(prev => prev.map(photo => 
        photo.image_id === photoId ? { ...photo, image_title: title } : photo
      ));

      setEditingTitle(null);
      setNewTitle('');
      
      toast({
        title: "Success",
        description: "Photo title updated",
      });
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: "Error",
        description: "Failed to update title",
        variant: "destructive",
      });
    }
  };

  const startEditingTitle = (photoId: string, currentTitle: string) => {
    setEditingTitle(photoId);
    setNewTitle(currentTitle || '');
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
          <CardTitle>Property Photos</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Upload Section */}
          <div className="mb-6">
            <Label>Upload Photos</Label>
            <div className="mt-2 flex items-center gap-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload Photos'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="text-sm text-muted-foreground">
                Select multiple images to create a gallery
              </span>
            </div>
          </div>

          {/* Photos Grid */}
          {photos.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No photos</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload photos to create a gallery for this property
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.image_id} className="relative group">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img
                      src={photo.image_url}
                      alt={photo.image_title || 'Property photo'}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetPrimary(photo.image_id)}
                        className="h-8 w-8 p-0"
                        title="Set as primary"
                      >
                        <Star className={`h-4 w-4 ${photo.is_primary ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startEditingTitle(photo.image_id, photo.image_title || '')}
                        className="h-8 w-8 p-0"
                        title="Edit title"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePhoto(photo.image_id)}
                        className="h-8 w-8 p-0"
                        title="Delete photo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Primary indicator */}
                    {photo.is_primary && (
                      <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-semibold">
                        PRIMARY
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div className="mt-2">
                    {editingTitle === photo.image_id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Enter title"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateTitle(photo.image_id, newTitle);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateTitle(photo.image_id, newTitle)}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTitle(null);
                            setNewTitle('');
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground truncate">
                        {photo.image_title || 'Untitled'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}