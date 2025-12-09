import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Plus,
  X,
  Trash2,
  User,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExpenseNote } from '@/lib/schemas';
import { format, parseISO } from 'date-fns';

// Pending note type (for new notes being added)
export interface PendingNote {
  id: string;
  text: string;
  timestamp: string;
  authorName: string;
}

interface NotesManagementSectionProps {
  // Existing notes (already saved)
  existingNotes?: ExpenseNote[];
  // Pending notes (new notes to be created)
  pendingNotes: PendingNote[];
  // Current user name for new notes
  currentUserName: string;
  // Callbacks
  onAddNote: (text: string) => void;
  onRemovePending: (id: string) => void;
  onDeleteExisting?: (noteId: string) => void;
  // State
  disabled?: boolean;
}

export function NotesManagementSection({
  existingNotes = [],
  pendingNotes,
  currentUserName,
  onAddNote,
  onRemovePending,
  onDeleteExisting,
  disabled = false,
}: NotesManagementSectionProps) {
  const { t } = useTranslation();
  const [newNoteText, setNewNoteText] = useState('');

  const handleAddNote = () => {
    if (newNoteText.trim()) {
      onAddNote(newNoteText.trim());
      setNewNoteText('');
    }
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

  const totalCount = existingNotes.length + pendingNotes.length;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        {t('financialEntries.notes', 'Notes')}
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground">({totalCount})</span>
        )}
      </Label>

      {/* Existing Notes */}
      {existingNotes.length > 0 && (
        <div className="space-y-2">
          {existingNotes.map((note) => (
            <div
              key={note.note_id}
              className="p-3 bg-muted/50 rounded-md group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <User className="h-3 w-3" />
                    <span className="font-medium">
                      {note.author_name || 'Unknown'}
                    </span>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>{formatNoteDate(note.created_at)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                </div>
                {onDeleteExisting && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={() => onDeleteExisting(note.note_id!)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending Notes (new notes) */}
      {pendingNotes.length > 0 && (
        <div className="space-y-2">
          {pendingNotes.map((pending) => (
            <div
              key={pending.id}
              className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{pending.authorName}</span>
                    <span>•</span>
                    <span className="text-green-600 dark:text-green-400">New</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{pending.text}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive flex-shrink-0"
                  onClick={() => onRemovePending(pending.id)}
                  disabled={disabled}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Note */}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder={t('financialEntries.addNoteHint', 'Add a note...')}
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddNote}
          disabled={disabled || !newNoteText.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('common.add', 'Add')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('financialEntries.noteAsUser', 'Note will be added as {{name}}', { name: currentUserName })}
      </p>
    </div>
  );
}

export default NotesManagementSection;
