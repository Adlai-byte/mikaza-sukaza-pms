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
import { Upload, X, Loader2, Star, StarOff, Edit, Check, ChevronLeft, ChevronRight, ZoomIn, Download } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";

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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setLoading(true);
      const fileArray = Array.from(files);
      let uploadedCount = 0;

      for (const file of fileArray) {
        // Step 1: Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${property.property_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        // Step 2: Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);

        // Step 3: Save URL to database
        const { error: dbError } = await supabase
          .from('property_images')
          .insert([{
            property_id: property.property_id,
            image_url: publicUrl,
            image_title: file.name,
            is_primary: images.length === 0 && uploadedCount === 0
          }]);

        if (dbError) {
          console.error('Database insert error:', dbError);
          throw dbError;
        }

        await logActivity(
          'PROPERTY_IMAGE_ADDED',
          { propertyId: property.property_id, imageTitle: file.name },
          undefined,
          'Admin'
        );

        uploadedCount++;
      }

      toast({
        title: "Success",
        description: `${uploadedCount} image${uploadedCount > 1 ? 's' : ''} uploaded successfully`,
      });

      await fetchImages();

      // Reset the input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Error",
        description: "Failed to upload some images",
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

  const openViewer = (index: number) => {
    setCurrentImageIndex(index);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const downloadImage = (imageUrl: string, imageName: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = imageName || 'property-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (open && property.property_id) {
      fetchImages();
    }
  }, [open, property.property_id]);

  // Keyboard navigation for image viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewerOpen) return;

      if (e.key === 'ArrowLeft') {
        previousImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'Escape') {
        closeViewer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerOpen, images.length]);

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
                  Upload Images
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                multiple
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
              {images.map((image, index) => (
                <div
                  key={image.image_id}
                  className="relative group bg-muted rounded-lg overflow-hidden"
                >
                  <div
                    className="cursor-pointer relative"
                    onClick={() => openViewer(index)}
                  >
                    <OptimizedImage
                      src={image.image_url}
                      alt={image.image_title || "Property image"}
                      className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                      lazy={true}
                      placeholder="skeleton"
                      category="properties"
                    />
                    {/* Zoom icon overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  
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

      {/* Image Viewer/Lightbox */}
      {viewerOpen && images.length > 0 && (
        <Dialog open={viewerOpen} onOpenChange={closeViewer}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
            <div className="relative w-full h-[95vh] flex items-center justify-center">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
                onClick={closeViewer}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Download button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-16 z-50 text-white hover:bg-white/20"
                onClick={() => downloadImage(images[currentImageIndex].image_url, images[currentImageIndex].image_title || 'property-image')}
              >
                <Download className="h-6 w-6" />
              </Button>

              {/* Previous button */}
              {images.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
                  onClick={previousImage}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}

              {/* Main image */}
              <div className="flex items-center justify-center w-full h-full p-4">
                <OptimizedImage
                  src={images[currentImageIndex].image_url}
                  alt={images[currentImageIndex].image_title || "Property image"}
                  className="max-w-full max-h-full object-contain"
                  lazy={false}
                  placeholder="skeleton"
                  category="properties"
                />
              </div>

              {/* Next button */}
              {images.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}

              {/* Image info and navigation */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      {images[currentImageIndex].image_title || "Untitled"}
                    </h3>
                    <p className="text-sm text-white/70">
                      Image {currentImageIndex + 1} of {images.length}
                      {images[currentImageIndex].is_primary && (
                        <span className="ml-2 inline-flex items-center">
                          <Star className="h-3 w-3 fill-current mr-1" />
                          Primary Image
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Thumbnail navigation */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto max-w-md">
                      {images.map((image, index) => (
                        <button
                          key={image.image_id}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded border-2 transition-all ${
                            index === currentImageIndex
                              ? 'border-white scale-110'
                              : 'border-transparent opacity-50 hover:opacity-100'
                          }`}
                        >
                          <OptimizedImage
                            src={image.image_url}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                            lazy={true}
                            placeholder="skeleton"
                            category="thumbnails"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Keyboard hints */}
              <div className="absolute top-4 left-4 z-50 text-white/50 text-xs space-y-1">
                <div>← → Navigate</div>
                <div>ESC Close</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}