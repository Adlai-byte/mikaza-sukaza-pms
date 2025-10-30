import { useState, useCallback } from "react";
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
  const { properties } = usePropertiesOptimized();
  const { users = [] } = useUsers();

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
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Upload {DOCUMENT_CATEGORIES[category]}</DialogTitle>
          <DialogDescription>
            Upload a new document to the system. Supported formats: PDF, images, Word, Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File upload area */}
          <div className="space-y-2">
            <Label>File *</Label>
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
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, images, Word, or Excel files up to 50MB
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
            <Label htmlFor="document-name">Document Name *</Label>
            <Input
              id="document-name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Enter document name"
              disabled={isUploading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* Contract Type selection */}
          {category === 'contracts' && (
            <div className="space-y-2">
              <Label htmlFor="contract-type">Contract Type *</Label>
              <Select value={contractType} onValueChange={setContractType} disabled={isUploading}>
                <SelectTrigger id="contract-type">
                  <SelectValue placeholder="Select contract type" />
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
              <Label htmlFor="property">Property *</Label>
              <Select value={propertyId} onValueChange={setPropertyId} disabled={isUploading}>
                <SelectTrigger id="property">
                  <SelectValue placeholder="Select a property" />
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
              <Label htmlFor="expiry-date">Expiry Date (Optional)</Label>
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
              <Label htmlFor="assigned-user">Assign to Employee (Optional)</Label>
              <Select value={assignedUserId || "none"} onValueChange={(value) => setAssignedUserId(value === "none" ? "" : value)} disabled={isUploading}>
                <SelectTrigger id="assigned-user">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {user.first_name} {user.last_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Automatically organizes the document in the employee's folder
              </p>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags separated by commas"
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Example: urgent, renovation, 2025
            </p>
          </div>

          {/* Upload progress */}
          {uploadProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {uploadProgress.status === 'uploading' && 'Uploading...'}
                  {uploadProgress.status === 'processing' && 'Processing...'}
                  {uploadProgress.status === 'completed' && 'Upload complete!'}
                  {uploadProgress.status === 'error' && 'Upload failed'}
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
                  <span>Document uploaded successfully</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
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
            {isUploading ? "Uploading..." : "Upload Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
