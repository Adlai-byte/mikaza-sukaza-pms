import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, X, FileText, Download, Calendar, AlertCircle } from 'lucide-react';
import { useVehicleDocuments } from '@/hooks/useVehicleDocuments';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface VehicleDocumentManagerProps {
  vehicleId: string;
  readOnly?: boolean;
}

export function VehicleDocumentManager({ vehicleId, readOnly = false }: VehicleDocumentManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    documentType: 'other' as 'registration' | 'insurance' | 'inspection' | 'other',
    documentName: '',
    expiryDate: '',
    notes: '',
  });

  const {
    documents,
    uploadDocument,
    deleteDocument,
    getSignedUrl,
    isUploading,
    isDeleting,
  } = useVehicleDocuments(vehicleId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm({
        ...uploadForm,
        file,
        documentName: uploadForm.documentName || file.name,
      });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) return;

    try {
      await uploadDocument({
        file: uploadForm.file,
        documentType: uploadForm.documentType,
        documentName: uploadForm.documentName,
        expiryDate: uploadForm.expiryDate || undefined,
        notes: uploadForm.notes || undefined,
      });

      // Reset form
      setUploadForm({
        file: null,
        documentType: 'other',
        documentName: '',
        expiryDate: '',
        notes: '',
      });
      setShowUploadDialog(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels = {
      registration: 'Registration',
      insurance: 'Insurance',
      inspection: 'Inspection',
      other: 'Other',
    };
    return labels[type as keyof typeof labels] || 'Unknown';
  };

  const getDocumentTypeColor = (type: string) => {
    const colors = {
      registration: 'bg-blue-100 text-blue-800',
      insurance: 'bg-green-100 text-green-800',
      inspection: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowUploadDialog(true)}
            disabled={isUploading}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed rounded-lg">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.document_id}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.document_name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge className={`text-xs ${getDocumentTypeColor(doc.document_type)}`}>
                        {getDocumentTypeLabel(doc.document_type)}
                      </Badge>
                      {doc.expiry_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Expires: {format(new Date(doc.expiry_date), 'MMM dd, yyyy')}</span>
                          {isExpired(doc.expiry_date) && (
                            <Badge variant="destructive" className="text-xs ml-1">
                              Expired
                            </Badge>
                          )}
                          {isExpiringSoon(doc.expiry_date) && !isExpired(doc.expiry_date) && (
                            <Badge variant="outline" className="text-xs ml-1 border-yellow-500 text-yellow-700">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Expiring Soon
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {doc.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.notes}</p>
                    )}
                    {doc.file_size && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const signedUrl = await getSignedUrl(doc.document_url);
                        window.open(signedUrl, '_blank');
                      }}
                      title="Download Document"
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDocument(doc.document_id)}
                        disabled={isDeleting}
                        title="Delete Document"
                        className="h-8 w-8 p-0 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Vehicle Document</DialogTitle>
            <DialogDescription>
              Upload registration, insurance, or other vehicle documents
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="document">Select File</Label>
              <Input
                ref={fileInputRef}
                id="document"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              {uploadForm.file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {uploadForm.file.name} ({(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select
                value={uploadForm.documentType}
                onValueChange={(value: any) =>
                  setUploadForm({ ...uploadForm, documentType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registration">Registration</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentName">Document Name</Label>
              <Input
                id="documentName"
                value={uploadForm.documentName}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, documentName: e.target.value })
                }
                placeholder="e.g., 2024 Vehicle Registration"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
              <Input
                id="expiryDate"
                type="date"
                value={uploadForm.expiryDate}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, expiryDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={uploadForm.notes}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, notes: e.target.value })
                }
                placeholder="Additional information about this document..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadForm.file || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
