'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/monitoring/logger';

interface WidgetEditContextValue {
  widgetId: string;
  studioId: string;
  config: Record<string, unknown>;
  updateConfig: (updates: Record<string, unknown>) => void;
  isSaving: boolean;
  lastSavedAt: Date | null;
  /** Flush any pending debounced save immediately */
  flushSave: () => void;
}

const WidgetEditContext = createContext<WidgetEditContextValue | null>(null);

interface WidgetEditProviderProps {
  children: ReactNode;
  widgetId: string;
  studioId: string;
  initialData: Record<string, unknown>;
  /** Called after each successful auto-save (e.g. to refresh parent state) */
  onSaved?: (data: Record<string, unknown>) => void;
}

export function WidgetEditProvider({
  children,
  widgetId,
  studioId,
  initialData,
  onSaved,
}: WidgetEditProviderProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingConfigRef = useRef<Record<string, unknown> | null>(null);
  const pendingWidgetIdRef = useRef<string | null>(null);
  const saveCountRef = useRef(0);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // Stable reference for the current studioId to use in flush
  const studioIdRef = useRef(studioId);
  studioIdRef.current = studioId;

  const doSave = useCallback(
    async (targetWidgetId: string, data: Record<string, unknown>) => {
      setIsSaving(true);
      try {
        const response = await fetch(
          `/api/studios/${studioIdRef.current}/widgets/${targetWidgetId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data }),
          },
        );
        if (!response.ok) {
          throw new Error(`Save failed: ${response.status}`);
        }
        setLastSavedAt(new Date());
        saveCountRef.current += 1;
        onSavedRef.current?.(data);

        // Only show toast after 2+ saves to avoid spam on first edit
        if (saveCountRef.current >= 2) {
          toast.success('Sauvegarde automatique', { id: 'widget-autosave' });
        }
      } catch (err: unknown) {
        logger.error('Auto-save failed', {
          widgetId: targetWidgetId,
          studioId: studioIdRef.current,
          error: err instanceof Error ? err : String(err),
        });
        toast.error('Erreur de sauvegarde automatique');
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const flushSave = useCallback(() => {
    if (debounceRef.current && pendingConfigRef.current && pendingWidgetIdRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      const targetId = pendingWidgetIdRef.current;
      const data = pendingConfigRef.current;
      pendingConfigRef.current = null;
      pendingWidgetIdRef.current = null;
      doSave(targetId, data);
    }
  }, [doSave]);

  // On widget ID change: flush pending save for previous widget, load new data
  useEffect(() => {
    flushSave();
    setConfig(initialData);
    saveCountRef.current = 0;
    setLastSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetId]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current && pendingConfigRef.current && pendingWidgetIdRef.current) {
        clearTimeout(debounceRef.current);
        const targetId = pendingWidgetIdRef.current;
        const data = pendingConfigRef.current;
        // Fire and forget on unmount
        doSave(targetId, data);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateConfig = useCallback(
    (updates: Record<string, unknown>) => {
      setConfig((prev) => {
        const merged = { ...prev, ...updates };

        if (debounceRef.current) clearTimeout(debounceRef.current);

        pendingConfigRef.current = merged;
        pendingWidgetIdRef.current = widgetId;
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null;
          pendingConfigRef.current = null;
          pendingWidgetIdRef.current = null;
          doSave(widgetId, merged);
        }, 500);

        return merged;
      });
    },
    [widgetId, doSave],
  );

  return (
    <WidgetEditContext.Provider
      value={{
        widgetId,
        studioId,
        config,
        updateConfig,
        isSaving,
        lastSavedAt,
        flushSave,
      }}
    >
      {children}
    </WidgetEditContext.Provider>
  );
}

export function useWidgetConfig(): WidgetEditContextValue {
  const context = useContext(WidgetEditContext);
  if (!context) {
    throw new Error('useWidgetConfig must be used within a WidgetEditProvider');
  }
  return context;
}
