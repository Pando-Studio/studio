'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { useStudio, Widget } from '../context/StudioContext';
import {
  ListOrdered,
  GraduationCap,
  CheckSquare,
  Square,
  Loader2,
  HelpCircle,
  Cloud,
  Users,
  ListChecks,
  StickyNote,
  ArrowUpDown,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const widgetTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  QUIZ: HelpCircle,
  WORDCLOUD: Cloud,
  ROLEPLAY: Users,
  MULTIPLE_CHOICE: ListChecks,
  POSTIT: StickyNote,
  RANKING: ArrowUpDown,
  OPENTEXT: FileText,
  FAQ: HelpCircle,
  GLOSSARY: FileText,
  SUMMARY: FileText,
  FLASHCARD: FileText,
  TIMELINE: FileText,
  REPORT: FileText,
  DATA_TABLE: FileText,
};

interface CreateCompositeFromLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioId: string;
  onCreated: () => void;
}

export function CreateCompositeFromLibraryModal({
  isOpen,
  onClose,
  studioId,
  onCreated,
}: CreateCompositeFromLibraryModalProps) {
  const { rootWidgets } = useStudio();
  const [compositeType, setCompositeType] = useState<'SEQUENCE' | 'COURSE_MODULE'>('SEQUENCE');
  const [title, setTitle] = useState('');
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const availableWidgets = rootWidgets.filter(
    (w) => w.status === 'READY' && w.kind === 'LEAF'
  );

  const toggleWidget = (id: string) => {
    setSelectedWidgetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (selectedWidgetIds.size < 2) return;
    setIsCreating(true);

    try {
      const kind = 'COMPOSED';
      const composition =
        compositeType === 'COURSE_MODULE'
          ? {
              kind: 'COMPOSED',
              slots: [
                { id: 'intro', name: 'Introduction', required: true, accepts: [{ tags: ['media', 'content'] }], maxChildren: 1 },
                { id: 'activities', name: 'Activites', required: false, accepts: [{ tags: ['interactive', 'assessment'] }] },
                { id: 'assessment', name: 'Evaluation', required: true, accepts: [{ tags: ['assessment'] }], maxChildren: 1 },
              ],
            }
          : {
              kind: 'COMPOSED',
              accepts: [{ tags: ['interactive', 'assessment', 'media', 'content'] }],
            };

      // Create the composite parent
      const res = await fetch(`/api/studios/${studioId}/widgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: compositeType,
          title: title || (compositeType === 'SEQUENCE' ? 'Nouvelle sequence' : 'Nouveau module'),
          kind,
          data: {},
          composition,
          status: 'READY',
        }),
      });

      if (!res.ok) throw new Error('Failed to create composite');

      const { widget: parent } = await res.json();

      // Assign selected widgets as children
      const orderedIds = Array.from(selectedWidgetIds);
      for (let i = 0; i < orderedIds.length; i++) {
        const childId = orderedIds[i];
        await fetch(`/api/studios/${studioId}/widgets/${childId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentId: parent.id,
            slotId: compositeType === 'COURSE_MODULE' ? 'activities' : undefined,
            order: i,
          }),
        });
      }

      onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating composite from library:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Creer un composite depuis la bibliotheque</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Composite type */}
          <div className="space-y-2">
            <Label>Type de composite</Label>
            <div className="flex gap-2">
              <button
                className={cn(
                  'flex-1 flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors',
                  compositeType === 'SEQUENCE'
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                )}
                onClick={() => setCompositeType('SEQUENCE')}
              >
                <ListOrdered className="h-4 w-4 text-cyan-500" />
                Sequence
              </button>
              <button
                className={cn(
                  'flex-1 flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors',
                  compositeType === 'COURSE_MODULE'
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                )}
                onClick={() => setCompositeType('COURSE_MODULE')}
              >
                <GraduationCap className="h-4 w-4 text-violet-500" />
                Module de cours
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="composite-title">Titre</Label>
            <Input
              id="composite-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={compositeType === 'SEQUENCE' ? 'Nouvelle sequence' : 'Nouveau module'}
            />
          </div>

          {/* Widget selection */}
          <div className="space-y-2">
            <Label>
              Widgets a inclure ({selectedWidgetIds.size} selectionne{selectedWidgetIds.size > 1 ? 's' : ''})
            </Label>
            {availableWidgets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucun widget disponible. Generez d&apos;abord des widgets.
              </p>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {availableWidgets.map((widget) => {
                  const isSelected = selectedWidgetIds.has(widget.id);
                  const TypeIcon = widgetTypeIcons[widget.type] || FileText;

                  return (
                    <button
                      key={widget.id}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => toggleWidget(widget.id)}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{widget.title}</p>
                        <p className="text-xs text-muted-foreground">{widget.type}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || selectedWidgetIds.size < 2}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creation...
                </>
              ) : (
                `Creer (${selectedWidgetIds.size} widgets)`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
