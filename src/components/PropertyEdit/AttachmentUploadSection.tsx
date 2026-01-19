import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Paperclip,
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExpenseAttachment } from '@/lib/schemas';
import { cn } from '@/lib/utils';

// File type to icon mapping
const getFileIcon = (fileType?: string) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return ImageIcon;
  if (fileType === 'application/pdf') return FileText;
  return File;
};

// Format file size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Pending attachment type (for new files being added)
export interface PendingAttachment {
  id: string;
  file: File;
  caption: string;
  preview?: string;
}

interface AttachmentUploadSectionProps {
  // Existing attachments (already saved)
  existingAttachments?: ExpenseAttachment[];
  // Pending attachments (new files to be uploaded)
  pendingAttachments: PendingAttachment[];
  // Callbacks
  onAddFiles: (files: File[]) => void;
  onRemovePending: (id: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onDeleteExisting?: (attachmentId: string) => void;
  // State
  isUploading?: boolean;
  disabled?: boolean;
  // Accepted file types
  accept?: string;
  maxFileSizeMB?: number;
}

export function AttachmentUploadSection({
  existingAttachments = [],
  pendingAttachments,
  onAddFiles,
  onRemovePending,
  onCaptionChange,
  onDeleteExisting,
  isUploading = false,
  disabled = false,
  accept = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx',
  maxFileSizeMB = 10,
}: AttachmentUploadSectionProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Filter out files that are too large
      const validFiles = files.filter(file => {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > maxFileSizeMB) {
          alert(`${file.name} is too large. Maximum size is ${maxFileSizeMB}MB.`);
          return false;
        }
        return true;
      });
      onAddFiles(validFiles);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const validFiles = files.filter(file => {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > maxFileSizeMB) {
          alert(`${file.name} is too large. Maximum size is ${maxFileSizeMB}MB.`);
          return false;
        }
        return true;
      });
      onAddFiles(validFiles);
    }
  };

  const totalCount = existingAttachments.length + pendingAttachments.length;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Paperclip className="h-4 w-4" />
        {t('financialEntries.attachments', 'Attachments')}
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground">({totalCount})</span>
        )}
      </Label>

      {/* Existing Attachments */}
      {existingAttachments.length > 0 && (
        <div className="space-y-2">
          {existingAttachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type || undefined);
            return (
              <div
                key={attachment.attachment_id}
                className="flex items-center gap-2 p-2 bg-muted/50 rounded-md group"
              >
                <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                  {attachment.caption && (
                    <p className="text-xs text-muted-foreground truncate">{attachment.caption}</p>
                  )}
                  {attachment.file_size && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    asChild
                  >
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={attachment.file_name}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  {onDeleteExisting && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => onDeleteExisting(attachment.attachment_id!)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Attachments (new files) */}
      {pendingAttachments.length > 0 && (
        <div className="space-y-2">
          {pendingAttachments.map((pending) => {
            const FileIcon = getFileIcon(pending.file.type);
            return (
              <div
                key={pending.id}
                className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md"
              >
                <FileIcon className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate">{pending.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(pending.file.size)} • New
                  </p>
                  <Input
                    type="text"
                    placeholder={t('financialEntries.caption', 'Caption (optional)')}
                    value={pending.caption}
                    onChange={(e) => onCaptionChange(pending.id, e.target.value)}
                    className="h-7 text-xs"
                    disabled={disabled || isUploading}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive flex-shrink-0"
                  onClick={() => onRemovePending(pending.id)}
                  disabled={disabled || isUploading}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">
                {t('common.uploading', 'Uploading...')}
              </p>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('financialEntries.dragDropFiles', 'Drag & drop files here, or')}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                <Paperclip className="h-4 w-4 mr-1" />
                {t('financialEntries.browseFiles', 'Browse Files')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('financialEntries.maxFileSize', 'Max {{size}}MB per file', { size: maxFileSizeMB })}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttachmentUploadSection;
