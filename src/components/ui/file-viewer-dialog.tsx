import { useState, useEffect, useCallback } from "react";
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
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  AlertTriangle,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  File,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileViewerDocument {
  url: string;
  name: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  description?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

interface FileViewerDialogProps {
  document: FileViewerDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: () => void;
}

// File type detection
const getFileType = (fileName: string, mimeType?: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  // PDF
  if (extension === 'pdf' || mimeType === 'application/pdf') return 'pdf';

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif'].includes(extension)) return 'image';
  if (mimeType?.startsWith('image/')) return 'image';

  // Text files
  if (['txt', 'md', 'json', 'xml', 'csv', 'log', 'html', 'css', 'js', 'ts'].includes(extension)) return 'text';
  if (mimeType?.startsWith('text/')) return 'text';

  // Office documents
  if (['doc', 'docx'].includes(extension)) return 'word';
  if (['xls', 'xlsx'].includes(extension)) return 'excel';
  if (['ppt', 'pptx'].includes(extension)) return 'powerpoint';

  // Other
  return 'other';
};

// File type icon component
const FileTypeIcon = ({ fileType, className }: { fileType: string; className?: string }) => {
  switch (fileType) {
    case 'pdf':
      return <FileText className={cn("text-red-500", className)} />;
    case 'image':
      return <ImageIcon className={cn("text-blue-500", className)} />;
    case 'word':
      return <FileText className={cn("text-blue-600", className)} />;
    case 'excel':
      return <FileText className={cn("text-green-600", className)} />;
    case 'powerpoint':
      return <FileText className={cn("text-orange-500", className)} />;
    default:
      return <File className={cn("text-gray-500", className)} />;
  }
};

// Format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileViewerDialog({ document, open, onOpenChange, onDownload }: FileViewerDialogProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  // Fetch document and create blob URL for PDFs/text to avoid X-Frame-Options issues
  const fetchDocument = useCallback(async (url: string, fileType: string) => {
    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage("");
      setBlobUrl(null);
      setTextContent(null);

      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      }

      if (fileType === 'text') {
        const text = await response.text();
        setTextContent(text);
        setIsLoading(false);
      } else {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch document:', error);
      setHasError(true);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load document. The file may be blocked by security settings.'
      );
      setIsLoading(false);
    }
  }, []);

  // Reset state and fetch when document changes
  useEffect(() => {
    let currentBlobUrl: string | null = null;

    if (document && open) {
      setZoom(100);
      setRotation(0);

      const fileName = document.fileName || document.name || 'document';
      const fileType = getFileType(fileName, document.fileType);

      // For PDFs and text files, fetch and create blob URL to bypass X-Frame-Options
      if (fileType === 'pdf' || fileType === 'text') {
        fetchDocument(document.url, fileType);
      } else if (fileType === 'image') {
        // Images load directly via img tag
        setIsLoading(true);
        setHasError(false);
        setErrorMessage("");
      } else {
        setIsLoading(false);
      }
    }

    // Cleanup blob URL when dialog closes or document changes
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
      setBlobUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setTextContent(null);
    };
  }, [document?.url, open, fetchDocument]);

  // Retry function
  const handleRetry = () => {
    if (document) {
      const fileName = document.fileName || document.name || 'document';
      const fileType = getFileType(fileName, document.fileType);
      if (fileType === 'pdf' || fileType === 'text') {
        fetchDocument(document.url, fileType);
      }
    }
  };

  if (!document) return null;

  const fileName = document.fileName || document.name || 'document';
  const fileType = getFileType(fileName, document.fileType);
  const canViewInline = ['pdf', 'image', 'text'].includes(fileType);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      const link = window.document.createElement('a');
      link.href = document.url;
      link.download = fileName;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  const renderDocumentPreview = () => {
    if (!canViewInline) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <FileQuestion className="h-20 w-20 text-muted-foreground" />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Preview not available</p>
            <p className="text-sm text-muted-foreground max-w-md">
              This file type ({fileType}) cannot be previewed in the browser. Please download the file to view it.
            </p>
          </div>
          <Button onClick={handleDownload} className="mt-4">
            <Download className="mr-2 h-4 w-4" />
            Download File
          </Button>
        </div>
      );
    }

    switch (fileType) {
      case 'pdf':
        return (
          <div className="relative w-full h-full" style={{ minHeight: isFullscreen ? '85vh' : '70vh' }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Loading PDF...</p>
                </div>
              </div>
            )}
            {hasError && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <AlertTriangle className="h-16 w-16 text-destructive" />
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">Unable to preview PDF</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {errorMessage || 'The PDF could not be loaded in the browser. Please use the options below to view it.'}
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleRetry}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(document.url, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
                  </Button>
                  <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
            {!hasError && blobUrl && (
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full border-0 rounded-lg"
                style={{
                  height: isFullscreen ? '85vh' : '70vh',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top left',
                  width: `${10000 / zoom}%`,
                }}
                title={document.name}
              />
            )}
          </div>
        );

      case 'image':
        return (
          <div
            className={cn(
              "relative flex items-center justify-center bg-[#1a1a2e] overflow-auto",
              isFullscreen ? "min-h-[85vh]" : "min-h-[70vh]"
            )}
          >
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
                src={document.url}
                alt={document.name}
                className="max-w-full object-contain cursor-move"
                style={{
                  maxHeight: isFullscreen ? '85vh' : '70vh',
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                  visibility: isLoading ? 'hidden' : 'visible',
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                draggable={false}
              />
            )}
          </div>
        );

      case 'text':
        return (
          <div
            className={cn(
              "relative bg-muted/30 p-2 rounded-lg overflow-auto",
              isFullscreen ? "min-h-[85vh] max-h-[85vh]" : "min-h-[70vh] max-h-[70vh]"
            )}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted/50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Loading file...</p>
                </div>
              </div>
            )}
            {hasError && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <AlertTriangle className="h-16 w-16 text-destructive" />
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">Unable to load file</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {errorMessage || 'The file could not be loaded. Please download it instead.'}
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={handleRetry}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                  <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download File
                  </Button>
                </div>
              </div>
            )}
            {!hasError && textContent !== null && (
              <pre
                className="w-full h-full p-4 bg-white dark:bg-gray-900 rounded font-mono text-sm overflow-auto whitespace-pre-wrap"
                style={{
                  minHeight: isFullscreen ? '80vh' : '65vh',
                  fontSize: `${zoom}%`,
                }}
              >
                {textContent}
              </pre>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col overflow-hidden",
          isFullscreen
            ? "max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh]"
            : "max-w-6xl max-h-[95vh]"
        )}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl flex items-center gap-2">
                <FileTypeIcon fileType={fileType} className="h-6 w-6" />
                <span className="truncate">{document.name}</span>
              </DialogTitle>
              <DialogDescription className="mt-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {document.fileName && (
                    <Badge variant="outline">{document.fileName}</Badge>
                  )}
                  {document.fileSize && (
                    <Badge variant="secondary">{formatFileSize(document.fileSize)}</Badge>
                  )}
                  <Badge variant="secondary" className="uppercase">{fileType}</Badge>
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

        <Separator className="my-2" />

        {/* Viewer Controls */}
        <div className="flex items-center justify-between gap-2 py-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {canViewInline && !hasError && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 25}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[50px] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 300}
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                {fileType === 'image' && (
                  <Button variant="outline" size="sm" onClick={handleRotate} title="Rotate">
                    <RotateCw className="h-4 w-4" />
                  </Button>
                )}
                {(zoom !== 100 || rotation !== 0) && (
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    Reset
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(document.url, '_blank')}
              title="Open in New Tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Document Preview */}
        <div className="flex-1 overflow-auto rounded-lg border bg-muted/10 min-h-0">
          {renderDocumentPreview()}
        </div>

        {/* Document Metadata */}
        {document.metadata && Object.keys(document.metadata).length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm flex-shrink-0">
              {Object.entries(document.metadata).map(([key, value]) => {
                if (value === undefined || value === null || value === '') return null;
                return (
                  <div key={key}>
                    <p className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="font-medium truncate">{String(value)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
