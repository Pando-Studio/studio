'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
} from '@/components/ui';
import {
  Loader2,
  Copy,
  ExternalLink,
  Check,
  AlertCircle,
  Radio,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Widget } from '../context/StudioContext';

const DEPLOYABLE_TYPES = new Set([
  'MULTIPLE_CHOICE', 'QUIZ', 'WORDCLOUD', 'POSTIT', 'ROLEPLAY', 'RANKING', 'OPENTEXT',
]);

interface DeployToEngageModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioId: string;
  studioTitle: string;
  widgets: Widget[];
}

type DeployState = 'config' | 'deploying' | 'success' | 'error';

interface DeployResult {
  engageProjectId: string;
  sessionCode: string;
  sessionId: string;
  presenterUrl: string;
  participantUrl: string;
  activitiesCount: number;
}

export function DeployToEngageModal({
  isOpen,
  onClose,
  studioId,
  studioTitle,
  widgets,
}: DeployToEngageModalProps) {
  const [state, setState] = useState<DeployState>('config');
  const [title, setTitle] = useState(studioTitle);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<DeployResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Filter widgets: only root, READY, and deployable type (or composite with children)
  const deployableWidgets = useMemo(() => {
    return widgets.filter((w) => {
      if (w.parentId) return false;
      if (w.kind === 'COMPOSED') return true;
      return DEPLOYABLE_TYPES.has(w.type) && w.status === 'READY';
    });
  }, [widgets]);

  // Init selection
  useState(() => {
    setSelectedWidgetIds(new Set(deployableWidgets.map((w) => w.id)));
  });

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

  const handleDeploy = async () => {
    setState('deploying');
    setError(null);

    try {
      const response = await fetch(`/api/studios/${studioId}/deploy-to-engage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetIds: Array.from(selectedWidgetIds),
          title,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du deploiement');
      }

      const data = await response.json();
      setResult(data);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setState('error');
    }
  };

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClose = () => {
    setState('config');
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Session live
          </DialogTitle>
          <DialogDescription>
            Deployez vos widgets vers Engage pour lancer une session participative
          </DialogDescription>
        </DialogHeader>

        {state === 'config' && (
          <ConfigPhase
            title={title}
            onTitleChange={setTitle}
            widgets={deployableWidgets}
            selectedIds={selectedWidgetIds}
            onToggle={toggleWidget}
            onDeploy={handleDeploy}
            canDeploy={selectedWidgetIds.size > 0}
          />
        )}

        {state === 'deploying' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Creation de la session...</p>
          </div>
        )}

        {state === 'success' && result && (
          <SuccessPhase result={result} copied={copied} onCopy={handleCopy} />
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive text-center">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setState('config')}>
                Retour
              </Button>
              <Button onClick={handleDeploy}>Reessayer</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Config Phase ---

function ConfigPhase({
  title,
  onTitleChange,
  widgets,
  selectedIds,
  onToggle,
  onDeploy,
  canDeploy,
}: {
  title: string;
  onTitleChange: (t: string) => void;
  widgets: Widget[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onDeploy: () => void;
  canDeploy: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="text-sm font-medium">Titre de la session</label>
        <Input
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onTitleChange(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Widget selection */}
      <div>
        <label className="text-sm font-medium">
          Widgets a deployer ({selectedIds.size}/{widgets.length})
        </label>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border divide-y">
          {widgets.map((widget) => {
            const isSelected = selectedIds.has(widget.id);
            const isComposite = widget.kind === 'COMPOSED';
            return (
              <label
                key={widget.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(widget.id)}
                  className="rounded border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{widget.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {widget.type}
                    {isComposite && ` (${widget.children?.length || 0} enfants)`}
                  </p>
                </div>
                {widget.status === 'READY' && (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                )}
              </label>
            );
          })}
          {widgets.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun widget deployable (les widgets doivent etre READY)
            </p>
          )}
        </div>
      </div>

      <Button onClick={onDeploy} disabled={!canDeploy} className="w-full">
        <Radio className="h-4 w-4 mr-2" />
        Lancer la session
      </Button>
    </div>
  );
}

// --- Success Phase ---

function SuccessPhase({
  result,
  copied,
  onCopy,
}: {
  result: DeployResult;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Session code */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Code de la session</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl font-mono font-bold tracking-widest text-primary">
            {result.sessionCode}
          </span>
          <button
            onClick={() => onCopy(result.sessionCode, 'code')}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            title="Copier"
          >
            {copied === 'code' ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Copy className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {result.activitiesCount} activite{result.activitiesCount !== 1 ? 's' : ''} deployee{result.activitiesCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* URLs */}
      <div className="space-y-3">
        {result.participantUrl && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">URL Participant</span>
              <button
                onClick={() => onCopy(result.participantUrl, 'participant')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {copied === 'participant' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copier
              </button>
            </div>
            <p className="text-sm font-mono truncate">{result.participantUrl}</p>
          </div>
        )}

        {result.presenterUrl && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">URL Presentateur</span>
              <button
                onClick={() => onCopy(result.presenterUrl, 'presenter')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {copied === 'presenter' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copier
              </button>
            </div>
            <p className="text-sm font-mono truncate">{result.presenterUrl}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {result.presenterUrl && (
          <Button asChild className="flex-1">
            <a href={result.presenterUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir le presentateur
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
