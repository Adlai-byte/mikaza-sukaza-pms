import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  X,
  Trash2,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { Issue, IssuePhoto } from '@/lib/schemas';
import { format, parseISO } from 'date-fns';

interface PhotoGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: Issue | null;
  onDeletePhoto?: (photoId: string, photoUrl: string) => void;
  onUploadPhoto?: (file: File, photoType: 'before' | 'after' | 'progress' | 'other') => void;
  isDeleting?: boolean;
  isUploading?: boolean;
}

export function PhotoGallery({
  open,
  onOpenChange,
  issue,
  onDeletePhoto,
  onUploadPhoto,
  isDeleting = false,
  isUploading = false,
}: PhotoGalleryProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<IssuePhoto | null>(null);
  const [uploadType, setUploadType] = useState<'before' | 'after' | 'progress' | 'other'>('before');

  const photos = issue?.photos || [];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadPhoto) {
      onUploadPhoto(e.target.files[0], uploadType);
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteConfirm = () => {
    if (photoToDelete && onDeletePhoto) {
      onDeletePhoto(photoToDelete.photo_id!, photoToDelete.photo_url);
      setPhotoToDelete(null);
      if (selectedPhotoIndex !== null && selectedPhotoIndex >= photos.length - 1) {
        setSelectedPhotoIndex(null);
      }
    }
  };

  const openLightbox = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhotoIndex(null);
  };

  const nextPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const prevPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  const getPhotoTypeColor = (type: string) => {
    switch (type) {
      case 'before': return 'bg-red-100 text-red-800';
      case 'after': return 'bg-green-100 text-green-800';
      case 'progress': return 'bg-blue-100 text-blue-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const currentPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Issue Photos - {issue?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Upload Section */}
            {onUploadPhoto && (
              <div className="border-2 border-dashed rounded-lg p-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload-gallery"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="photo-upload-gallery"
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-primary text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer ${
                        isUploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? 'Uploading...' : 'Upload Photo'}
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={uploadType === 'before' ? 'default' : 'outline'}
                      onClick={() => setUploadType('before')}
                    >
                      Before
                    </Button>
                    <Button
                      size="sm"
                      variant={uploadType === 'after' ? 'default' : 'outline'}
                      onClick={() => setUploadType('after')}
                    >
                      After
                    </Button>
                    <Button
                      size="sm"
                      variant={uploadType === 'progress' ? 'default' : 'outline'}
                      onClick={() => setUploadType('progress')}
                    >
                      Progress
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Photo Grid */}
            {photos.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No photos uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo, index) => (
                  <div
                    key={photo.photo_id}
                    className="relative group cursor-pointer"
                    onClick={() => openLightbox(index)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || `Photo ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg border hover:shadow-lg transition-shadow"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className={getPhotoTypeColor(photo.photo_type)}>
                        {photo.photo_type}
                      </Badge>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {onDeletePhoto && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoToDelete(photo);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg">
                        {photo.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Photo Info */}
            {photos.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Total: {photos.length} photo{photos.length !== 1 ? 's' : ''} •
                Before: {photos.filter(p => p.photo_type === 'before').length} •
                After: {photos.filter(p => p.photo_type === 'after').length} •
                Progress: {photos.filter(p => p.photo_type === 'progress').length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Dialog */}
      {currentPhoto && (
        <Dialog open={selectedPhotoIndex !== null} onOpenChange={closeLightbox}>
          <DialogContent className="max-w-6xl h-[90vh] p-0">
            <div className="relative h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Badge className={getPhotoTypeColor(currentPhoto.photo_type)}>
                    {currentPhoto.photo_type}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Photo {selectedPhotoIndex! + 1} of {photos.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onDeletePhoto && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setPhotoToDelete(currentPhoto);
                        closeLightbox();
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={closeLightbox}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Image */}
              <div className="flex-1 flex items-center justify-center bg-black/5 p-4 relative">
                <img
                  src={currentPhoto.photo_url}
                  alt={currentPhoto.caption || `Photo ${selectedPhotoIndex! + 1}`}
                  className="max-h-full max-w-full object-contain"
                />

                {/* Navigation Buttons */}
                {selectedPhotoIndex! > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                    onClick={prevPhoto}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                {selectedPhotoIndex! < photos.length - 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                    onClick={nextPhoto}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Footer */}
              <div className="border-t p-4 bg-muted/30">
                {currentPhoto.caption && (
                  <p className="font-medium mb-2">{currentPhoto.caption}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Uploaded {formatDate(currentPhoto.created_at)}
                  {currentPhoto.uploaded_user && ` by ${currentPhoto.uploaded_user.first_name} ${currentPhoto.uploaded_user.last_name}`}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!photoToDelete} onOpenChange={() => setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Photo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
