'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Input } from '@/components/ui';
import {
  Sparkles,
  Loader2,
  Check,
  X,
  Settings2,
  ArrowRight,
  Ban,
  Link2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PlanStep } from '@/lib/ai/chat-tools';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface PlanStepWithStatus extends PlanStep {
  status: PlanStepStatus;
  widgetId?: string;
  error?: string;
}

interface GenerationPlanCardProps {
  planTitle: string;
  planDescription: string;
  steps: PlanStep[];
  studioId: string;
  conversationId: string | null;
  onPlanStarted?: (planId: string) => void;
  onPlanComplete?: (results: PlanStepWithStatus[]) => void;
  onCancelled?: () => void;
}

// ---------------------------------------------------------------------------
// Step status indicators
// ---------------------------------------------------------------------------

function StepStatusIcon({ status }: { status: PlanStepStatus }) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'completed':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <X className="h-4 w-4 text-red-500" />;
    case 'skipped':
      return <Ban className="h-4 w-4 text-gray-400" />;
    case 'cancelled':
      return <Ban className="h-4 w-4 text-orange-400" />;
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
  }
}

const statusLabels: Record<PlanStepStatus, string> = {
  pending: 'En attente',
  running: 'En cours...',
  completed: 'Termine',
  failed: 'Echec',
  skipped: 'Ignore',
  cancelled: 'Annule',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GenerationPlanCard({
  planTitle,
  planDescription,
  steps: initialSteps,
  studioId,
  conversationId,
  onPlanStarted,
  onPlanComplete,
  onCancelled,
}: GenerationPlanCardProps) {
  const [mode, setMode] = useState<'preview' | 'editing' | 'executing' | 'done' | 'cancelled'>('preview');
  const [editableSteps, setEditableSteps] = useState<PlanStep[]>(initialSteps);
  const [stepStatuses, setStepStatuses] = useState<PlanStepWithStatus[]>(
    initialSteps.map((s) => ({ ...s, status: 'pending' as PlanStepStatus })),
  );
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [planId, setPlanId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Merge editable steps into statuses when entering execution
  const syncStatuses = useCallback((steps: PlanStep[]): PlanStepWithStatus[] => {
    return steps.map((s) => ({
      ...s,
      status: 'pending' as PlanStepStatus,
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Editing helpers
  // ---------------------------------------------------------------------------

  const updateStep = (order: number, update: Partial<PlanStep>) => {
    setEditableSteps((prev) =>
      prev.map((s) => (s.order === order ? { ...s, ...update } : s)),
    );
  };

  const toggleExpand = (order: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(order)) next.delete(order);
      else next.add(order);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // SSE listener for plan step events
  // ---------------------------------------------------------------------------

  const listenForStepEvents = useCallback(
    (currentPlanId: string, signal: AbortSignal) => {
      const es = new EventSource(`/api/studios/${studioId}/events`);

      const handleMessage = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data) as {
            type: string;
            data: Record<string, unknown>;
          };

          if (parsed.type !== 'plan:step-complete' && parsed.type !== 'plan:complete') {
            return;
          }

          const eventPlanId = parsed.data.planId as string | undefined;
          if (eventPlanId !== currentPlanId) return;

          if (parsed.type === 'plan:step-complete') {
            const stepOrder = parsed.data.stepOrder as number;
            const stepStatus = parsed.data.status as PlanStepStatus;
            const widgetId = parsed.data.widgetId as string | undefined;
            const error = parsed.data.error as string | undefined;

            setStepStatuses((prev) =>
              prev.map((s) =>
                s.order === stepOrder
                  ? { ...s, status: stepStatus, widgetId, error }
                  : s,
              ),
            );
          }

          if (parsed.type === 'plan:complete') {
            setMode('done');
            es.close();
          }
        } catch {
          // ignore non-JSON messages
        }
      };

      es.addEventListener('message', handleMessage);

      signal.addEventListener('abort', () => {
        es.close();
      });
    },
    [studioId],
  );

  // ---------------------------------------------------------------------------
  // Execute plan
  // ---------------------------------------------------------------------------

  const handleExecute = async () => {
    const steps = mode === 'editing' ? editableSteps : initialSteps;
    const newStatuses = syncStatuses(steps);
    setStepStatuses(newStatuses);
    setMode('executing');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(
        `/api/studios/${studioId}/chat/execute-plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planSteps: steps,
            conversationId,
          }),
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        throw new Error('Failed to start plan execution');
      }

      const result = (await response.json()) as { planId: string };
      setPlanId(result.planId);
      onPlanStarted?.(result.planId);

      // Start listening for SSE events
      listenForStepEvents(result.planId, abortController.signal);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error("Erreur lors du lancement du plan");
      setMode('preview');
    }
  };

  // ---------------------------------------------------------------------------
  // Cancel plan
  // ---------------------------------------------------------------------------

  const handleCancel = async () => {
    if (mode === 'executing' && planId) {
      abortControllerRef.current?.abort();
      try {
        await fetch(`/api/studios/${studioId}/chat/execute-plan`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId }),
        });
      } catch {
        // best effort
      }

      setStepStatuses((prev) =>
        prev.map((s) =>
          s.status === 'pending' || s.status === 'running'
            ? { ...s, status: 'cancelled' }
            : s,
        ),
      );
      setMode('cancelled');
    } else {
      setMode('cancelled');
      onCancelled?.();
    }
  };

  // ---------------------------------------------------------------------------
  // Completion detection from statuses
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (mode !== 'executing') return;

    const allDone = stepStatuses.every(
      (s) =>
        s.status === 'completed' ||
        s.status === 'failed' ||
        s.status === 'skipped' ||
        s.status === 'cancelled',
    );

    if (allDone) {
      setMode('done');
      onPlanComplete?.(stepStatuses);
    }
  }, [stepStatuses, mode, onPlanComplete]);

  // ---------------------------------------------------------------------------
  // Progress calculation
  // ---------------------------------------------------------------------------

  const completedCount = stepStatuses.filter(
    (s) => s.status === 'completed' || s.status === 'failed' || s.status === 'skipped',
  ).length;
  const totalCount = stepStatuses.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const stepsToShow = mode === 'editing' ? editableSteps : initialSteps;
  const statusMap = new Map(stepStatuses.map((s) => [s.order, s]));

  if (mode === 'cancelled') {
    return (
      <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-muted-foreground">
        Plan de generation annule.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/50 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-blue-200/50">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-blue-900">{planTitle}</div>
            <div className="text-xs text-blue-700 mt-0.5">{planDescription}</div>
            <div className="text-xs text-blue-600 mt-1">
              {totalCount} etape{totalCount > 1 ? 's' : ''}
              {mode === 'executing' && ` - ${completedCount}/${totalCount} terminee(s)`}
            </div>
          </div>
        </div>

        {/* Progress bar during execution */}
        {(mode === 'executing' || mode === 'done') && (
          <div className="mt-2 h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500 ease-out',
                mode === 'done' ? 'bg-green-500' : 'bg-blue-500',
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Steps list */}
      <div className="divide-y divide-blue-100">
        {stepsToShow.map((step) => {
          const stepStatus = statusMap.get(step.order);
          const status = stepStatus?.status ?? 'pending';
          const isExpanded = expandedSteps.has(step.order);
          const isEditing = mode === 'editing';

          return (
            <div key={step.order} className="px-3 py-2">
              <div className="flex items-center gap-2">
                {/* Step number */}
                <span className="flex-shrink-0 text-xs font-mono text-blue-500 w-5 text-center">
                  {step.order}
                </span>

                {/* Status indicator */}
                {(mode === 'executing' || mode === 'done') && (
                  <StepStatusIcon status={status} />
                )}

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <Input
                      value={step.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateStep(step.order, { title: e.target.value })
                      }
                      className="h-7 text-xs"
                    />
                  ) : (
                    <span className="text-sm text-blue-900 truncate block">{step.title}</span>
                  )}
                </div>

                {/* Widget type badge */}
                <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  {step.widgetType}
                </span>

                {/* Dependency indicator */}
                {step.dependsOnStep !== undefined && (
                  <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] text-blue-500" title={`Depend de l'etape ${step.dependsOnStep}`}>
                    <Link2 className="h-3 w-3" />
                    {step.dependsOnStep}
                  </span>
                )}

                {/* Expand/collapse */}
                <button
                  onClick={() => toggleExpand(step.order)}
                  className="p-0.5 rounded hover:bg-blue-100 transition-colors flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 text-blue-500" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-blue-500" />
                  )}
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-1.5 ml-7 space-y-1">
                  {step.description && (
                    <p className="text-xs text-blue-600">{step.description}</p>
                  )}
                  {step.useParentContent && step.dependsOnStep !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-blue-500">
                      <ArrowRight className="h-3 w-3" />
                      Utilise le contenu genere a l&apos;etape {step.dependsOnStep}
                    </div>
                  )}
                  {status === 'completed' && stepStatus?.widgetId && (
                    <div className="text-xs text-green-600">
                      Widget genere ({stepStatus.widgetId.slice(0, 8)}...)
                    </div>
                  )}
                  {status === 'failed' && stepStatus?.error && (
                    <div className="text-xs text-red-500">{stepStatus.error}</div>
                  )}
                  {status === 'skipped' && (
                    <div className="text-xs text-gray-400">
                      Ignore (dependance echouee)
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="p-3 border-t border-blue-200/50 flex gap-2">
        {mode === 'preview' && (
          <>
            <Button size="sm" onClick={handleExecute} className="gap-1">
              <Sparkles className="h-3 w-3" />
              Executer le plan
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMode('editing')}
              className="gap-1"
            >
              <Settings2 className="h-3 w-3" />
              Modifier
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="gap-1 text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" />
              Annuler
            </Button>
          </>
        )}

        {mode === 'editing' && (
          <>
            <Button size="sm" onClick={handleExecute} className="gap-1">
              <Sparkles className="h-3 w-3" />
              Executer le plan
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMode('preview')}
              className="gap-1"
            >
              Apercu
            </Button>
          </>
        )}

        {mode === 'executing' && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <X className="h-3 w-3" />
            Annuler l&apos;execution
          </Button>
        )}

        {mode === 'done' && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            Plan termine - {stepStatuses.filter((s) => s.status === 'completed').length}/{totalCount} widget(s) genere(s)
          </div>
        )}
      </div>
    </div>
  );
}
