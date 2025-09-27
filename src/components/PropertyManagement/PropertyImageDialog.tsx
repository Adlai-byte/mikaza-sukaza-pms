import { useState, useEffect } from "react";
import { Property } from "@/lib/schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { Upload, X, Loader2, Star, StarOff, Edit, Check } from "lucide-react";

interface PropertyImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
}

export function PropertyImageDialog({ open, onOpenChange, property }: PropertyImageDialogProps) {
  const [images, setImages] = useState(property.images || []);
  const [loading, setLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  const fetchImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', property.property_id)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast({
        title: "Error",
        description: "Failed to fetch property images",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        
        const { data, error } = await supabase
          .from('property_images')
          .insert([{
            property_id: property.property_id,
            image_url: result,
            image_title: file.name,
            is_primary: images.length === 0
          }])
          .select()
          .single();

        if (error) throw error;

        await logActivity(
          'PROPERTY_IMAGE_ADDED',
          { propertyId: property.property_id, imageTitle: file.name },
          undefined,
          'Admin'
        );

        toast({
          title: "Success",
          description: "Image uploaded successfully",
        });

        await fetchImages();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('property_images')
        .delete()
        .eq('image_id', imageId);

      if (error) throw error;

      await logActivity(
        'PROPERTY_IMAGE_DELETED',
        { propertyId: property.property_id, imageId },
        undefined,
        'Admin'
      );

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });

      await fetchImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      // First, unset all primary flags
      await supabase
        .from('property_images')
        .update({ is_primary: false })
        .eq('property_id', property.property_id);

      // Then set the selected image as primary
      const { error } = await supabase
        .from('property_images')
        .update({ is_primary: true })
        .eq('image_id', imageId);

      if (error) throw error;

      await logActivity(
        'PROPERTY_IMAGE_PRIMARY_SET',
        { propertyId: property.property_id, imageId },
        undefined,
        'Admin'
      );

      toast({
        title: "Success",
        description: "Primary image updated",
      });

      await fetchImages();
    } catch (error) {
      console.error('Error setting primary image:', error);
      toast({
        title: "Error",
        description: "Failed to set primary image",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTitle = async (imageId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('property_images')
        .update({ image_title: newTitle })
        .eq('image_id', imageId);

      if (error) throw error;

      await logActivity(
        'PROPERTY_IMAGE_TITLE_UPDATED',
        { propertyId: property.property_id, imageId, newTitle },
        undefined,
        'Admin'
      );

      toast({
        title: "Success",
        description: "Image title updated",
      });

      setEditingTitle(null);
      await fetchImages();
    } catch (error) {
      console.error('Error updating image title:', error);
      toast({
        title: "Error",
        description: "Failed to update image title",
        variant: "destructive",
      });
    }
  };

  const startEditTitle = (imageId: string, currentTitle: string) => {
    setEditingTitle(imageId);
    setTempTitle(currentTitle || "");
  };

  const cancelEditTitle = () => {
    setEditingTitle(null);
    setTempTitle("");
  };

  const saveTitle = (imageId: string) => {
    handleUpdateTitle(imageId, tempTitle);
  };

  useEffect(() => {
    if (open && property.property_id) {
      fetchImages();
    }
  }, [open, property.property_id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Property Images - {property.property_type}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Images ({images.length})</h3>
            <label className="cursor-pointer">
              <Button size="sm" disabled={loading} asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading images...</span>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-2" />
              <p>No images found for this property</p>
              <p className="text-sm">Upload images to showcase this property</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image) => (
                <div
                  key={image.image_id}
                  className="relative group bg-muted rounded-lg overflow-hidden"
                >
                  <img
                    src={image.image_url}
                    alt={image.image_title || "Property image"}
                    className="w-full h-48 object-cover"
                  />
                  
                  {/* Primary badge */}
                  {image.is_primary && (
                    <div className="absolute top-2 left-2">
                      <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-current" />
                        <span>Primary</span>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      {!image.is_primary && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetPrimary(image.image_id!)}
                          title="Set as primary"
                        >
                          <StarOff className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteImage(image.image_id!)}
                        title="Delete image"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Image title */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                    {editingTitle === image.image_id ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          className="text-sm h-6 bg-white text-black"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => saveTitle(image.image_id!)}
                          className="h-6 px-2"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={cancelEditTitle}
                          className="h-6 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm truncate">
                          {image.image_title || "Untitled"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditTitle(image.image_id!, image.image_title || "")}
                          className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}