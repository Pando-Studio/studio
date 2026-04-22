'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { FileText, Send, RotateCcw, BookOpen } from 'lucide-react';
import { usePlayer } from './PlayerContext';
import type { WidgetDisplayProps } from '../types';

interface OpenTextData {
  prompt: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  referenceAnswer?: string;
}

export function OpentextPlayer({ data }: WidgetDisplayProps) {
  const otData = data as unknown as OpenTextData;
  const { trackStart, trackComplete } = usePlayer();

  const [answer, setAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const ensureStarted = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
      trackStart();
    }
  }, [hasStarted, trackStart]);

  const handleChange = (value: string) => {
    ensureStarted();
    if (otData.maxLength && value.length > otData.maxLength) return;
    setAnswer(value);
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    trackComplete();
  };

  const handleReset = () => {
    setAnswer('');
    setIsSubmitted(false);
    setHasStarted(false);
  };

  const canSubmit =
    answer.trim().length > 0 &&
    (!otData.minLength || answer.length >= otData.minLength);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-500" />
          <h3 className="text-lg font-semibold">Question ouverte</h3>
        </div>
        <p className="text-base">{otData.prompt}</p>
      </div>

      {!isSubmitted ? (
        <div className="space-y-3">
          <textarea
            className={cn(
              'w-full min-h-[150px] p-4 border rounded-lg bg-background text-sm resize-y',
              'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
            )}
            placeholder={otData.placeholder ?? 'Ecrivez votre reponse ici...'}
            value={answer}
            onChange={(e) => handleChange(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {answer.length}
              {otData.maxLength ? ` / ${otData.maxLength}` : ''} caracteres
              {otData.minLength ? ` (min ${otData.minLength})` : ''}
            </span>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              <Send className="h-4 w-4 mr-2" />
              Soumettre
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* User answer */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Votre reponse
            </h4>
            <div className="border rounded-lg p-4 bg-primary/5 border-primary/20">
              <p className="text-sm whitespace-pre-wrap">{answer}</p>
            </div>
          </div>

          {/* Reference answer if available */}
          {otData.referenceAnswer && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Reponse de reference
                </h4>
              </div>
              <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                <p className="text-sm whitespace-pre-wrap text-green-800">
                  {otData.referenceAnswer}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Recommencer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
