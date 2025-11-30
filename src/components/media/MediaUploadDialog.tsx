import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { mediaUploadSchema, type MediaUploadInput, MEDIA_CATEGORIES } from "@/lib/schemas";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { useUploadMedia } from "@/hooks/useMedia";
import { useTranslation } from "react-i18next";

interface MediaUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPropertyId?: string;
}

export function MediaUploadDialog({
  open,
  onOpenChange,
  defaultPropertyId,
}: MediaUploadDialogProps) {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const { properties } = usePropertiesOptimized();
  const uploadMutation = useUploadMedia();

  const form = useForm<MediaUploadInput>({
    resolver: zodResolver(mediaUploadSchema),
    defaultValues: {
      property_id: defaultPropertyId || "",
      image_title: "",
      image_description: "",
      is_primary: false,
      tags: [],
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      form.setValue('tags', updatedTags);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    const updatedTags = tags.filter(t => t !== tag);
    setTags(updatedTags);
    form.setValue('tags', updatedTags);
  };

  const handleAddCategory = (category: string) => {
    if (!tags.includes(category)) {
      const updatedTags = [...tags, category];
      setTags(updatedTags);
      form.setValue('tags', updatedTags);
    }
  };

  const onSubmit = async (data: MediaUploadInput) => {
    if (selectedFiles.length === 0) {
      return;
    }

    try {
      // Upload each file
      for (const file of selectedFiles) {
        await uploadMutation.mutateAsync({
          file,
          metadata: {
            property_id: data.property_id,
            image_title: data.image_title || file.name,
            image_description: data.image_description,
            is_primary: data.is_primary && selectedFiles.length === 1, // Only allow primary if single file
            tags: data.tags || [],
          },
        });
      }

      // Reset and close
      form.reset();
      setSelectedFiles([]);
      setTags([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedFiles([]);
    setTags([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Property Images
          </DialogTitle>
          <DialogDescription>
            Upload photos for your properties. Select one or more images to upload.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Property Selection */}
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.mediaUpload.fields.property')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('dialogs.mediaUpload.fields.selectProperty')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.property_id} value={property.property_id}>
                          {property.property_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <div className="space-y-3">
              <FormLabel>{t('dialogs.mediaUpload.fields.images')} *</FormLabel>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{t('dialogs.mediaUpload.fields.clickToUpload')}</p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, JPEG up to 10MB
                    </p>
                  </div>
                </label>
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('dialogs.mediaUpload.fields.selectedFiles')} ({selectedFiles.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ImageIcon className="h-4 w-4 flex-shrink-0 text-blue-600" />
                          <span className="text-sm truncate">{file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Image Title */}
            <FormField
              control={form.control}
              name="image_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.mediaUpload.fields.title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('dialogs.mediaUpload.fields.titlePlaceholder')} {...field} />
                  </FormControl>
                  <FormDescription>
                    Leave empty to use filename as title
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Description */}
            <FormField
              control={form.control}
              name="image_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.mediaUpload.fields.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('dialogs.mediaUpload.fields.descriptionPlaceholder')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categories/Tags */}
            <div className="space-y-3">
              <FormLabel>{t('dialogs.mediaUpload.fields.categories')}</FormLabel>
              <div className="flex flex-wrap gap-2">
                {Object.entries(MEDIA_CATEGORIES).map(([key, label]) => (
                  <Badge
                    key={key}
                    variant={tags.includes(label) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleAddCategory(label)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Custom Tags */}
            <div className="space-y-3">
              <FormLabel>{t('dialogs.mediaUpload.fields.customTags')}</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder={t('dialogs.mediaUpload.fields.addTag')}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                >
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Primary Image */}
            {selectedFiles.length === 1 && (
              <FormField
                control={form.control}
                name="is_primary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('dialogs.mediaUpload.fields.setPrimary')}</FormLabel>
                      <FormDescription>
                        This image will be displayed as the main photo for the property
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={uploadMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={selectedFiles.length === 0 || uploadMutation.isPending}
              >
                {uploadMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
