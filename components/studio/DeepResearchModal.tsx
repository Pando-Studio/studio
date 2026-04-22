'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Search, Loader2, CheckCircle2, XCircle, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeepResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioId: string;
}

type ResearchStatus =
  | 'idle'
  | 'pending'
  | 'searching'
  | 'scraping'
  | 'indexing'
  | 'completed'
  | 'failed';

interface ProgressEvent {
  runId: string;
  status: ResearchStatus;
  step?: string;
  pagesFound?: number;
  pagesRetained?: number;
  summary?: string;
  error?: string;
}

const STATUS_LABELS: Record<ResearchStatus, string> = {
  idle: '',
  pending: 'En attente...',
  searching: 'Recherche en cours...',
  scraping: 'Extraction des pages...',
  indexing: 'Indexation des sources...',
  completed: 'Recherche terminee',
  failed: 'Echec de la recherche',
};

export function DeepResearchModal({
  isOpen,
  onClose,
  studioId,
}: DeepResearchModalProps) {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [depth, setDepth] = useState<'standard' | 'deep'>('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<ResearchStatus>('idle');
  const [currentStep, setCurrentStep] = useState('');
  const [progressData, setProgressData] = useState<ProgressEvent | null>(null);

  // Listen for SSE events when a run is active
  useEffect(() => {
    if (!currentRunId || !isOpen) return;

    const es = new EventSource(`/api/studios/${studioId}/events`);

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          type: string;
          data: ProgressEvent;
        };

        if (parsed.type === 'research:progress' && parsed.data.runId === currentRunId) {
          const data = parsed.data;
          setStatus(data.status);
          if (data.step) setCurrentStep(data.step);
          setProgressData(data);

          if (data.status === 'completed' || data.status === 'failed') {
            setIsSubmitting(false);
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    return () => {
      es.close();
    };
  }, [currentRunId, studioId, isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!query.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStatus('pending');
    setCurrentStep('Lancement de la recherche...');
    setProgressData(null);

    try {
      const response = await fetch(`/api/studios/${studioId}/deep-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), language, depth }),
      });

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || 'Erreur serveur');
      }

      const data = await response.json() as { runId: string };
      setCurrentRunId(data.runId);
    } catch (error: unknown) {
      setStatus('failed');
      setCurrentStep(error instanceof Error ? error.message : 'Erreur inconnue');
      setIsSubmitting(false);
    }
  }, [query, language, depth, studioId, isSubmitting]);

  const handleClose = () => {
    if (!isSubmitting) {
      setQuery('');
      setStatus('idle');
      setCurrentStep('');
      setProgressData(null);
      setCurrentRunId(null);
    }
    onClose();
  };

  const isRunning = isSubmitting || (status !== 'idle' && status !== 'completed' && status !== 'failed');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Deep Research
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Query input */}
          <div className="space-y-2">
            <Label htmlFor="research-query">Sujet de recherche</Label>
            <Input
              id="research-query"
              placeholder="Ex: Les dernières avancées en pédagogie numérique..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isRunning}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRunning) handleSubmit();
              }}
            />
          </div>

          {/* Language selector */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Langue</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as 'fr' | 'en')}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Francais</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Depth selector */}
            <div className="space-y-2">
              <Label>Profondeur</Label>
              <Select
                value={depth}
                onValueChange={(v) => setDepth(v as 'standard' | 'deep')}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (5 pages)</SelectItem>
                  <SelectItem value="deep">Approfondi (15 pages)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Progress section */}
          {status !== 'idle' && (
            <div
              className={cn(
                'rounded-lg border p-4 space-y-2',
                status === 'completed' && 'border-green-200 bg-green-50',
                status === 'failed' && 'border-red-200 bg-red-50',
                status !== 'completed' && status !== 'failed' && 'border-blue-200 bg-blue-50'
              )}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : status === 'failed' ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
                <span>{STATUS_LABELS[status]}</span>
              </div>

              {currentStep && (
                <p className="text-sm text-muted-foreground">{currentStep}</p>
              )}

              {progressData?.pagesFound !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Pages trouvees: {progressData.pagesFound}
                  {progressData.pagesRetained !== undefined &&
                    ` | Retenues: ${progressData.pagesRetained}`}
                </p>
              )}

              {progressData?.summary && status === 'completed' && (
                <div className="mt-2 text-sm whitespace-pre-wrap">
                  {progressData.summary}
                </div>
              )}

              {progressData?.error && status === 'failed' && (
                <p className="text-sm text-red-600">{progressData.error}</p>
              )}
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isRunning}>
              {status === 'completed' ? 'Fermer' : 'Annuler'}
            </Button>
            {status !== 'completed' && (
              <Button
                onClick={handleSubmit}
                disabled={!query.trim() || isRunning}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recherche en cours...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Rechercher
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
