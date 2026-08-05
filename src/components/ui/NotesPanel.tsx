import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Textarea } from './Textarea';

export type Note = {
  id: string;
  author: string;
  content: string;
  timestamp: string;
};

export type NotesPanelProps = {
  notes: Note[];
  onAddNote?: (content: string) => void;
  placeholder?: string;
  submitLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function NotesPanel({
  notes,
  onAddNote,
  placeholder = 'Add a note...',
  submitLabel = 'Add note',
  className,
  disabled,
}: NotesPanelProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !onAddNote) return;
    onAddNote(trimmed);
    setContent('');
  };

  return (
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      <div className="border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
          Notes
        </h3>
      </div>

      <ul className="max-h-80 divide-y divide-border overflow-y-auto">
        {notes.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">No notes yet</li>
        ) : (
          notes.map((note) => (
            <li key={note.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{note.author}</span>
                <time className="text-xs text-muted-foreground">{note.timestamp}</time>
              </div>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
            </li>
          ))
        )}
      </ul>

      {onAddNote && (
        <form onSubmit={handleSubmit} className="border-t border-border p-4 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            rows={3}
            disabled={disabled}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={disabled || !content.trim()}>
              {submitLabel}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
