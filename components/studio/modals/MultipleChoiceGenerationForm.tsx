'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2 } from 'lucide-react';

interface MultipleChoiceGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

export function MultipleChoiceGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: MultipleChoiceGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [optionsPerQuestion, setOptionsPerQuestion] = useState(4);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/multiple-choice-interactive',
          title: title || 'Choix multiple sans titre',
          description: description || undefined,
          inputs: {
            questionCount,
            optionsPerQuestion,
            allowMultiple,
            timeLimit,
            instructions: instructions || undefined,
          },
          sourceIds: Array.from(selectedSourceIds),
          language: 'fr',
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la generation');
      }

      onGenerated();
      onClose();
    } catch (error) {
      console.error('Error generating multiple choice:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Informations
        </h3>

        <div className="space-y-2">
          <Label htmlFor="title">Titre (optionnel)</Label>
          <Input
            id="title"
            placeholder="Sera genere automatiquement"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optionnelle)</Label>
          <textarea
            id="description"
            className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Sera generee automatiquement"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Instructions personnalisees</Label>
          <textarea
            id="instructions"
            className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Precisez vos attentes pour le Choix multiple..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Parametres
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="questionCount">Nombre de questions</Label>
            <Input
              id="questionCount"
              type="number"
              min={1}
              max={20}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="optionsPerQuestion">Options par question</Label>
            <Input
              id="optionsPerQuestion"
              type="number"
              min={2}
              max={6}
              value={optionsPerQuestion}
              onChange={(e) => setOptionsPerQuestion(parseInt(e.target.value) || 4)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeLimit">Temps limite (secondes, optionnel)</Label>
          <Input
            id="timeLimit"
            type="number"
            min={10}
            max={300}
            placeholder="Pas de limite"
            value={timeLimit || ''}
            onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Autoriser les reponses multiples</span>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isGenerating}>
          Annuler
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generation en cours...
            </>
          ) : (
            'Generer le Choix multiple'
          )}
        </Button>
      </div>
    </div>
  );
}
