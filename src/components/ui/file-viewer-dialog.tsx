import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  File,
  X,
} from "lucide-react";

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

// Simple file type detection
const getFileType = (fileName: string, mimeType?: string): "pdf" | "image" | "other" => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || mimeType?.startsWith('image/')) return 'image';

  return 'other';
};

// Format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileViewerDialog({ document, open, onOpenChange }: FileViewerDialogProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Debug logging
  console.log('[FileViewerDialog] Render:', { open, hasDocument: !!document, url: document?.url });

  if (!document) return null;

  const fileName = document.fileName || document.name || 'document';
  const fileType = getFileType(fileName, document.fileType);

  const handleOpenInNewTab = () => {
    console.log('[FileViewerDialog] Opening URL:', document.url);
    window.open(document.url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    console.log('[FileViewerDialog] Downloading:', document.url);
    // Use anchor element for download
    const a = window.document.createElement('a');
    a.href = document.url;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {fileType === 'pdf' && <FileText className="h-5 w-5 text-red-500" />}
            {fileType === 'image' && <ImageIcon className="h-5 w-5 text-blue-500" />}
            {fileType === 'other' && <File className="h-5 w-5 text-gray-500" />}
            <span className="truncate">{document.name}</span>
          </DialogTitle>
          {(document.fileName || document.fileSize) && (
            <div className="flex gap-2 mt-2">
              {document.fileName && <Badge variant="outline">{document.fileName}</Badge>}
              {document.fileSize && <Badge variant="secondary">{formatFileSize(document.fileSize)}</Badge>}
            </div>
          )}
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0 mt-4">
          {/* Images - try to display inline */}
          {fileType === 'image' && !imageError && (
            <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg p-4 min-h-[300px]">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
              <img
                src={document.url}
                alt={document.name}
                className="max-w-full max-h-[60vh] object-contain"
                style={{ display: imageLoaded ? 'block' : 'none' }}
                onLoad={() => {
                  console.log('[FileViewerDialog] Image loaded');
                  setImageLoaded(true);
                }}
                onError={() => {
                  console.log('[FileViewerDialog] Image failed to load');
                  setImageError(true);
                }}
              />
            </div>
          )}

          {/* PDF or failed image - show action buttons */}
          {(fileType === 'pdf' || fileType === 'other' || (fileType === 'image' && imageError)) && (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-900 rounded-lg min-h-[300px]">
              {/* Icon */}
              <div className="mb-6">
                {fileType === 'pdf' ? (
                  <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
                    <FileText className="h-12 w-12 text-red-600 dark:text-red-400" />
                  </div>
                ) : (
                  <div className="bg-gray-200 dark:bg-gray-700 p-4 rounded-full">
                    <File className="h-12 w-12 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
              </div>

              {/* File info */}
              <h3 className="text-lg font-semibold text-center mb-2">{document.name}</h3>
              {document.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4 max-w-md">
                  {document.description}
                </p>
              )}

              {/* Action buttons - using anchor tags for reliability */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
                  onClick={() => console.log('[FileViewerDialog] Anchor click - Open')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </a>
                <a
                  href={document.url}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-input bg-background rounded-md font-medium hover:bg-accent transition-colors"
                  onClick={() => console.log('[FileViewerDialog] Anchor click - Download')}
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>

              <p className="text-xs text-gray-400 mt-6 text-center">
                Click "Open in New Tab" to view in your browser
              </p>
            </div>
          )}
        </div>

        {/* Metadata */}
        {document.metadata && Object.keys(document.metadata).length > 0 && (
          <div className="flex-shrink-0 mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {Object.entries(document.metadata).map(([key, value]) => {
                if (value === undefined || value === null || value === '') return null;
                return (
                  <div key={key}>
                    <p className="text-gray-500 dark:text-gray-400 text-xs capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="font-medium truncate">{String(value)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
