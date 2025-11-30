import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  FileText,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  AlertTriangle,
  FileQuestion,
} from "lucide-react";
import { DocumentSummary } from "@/lib/schemas";
import { useDocumentDownload } from "@/hooks/useDocuments";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  document: DocumentSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// File type detection
const getFileType = (fileName: string, mimeType?: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  // PDF
  if (extension === 'pdf' || mimeType === 'application/pdf') return 'pdf';

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'image';
  if (mimeType?.startsWith('image/')) return 'image';

  // Text files
  if (['txt', 'md', 'json', 'xml', 'csv'].includes(extension)) return 'text';
  if (mimeType?.startsWith('text/')) return 'text';

  // Office documents
  if (['doc', 'docx'].includes(extension)) return 'word';
  if (['xls', 'xlsx'].includes(extension)) return 'excel';
  if (['ppt', 'pptx'].includes(extension)) return 'powerpoint';

  // Other
  return 'other';
};

// File type icon
const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'pdf':
      return '📄';
    case 'image':
      return '🖼️';
    case 'text':
      return '📝';
    case 'word':
      return '📘';
    case 'excel':
      return '📊';
    case 'powerpoint':
      return '📽️';
    default:
      return '📎';
  }
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentViewer({ document, open, onOpenChange }: DocumentViewerProps) {
  const { downloadDocument } = useDocumentDownload();
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset state when document changes
  useEffect(() => {
    if (document) {
      setZoom(100);
      setRotation(0);
      setIsLoading(true);
      setHasError(false);

      // Auto-clear loading state after 3 seconds as fallback
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [document?.document_id]);

  if (!document) return null;

  const fileType = getFileType(document.file_name, document.file_type);
  const fileIcon = getFileIcon(fileType);
  const canViewInline = ['pdf', 'image', 'text'].includes(fileType);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const renderDocumentPreview = () => {
    if (!canViewInline) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <FileQuestion className="h-20 w-20 text-muted-foreground" />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Preview not available</p>
            <p className="text-sm text-muted-foreground max-w-md">
              This file type cannot be previewed in the browser. Please download the file to view it.
            </p>
          </div>
          <Button onClick={() => downloadDocument(document)} className="mt-4">
            <Download className="mr-2 h-4 w-4" />
            Download File
          </Button>
        </div>
      );
    }

    switch (fileType) {
      case 'pdf':
        return (
          <div className="relative w-full" style={{ minHeight: '70vh' }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Loading PDF...</p>
                </div>
              </div>
            )}
            {hasError && (
              <Alert variant="destructive" className="m-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load PDF. Please try downloading the file instead.
                </AlertDescription>
              </Alert>
            )}
            <object
              data={document.file_url}
              type="application/pdf"
              className="w-full border-0"
              style={{
                minHeight: '70vh',
                height: '70vh',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
              }}
              onLoad={() => setIsLoading(false)}
            >
              <iframe
                src={document.file_url}
                className="w-full border-0"
                style={{
                  minHeight: '70vh',
                  height: '70vh',
                }}
                title={document.document_name}
                onLoad={() => setIsLoading(false)}
              >
                <p className="p-4 text-center">
                  Your browser does not support PDF viewing.{' '}
                  <Button
                    variant="link"
                    onClick={() => window.open(document.file_url, '_blank')}
                    className="p-0 h-auto"
                  >
                    Open PDF in new tab
                  </Button>
                </p>
              </iframe>
            </object>
          </div>
        );

      case 'image':
        return (
          <div className="relative flex items-center justify-center bg-muted/30 min-h-[70vh] p-4">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted/50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Loading image...</p>
                </div>
              </div>
            )}
            {hasError && (
              <Alert variant="destructive" className="m-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load image. Please try downloading the file instead.
                </AlertDescription>
              </Alert>
            )}
            {!hasError && (
              <img
                src={document.file_url}
                alt={document.document_name}
                className="max-w-full max-h-[70vh] object-contain"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                  visibility: isLoading ? 'hidden' : 'visible',
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            )}
          </div>
        );

      case 'text':
        return (
          <div className="relative bg-muted/30 p-6 rounded-lg min-h-[70vh] max-h-[70vh] overflow-auto">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted/50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Loading text...</p>
                </div>
              </div>
            )}
            {hasError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load text file. Please try downloading the file instead.
                </AlertDescription>
              </Alert>
            )}
            {!hasError && (
              <iframe
                src={document.file_url}
                className="w-full border-0 bg-white rounded"
                style={{
                  minHeight: '60vh',
                  fontSize: `${zoom}%`,
                }}
                title={document.document_name}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl flex items-center gap-2">
                <span className="text-2xl">{fileIcon}</span>
                <span className="truncate">{document.document_name}</span>
              </DialogTitle>
              <DialogDescription className="mt-2 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{document.file_name}</Badge>
                  <Badge variant="secondary">{formatFileSize(document.file_size)}</Badge>
                  <Badge variant="secondary">v{document.version_number}</Badge>
                  {document.status === 'active' && (
                    <Badge className="bg-green-500">Active</Badge>
                  )}
                  {document.expiring_soon && (
                    <Badge variant="destructive">Expiring Soon</Badge>
                  )}
                </div>
                {document.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {document.description}
                  </p>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        {/* Viewer Controls */}
        {canViewInline && !hasError && (
          <div className="flex items-center justify-between gap-2 pb-4">
            <div className="flex items-center gap-2">
              {(fileType === 'pdf' || fileType === 'image') && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </>
              )}
              {fileType === 'image' && (
                <Button variant="outline" size="sm" onClick={handleRotate}>
                  <RotateCw className="h-4 w-4 mr-2" />
                  Rotate
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(document.file_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => downloadDocument(document)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}

        {/* Document Preview */}
        <div className="flex-1 overflow-auto rounded-lg border bg-muted/10">
          {renderDocumentPreview()}
        </div>

        {/* Document Metadata */}
        <Separator className="my-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {document.property_name && (
            <div>
              <p className="text-muted-foreground">Property</p>
              <p className="font-medium">{document.property_name}</p>
            </div>
          )}
          {document.uploaded_by_name && (
            <div>
              <p className="text-muted-foreground">Uploaded By</p>
              <p className="font-medium">{document.uploaded_by_name}</p>
            </div>
          )}
          {document.created_at && (
            <div>
              <p className="text-muted-foreground">Upload Date</p>
              <p className="font-medium">
                {format(new Date(document.created_at), "MMM d, yyyy")}
              </p>
            </div>
          )}
          {document.expiry_date && (
            <div>
              <p className="text-muted-foreground">Expires</p>
              <p className={cn(
                "font-medium",
                document.expiring_soon && "text-destructive"
              )}>
                {format(new Date(document.expiry_date), "MMM d, yyyy")}
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
