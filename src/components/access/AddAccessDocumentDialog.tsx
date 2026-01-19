import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { useProviders } from "@/hooks/useProviders";
import { useAccessDocuments } from "@/hooks/useAccessDocuments";
import { ACCESS_DOCUMENT_TYPES, AccessDocumentInsert, AccessDocument } from "@/lib/schemas";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AddAccessDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDocument?: AccessDocument | null;
  onSuccess?: () => void;
}

export function AddAccessDocumentDialog({
  open,
  onOpenChange,
  editDocument,
  onSuccess,
}: AddAccessDocumentDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { properties } = usePropertiesOptimized();
  const { providers: vendors } = useProviders('service');
  const { createDocument, updateDocument, isCreating, isUpdating } = useAccessDocuments();

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState(editDocument?.document_name || "");
  const [documentType, setDocumentType] = useState<string>(editDocument?.document_type || "");
  const [description, setDescription] = useState(editDocument?.description || "");
  const [propertyId, setPropertyId] = useState<string>(editDocument?.property_id || "");
  const [vendorId, setVendorId] = useState<string>(editDocument?.vendor_id || "");
  const [expiryDate, setExpiryDate] = useState(editDocument?.expiry_date || "");
  const [tags, setTags] = useState(editDocument?.tags?.join(", ") || "");
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isSubmitting = isCreating || isUpdating || isUploading;

  // Reset form
  const resetForm = () => {
    setSelectedFile(null);
    setDocumentName("");
    setDocumentType("");
    setDescription("");
    setPropertyId("");
    setVendorId("");
    setExpiryDate("");
    setTags("");
    setUploadProgress(null);
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!documentName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setDocumentName(nameWithoutExt);
    }
  };

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  // Upload file to storage
  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string; size: number }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `access-documents/${fileName}`;

    setUploadProgress(0);

    const { error } = await supabase.storage
      .from('property-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    setUploadProgress(100);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('property-documents')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
    };
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!documentName || !documentType) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // For new documents, file is required
    if (!editDocument && !selectedFile) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);

      let fileData = editDocument ? {
        file_url: editDocument.file_url,
        file_name: editDocument.file_name,
        file_type: editDocument.file_type,
        file_size: editDocument.file_size,
      } : null;

      // Upload file if selected
      if (selectedFile) {
        const uploaded = await uploadFile(selectedFile);
        fileData = {
          file_url: uploaded.url,
          file_name: uploaded.name,
          file_type: uploaded.type,
          file_size: uploaded.size,
        };
      }

      const documentData: AccessDocumentInsert = {
        document_name: documentName,
        document_type: documentType as AccessDocumentInsert['document_type'],
        description: description || null,
        property_id: propertyId || null,
        vendor_id: vendorId || null,
        expiry_date: expiryDate || null,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        file_url: fileData!.file_url,
        file_name: fileData!.file_name,
        file_type: fileData!.file_type,
        file_size: fileData!.file_size,
      };

      if (editDocument) {
        await updateDocument({ id: editDocument.access_document_id, data: documentData });
      } else {
        await createDocument(documentData);
      }

      resetForm();
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save document',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle>
            {editDocument
              ? t('accessDocuments.dialog.editTitle', 'Edit Access Document')
              : t('accessDocuments.dialog.addTitle', 'Add Access Document')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* File upload area - compact version */}
          {!editDocument && (
            <div className="space-y-1">
              <Label className="text-sm">{t('accessDocuments.dialog.file', 'File')} *</Label>
              {!selectedFile ? (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                    dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('access-file-input')?.click()}
                >
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {t('accessDocuments.dialog.clickToUpload', 'Click to upload or drag and drop')}
                  </p>
                  <input
                    id="access-file-input"
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt"
                  />
                </div>
              ) : (
                <div className="border rounded-lg p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm truncate max-w-[300px]">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Document name and type - side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="document-name" className="text-sm">{t('accessDocuments.dialog.documentName', 'Name')} *</Label>
              <Input
                id="document-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g., Building Access Card"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="document-type" className="text-sm">{t('accessDocuments.dialog.documentType', 'Type')} *</Label>
              <Select value={documentType} onValueChange={setDocumentType} disabled={isSubmitting}>
                <SelectTrigger id="document-type">
                  <SelectValue placeholder={t('accessDocuments.dialog.selectType', 'Select type')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCESS_DOCUMENT_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </div>

          {/* Property and Vendor - side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="property" className="text-sm">{t('accessDocuments.dialog.property', 'Property')}</Label>
              <Select value={propertyId || "none"} onValueChange={(val) => setPropertyId(val === "none" ? "" : val)} disabled={isSubmitting}>
                <SelectTrigger id="property">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id!}>
                      {property.property_name || `Property ${property.property_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="vendor" className="text-sm">{t('accessDocuments.dialog.vendor', 'Vendor')}</Label>
              <Select value={vendorId || "none"} onValueChange={(val) => setVendorId(val === "none" ? "" : val)} disabled={isSubmitting}>
                <SelectTrigger id="vendor">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.provider_id} value={vendor.provider_id}>
                      {vendor.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expiry date and Tags - side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="expiry-date" className="text-sm">{t('accessDocuments.dialog.expiryDate', 'Expiry Date')}</Label>
              <Input
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tags" className="text-sm">{t('accessDocuments.dialog.tags', 'Tags')}</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., main-entrance"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Description - compact */}
          <div className="space-y-1">
            <Label htmlFor="description" className="text-sm">{t('accessDocuments.dialog.description', 'Notes')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes..."
              rows={2}
              disabled={isSubmitting}
            />
          </div>

          {/* Upload progress */}
          {uploadProgress !== null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {uploadProgress < 100 ? 'Uploading...' : 'Uploaded'}
                </span>
                <span className="text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!documentName || !documentType || (!editDocument && !selectedFile) || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editDocument ? 'Update' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
