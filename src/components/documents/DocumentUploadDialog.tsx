import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Upload, FileText, X, AlertCircle, CheckCircle, User } from "lucide-react";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { useUsers } from "@/hooks/useUsers";
import { DocumentInsert, DOCUMENT_CATEGORIES, CONTRACT_TYPES } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { formatUserDisplay } from "@/lib/user-display";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: 'contracts' | 'employee' | 'access' | 'coi' | 'service' | 'messages';
  propertyId?: string | null;
  onSuccess?: () => void;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  category,
  propertyId: defaultPropertyId,
  onSuccess,
}: DocumentUploadDialogProps) {
  const { uploadFile, uploadProgress, isUploading } = useDocumentUpload();
  const { t } = useTranslation();
  const { properties } = usePropertiesOptimized();
  const { users: allUsers = [], loading: usersLoading } = useUsers();

  // Filter to show only active employees (Ops and Admin)
  // Note: user_type enum is: "admin" | "ops" | "provider" | "customer"
  const users = allUsers.filter(user =>
    user.is_active &&
    user.user_type &&
    ['ops', 'admin'].includes(user.user_type)
  );

  // Debug logging
  console.log('📋 [DocumentUploadDialog] All users:', allUsers.length);
  console.log('📋 [DocumentUploadDialog] Filtered users:', users.length);
  console.log('📋 [DocumentUploadDialog] User types:', allUsers.map(u => ({ name: `${u.first_name} ${u.last_name}`, type: u.user_type, active: u.is_active })));

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [description, setDescription] = useState("");
  const [propertyId, setPropertyId] = useState<string>(defaultPropertyId || "");
  const [expiryDate, setExpiryDate] = useState("");
  const [tags, setTags] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [contractType, setContractType] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Whether this category requires property selection
  const requiresProperty = ['contracts', 'access', 'coi', 'service'].includes(category);
  const allowsExpiry = ['contracts', 'coi'].includes(category);

  // Reset form
  const resetForm = () => {
    setSelectedFile(null);
    setDocumentName("");
    setDescription("");
    setPropertyId(defaultPropertyId || "");
    setExpiryDate("");
    setTags("");
    setAssignedUserId("");
    setContractType("");
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!documentName) {
      // Auto-populate document name from filename
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

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !documentName) return;

    if (requiresProperty && !propertyId) {
      return;
    }

    // Auto-add user name to tags if user is assigned
    let finalTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (assignedUserId && category === 'employee') {
      const selectedUser = users.find(u => u.user_id === assignedUserId);
      if (selectedUser) {
        const userName = `${selectedUser.first_name} ${selectedUser.last_name}`;
        if (!finalTags.includes(userName)) {
          finalTags.push(userName);
        }
      }
    }

    const documentData: Omit<DocumentInsert, 'file_url' | 'file_name' | 'file_type' | 'file_size'> = {
      category,
      document_name: documentName,
      description: description || undefined,
      property_id: propertyId || null,
      expiry_date: expiryDate || null,
      tags: finalTags.length > 0 ? finalTags : undefined,
      contract_type: (category === 'contracts' && contractType) ? contractType as any : undefined,
    };

    uploadFile(
      { file: selectedFile, documentData },
      {
        onSuccess: () => {
          resetForm();
          onSuccess?.();
          onOpenChange(false);
        },
      }
    );
  };

  const handleClose = () => {
    if (!isUploading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('dialogs.documentUpload.title')} {DOCUMENT_CATEGORIES[category]}</DialogTitle>
          <DialogDescription>
            {t('dialogs.documentUpload.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 pr-2">
          {/* File upload area */}
          <div className="space-y-2">
            <Label>{t('dialogs.documentUpload.fields.file')} *</Label>
            {!selectedFile ? (
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  {t('dialogs.documentUpload.fields.clickToUpload')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('dialogs.documentUpload.fields.fileTypes')}
                </p>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
                />
              </div>
            ) : (
              <div className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Document name */}
          <div className="space-y-2">
            <Label htmlFor="document-name">{t('dialogs.documentUpload.fields.documentName')} *</Label>
            <Input
              id="document-name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder={t('dialogs.documentUpload.fields.documentNamePlaceholder')}
              disabled={isUploading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('dialogs.documentUpload.fields.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('dialogs.documentUpload.fields.descriptionPlaceholder')}
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* Contract Type selection */}
          {category === 'contracts' && (
            <div className="space-y-2">
              <Label htmlFor="contract-type">{t('dialogs.documentUpload.fields.contractType')} *</Label>
              <Select value={contractType} onValueChange={setContractType} disabled={isUploading}>
                <SelectTrigger id="contract-type">
                  <SelectValue placeholder={t('dialogs.documentUpload.fields.selectContractType')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Property selection */}
          {requiresProperty && (
            <div className="space-y-2">
              <Label htmlFor="property">{t('dialogs.documentUpload.fields.property')} *</Label>
              <Select value={propertyId} onValueChange={setPropertyId} disabled={isUploading}>
                <SelectTrigger id="property">
                  <SelectValue placeholder={t('dialogs.documentUpload.fields.selectProperty')} />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id!}>
                      {property.property_name || `Property ${property.property_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Expiry date */}
          {allowsExpiry && (
            <div className="space-y-2">
              <Label htmlFor="expiry-date">{t('dialogs.documentUpload.fields.expiryDate')}</Label>
              <Input
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={isUploading}
              />
            </div>
          )}

          {/* Employee Assignment */}
          {category === 'employee' && (
            <div className="space-y-2">
              <Label htmlFor="assigned-user">{t('dialogs.documentUpload.fields.assignToEmployee')}</Label>
              <Select value={assignedUserId || "none"} onValueChange={(value) => setAssignedUserId(value === "none" ? "" : value)} disabled={isUploading}>
                <SelectTrigger id="assigned-user">
                  <SelectValue placeholder={t('dialogs.documentUpload.fields.selectEmployee')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">{t('dialogs.documentUpload.fields.none')}</span>
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {formatUserDisplay(user)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('dialogs.documentUpload.fields.employeeDescription')}
              </p>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">{t('dialogs.documentUpload.fields.tags')}</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('dialogs.documentUpload.fields.tagsPlaceholder')}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              {t('dialogs.documentUpload.fields.tagsExample')}
            </p>
          </div>

          {/* Upload progress */}
          {uploadProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {uploadProgress.status === 'uploading' && t('dialogs.documentUpload.uploadProgress.uploading')}
                  {uploadProgress.status === 'processing' && t('dialogs.documentUpload.uploadProgress.processing')}
                  {uploadProgress.status === 'completed' && t('dialogs.documentUpload.uploadProgress.completed')}
                  {uploadProgress.status === 'error' && t('dialogs.documentUpload.uploadProgress.error')}
                </span>
                <span className="text-muted-foreground">
                  {uploadProgress.progress}%
                </span>
              </div>
              <Progress value={uploadProgress.progress} />
              {uploadProgress.error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{uploadProgress.error}</span>
                </div>
              )}
              {uploadProgress.status === 'completed' && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{t('dialogs.documentUpload.uploadProgress.success')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {t('dialogs.documentUpload.buttons.cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              !selectedFile ||
              !documentName ||
              (requiresProperty && !propertyId) ||
              (category === 'contracts' && !contractType) ||
              isUploading
            }
          >
            {isUploading ? t('dialogs.documentUpload.buttons.uploading') : t('dialogs.documentUpload.buttons.upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
