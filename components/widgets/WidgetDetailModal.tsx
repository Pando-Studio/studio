'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { Loader2, Eye, Pencil, Trash2, Network, Maximize2, Play, RotateCw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { getWidgetRenderers } from './registry';
import type { WidgetType, WidgetData } from './types';
import { logger } from '@/lib/monitoring/logger';
import { WidgetEditProvider } from './widget-edit-context';
import { GenerateFromWidgetButton } from '@/components/studio/GenerateFromWidgetButton';
import { WidgetBreadcrumb } from '@/components/studio/WidgetBreadcrumb';
import type { GenerationType } from '@/components/studio/modals/GenerationModal';

interface WidgetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgetId: string;
  studioId: string;
  onUpdated?: () => void;
  onDeleted?: () => void;
  onGenerateFrom?: (type: GenerationType, parentWidget: WidgetData) => void;
  onNavigateToWidget?: (widgetId: string) => void;
}

type TabMode = 'display' | 'edit' | 'structure' | 'play';

export function WidgetDetailModal({
  isOpen,
  onClose,
  widgetId,
  studioId,
  onUpdated,
  onDeleted,
  onGenerateFrom,
  onNavigateToWidget,
}: WidgetDetailModalProps) {
  const [widget, setWidget] = useState<WidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TabMode>('display');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/widgets/${widgetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READY' }),
      });
      if (!res.ok) throw new Error('Failed to confirm widget');
      const result = await res.json();
      setWidget(result.widget);
      onUpdated?.();
      toast.success('Widget confirme');
    } catch (err) {
      logger.error('Error confirming widget', { error: err instanceof Error ? err : String(err) });
      toast.error('Erreur lors de la confirmation');
    } finally {
      setIsConfirming(false);
    }
  }, [studioId, widgetId, onUpdated]);

  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    try {
      // Fetch runs to find the one linked to this widget and get original inputs
      const runsRes = await fetch(`/api/studios/${studioId}/generations`);
      if (!runsRes.ok) throw new Error('Failed to fetch generation runs');
      const runsData = await runsRes.json();
      const widgetRun = (runsData.runs as Array<{ widgetId?: string; metadata?: { inputs?: Record<string, unknown> } }>)
        ?.find((r) => r.widgetId === widgetId);
      const inputs = widgetRun?.metadata?.inputs;

      if (!inputs || !(inputs as Record<string, unknown>).widgetTemplateId) {
        toast.error('Impossible de regenerer — parametres originaux introuvables');
        return;
      }

      const { widgetTemplateId, ...restInputs } = inputs as Record<string, unknown>;

      await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingWidgetId: widgetId,
          widgetTemplateId,
          ...restInputs,
        }),
      });
      toast.success('Regeneration lancee');
      onUpdated?.();
      onClose();
    } catch (err) {
      logger.error('Error regenerating widget', { error: err instanceof Error ? err : String(err) });
      toast.error('Erreur lors de la regeneration');
    } finally {
      setIsRegenerating(false);
    }
  }, [studioId, widgetId, onUpdated, onClose]);

  const fetchWidget = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/widgets/${widgetId}`);
      if (!res.ok) throw new Error('Failed to fetch widget');
      const data = await res.json();
      setWidget(data.widget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [studioId, widgetId]);

  useEffect(() => {
    if (isOpen && widgetId) {
      setMode('display');
      fetchWidget();
    }
  }, [isOpen, widgetId, fetchWidget]);

  const handleSave = useCallback(
    async (data: Record<string, unknown>) => {
      setIsSaving(true);
      try {
        const response = await fetch(
          `/api/studios/${studioId}/widgets/${widgetId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data }),
          }
        );
        if (!response.ok) {
          throw new Error('Failed to save widget');
        }
        const result = await response.json();
        setWidget(result.widget);
        setMode('display');
        onUpdated?.();
      } catch (err) {
        logger.error('Error saving widget', { error: err instanceof Error ? err : String(err) });
      } finally {
        setIsSaving(false);
      }
    },
    [studioId, widgetId, onUpdated]
  );

  const handleDelete = useCallback(async () => {
    if (!confirm('Supprimer ce widget ?')) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/studios/${studioId}/widgets/${widgetId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        throw new Error('Failed to delete widget');
      }
      onDeleted?.();
      onClose();
    } catch (err) {
      logger.error('Error deleting widget', { error: err instanceof Error ? err : String(err) });
    } finally {
      setIsDeleting(false);
    }
  }, [studioId, widgetId, onDeleted, onClose]);

  // Composition callbacks
  const handleAddChild = useCallback(
    async (slotId: string, type: WidgetType) => {
      try {
        const res = await fetch(
          `/api/studios/${studioId}/widgets/${widgetId}/children`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type,
              title: `Nouveau ${type.toLowerCase()}`,
              slotId,
            }),
          }
        );
        if (!res.ok) throw new Error('Failed to add child');
        await fetchWidget();
        onUpdated?.();
      } catch (err) {
        logger.error('Error adding child', { error: err instanceof Error ? err : String(err) });
      }
    },
    [studioId, widgetId, fetchWidget, onUpdated]
  );

  const handleRemoveChild = useCallback(
    async (childId: string) => {
      try {
        const res = await fetch(
          `/api/studios/${studioId}/widgets/${childId}`,
          { method: 'DELETE' }
        );
        if (!res.ok) throw new Error('Failed to remove child');
        await fetchWidget();
        onUpdated?.();
      } catch (err) {
        logger.error('Error removing child', { error: err instanceof Error ? err : String(err) });
      }
    },
    [studioId, fetchWidget, onUpdated]
  );

  const handleReorderChildren = useCallback(
    async (slotId: string, orderedIds: string[]) => {
      try {
        await Promise.all(
          orderedIds.map((id, index) =>
            fetch(`/api/studios/${studioId}/widgets/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order: index }),
            })
          )
        );
        await fetchWidget();
        onUpdated?.();
      } catch (err) {
        logger.error('Error reordering children', { error: err instanceof Error ? err : String(err) });
      }
    },
    [studioId, fetchWidget, onUpdated]
  );

  const renderers = widget ? getWidgetRenderers(widget.type) : null;
  const isComposite = widget?.kind === 'COMPOSED';
  const childWidgets = widget?.children || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          {/* Breadcrumb */}
          {widget && (
            <WidgetBreadcrumb
              widget={widget}
              studioId={studioId}
              onNavigateToParent={onNavigateToWidget}
              className="mb-1"
            />
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle>{widget?.title || 'Widget'}</DialogTitle>
              {/* Generate from button */}
              {widget && onGenerateFrom && (
                <GenerateFromWidgetButton
                  widget={widget}
                  studioId={studioId}
                  onGenerate={onGenerateFrom}
                  variant="icon"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Tab toggle */}
              <div className="flex rounded-lg border p-0.5">
                <button
                  className={cn(
                    'px-3 py-1 text-xs rounded-md transition-colors',
                    mode === 'display'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setMode('display')}
                >
                  <Eye className="h-3.5 w-3.5 inline mr-1" />
                  Apercu
                </button>
                <button
                  className={cn(
                    'px-3 py-1 text-xs rounded-md transition-colors',
                    mode === 'edit'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setMode('edit')}
                >
                  <Pencil className="h-3.5 w-3.5 inline mr-1" />
                  Editer
                </button>
                {isComposite && (
                  <button
                    className={cn(
                      'px-3 py-1 text-xs rounded-md transition-colors',
                      mode === 'structure'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setMode('structure')}
                  >
                    <Network className="h-3.5 w-3.5 inline mr-1" />
                    Structure
                  </button>
                )}
                {renderers?.Player && (
                  <button
                    className={cn(
                      'px-3 py-1 text-xs rounded-md transition-colors',
                      mode === 'play'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setMode('play')}
                  >
                    <Play className="h-3.5 w-3.5 inline mr-1" />
                    Jouer
                  </button>
                )}
              </div>
              {/* Open full editor (composite only) */}
              {isComposite && (
                <Link href={`/studios/${studioId}/composites/${widgetId}`}>
                  <Button variant="outline" size="sm">
                    <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                    Editeur complet
                  </Button>
                </Link>
              )}
              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Draft confirmation bar */}
        {widget?.status === 'DRAFT' && (
          <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200 rounded-t-lg">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Eye className="h-4 w-4" />
              <span>Apercu — verifiez le contenu genere</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <RotateCw className="h-3.5 w-3.5 mr-1" />
                )}
                Regenerer
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1" />
                )}
                Confirmer
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 p-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-center text-destructive py-12">{error}</p>
          ) : widget && renderers ? (
            <>
              {isSaving && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sauvegarde...
                </div>
              )}
              {mode === 'display' ? (
                <renderers.Display
                  data={widget.data}
                  widget={widget}
                  children={childWidgets}
                />
              ) : mode === 'edit' ? (
                <WidgetEditProvider
                  widgetId={widgetId}
                  studioId={studioId}
                  initialData={widget.data}
                  onSaved={(data) => {
                    setWidget((prev) => prev ? { ...prev, data } : prev);
                    onUpdated?.();
                  }}
                >
                  <renderers.Editor
                    data={widget.data}
                    onSave={handleSave}
                    widget={widget}
                    children={childWidgets}
                    onAddChild={handleAddChild}
                    onRemoveChild={handleRemoveChild}
                    onReorderChildren={handleReorderChildren}
                  />
                </WidgetEditProvider>
              ) : mode === 'play' && renderers.Player ? (
                <renderers.Player
                  data={widget.data}
                  widget={widget}
                />
              ) : (
                <StructureView widget={widget} children={childWidgets} />
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Widget introuvable
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Structure view for composed widgets
function StructureView({
  widget,
  children: childWidgets,
}: {
  widget: WidgetData;
  children: WidgetData[];
}) {
  const kindLabels: Record<string, string> = {
    LEAF: 'Feuille',
    COMPOSED: 'Compose',
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-muted/20">
        <div className="flex items-center gap-2 mb-2">
          <Network className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Informations de composition</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Type:</span>{' '}
            <span className="font-medium">{widget.type}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Kind:</span>{' '}
            <span className="font-medium">{kindLabels[widget.kind] || widget.kind}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Enfants:</span>{' '}
            <span className="font-medium">{childWidgets.length}</span>
          </div>
          {widget.parentId && (
            <div>
              <span className="text-muted-foreground">Parent:</span>{' '}
              <span className="font-mono text-xs">{widget.parentId}</span>
            </div>
          )}
        </div>
      </div>

      {childWidgets.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Arbre de composition</p>
          <div className="border rounded-lg divide-y">
            {childWidgets.map((child, i) => (
              <div key={child.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{child.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {child.type} · {kindLabels[child.kind] || child.kind}
                    {child.slotId && ` · slot: ${child.slotId}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
