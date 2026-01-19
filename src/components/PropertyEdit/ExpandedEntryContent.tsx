import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Paperclip,
  MessageSquare,
  Download,
  Trash2,
  Plus,
  FileText,
  Image as ImageIcon,
  File,
  User,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExpenseAttachment, ExpenseNote } from '@/lib/schemas';
import { format, parseISO } from 'date-fns';
import { sanitizeText } from '@/lib/sanitize';
import { useExpenseAttachments, useCreateExpenseAttachment, useDeleteExpenseAttachment } from '@/hooks/useExpenseAttachments';
import { useExpenseNotes, useCreateExpenseNote, useDeleteExpenseNote } from '@/hooks/useExpenseNotes';
import { useAuth } from '@/contexts/AuthContext';

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

interface ExpandedEntryContentProps {
  expenseId: string;
  onClose?: () => void;
  readOnly?: boolean;
}

export function ExpandedEntryContent({ expenseId, onClose, readOnly = false }: ExpandedEntryContentProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [newNoteText, setNewNoteText] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch attachments and notes
  const { data: attachments = [], isLoading: loadingAttachments } = useExpenseAttachments(expenseId);
  const { data: notes = [], isLoading: loadingNotes } = useExpenseNotes(expenseId);

  // Mutations
  const createAttachment = useCreateExpenseAttachment();
  const deleteAttachment = useDeleteExpenseAttachment();
  const createNote = useCreateExpenseNote();
  const deleteNote = useDeleteExpenseNote();

  // Get current user display name
  const currentUserName = user?.user_metadata?.first_name && user?.user_metadata?.last_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
    : user?.email?.split('@')[0] || 'Unknown';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }
      await createAttachment.mutateAsync({
        expenseId,
        file,
        caption: '',
      });
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    await createNote.mutateAsync({
      expenseId,
      noteText: newNoteText.trim(),
      authorName: currentUserName,
    });
    setNewNoteText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const formatNoteDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  const isLoading = loadingAttachments || loadingNotes;
  const isUploading = createAttachment.isPending;
  const isAddingNote = createNote.isPending;

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <>
          {/* Attachments Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                {t('financialEntries.attachments', 'Attachments')}
                <span className="text-xs text-muted-foreground">({attachments.length})</span>
              </h4>
              {!readOnly && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 mr-1" />
                    )}
                    {t('financialEntries.addAttachment', 'Add File')}
                  </Button>
                </>
              )}
            </div>

            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {t('financialEntries.noAttachments', 'No attachments yet')}
              </p>
            ) : (
              <div className="space-y-1">
                {attachments.map((attachment) => {
                  const FileIcon = getFileIcon(attachment.file_type || undefined);
                  return (
                    <div
                      key={attachment.attachment_id}
                      className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded border group"
                    >
                      <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {attachment.caption && <span>{sanitizeText(attachment.caption)}</span>}
                          {attachment.file_size && <span>{formatFileSize(attachment.file_size)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
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
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteAttachment.mutate(attachment.attachment_id!)}
                            disabled={deleteAttachment.isPending}
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
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('financialEntries.notes', 'Notes')}
              <span className="text-xs text-muted-foreground">({notes.length})</span>
            </h4>

            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {t('financialEntries.noNotes', 'No notes yet')}
              </p>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.note_id}
                    className="p-2 bg-white dark:bg-slate-800 rounded border group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <User className="h-3 w-3" />
                          <span className="font-medium">{note.author_name || 'Unknown'}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{formatNoteDate(note.created_at)}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{sanitizeText(note.note_text)}</p>
                      </div>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => deleteNote.mutate(note.note_id!)}
                          disabled={deleteNote.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Note Input */}
            {!readOnly && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="text"
                  placeholder={t('financialEntries.addNoteHint', 'Add a note...')}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                  disabled={isAddingNote}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddNote}
                  disabled={isAddingNote || !newNoteText.trim()}
                >
                  {isAddingNote ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 mr-1" />
                  )}
                  {t('common.add', 'Add')}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ExpandedEntryContent;
