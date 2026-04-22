'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2 } from 'lucide-react';

interface RankingGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

export function RankingGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: RankingGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prompt, setPrompt] = useState('');
  const [itemCount, setItemCount] = useState(5);
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/ranking-prioritization',
          title: title || 'Classement sans titre',
          description: description || undefined,
          inputs: {
            prompt: prompt || undefined,
            itemCount,
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
      console.error('Error generating Ranking:', error);
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
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Classement
        </h3>

        <div className="space-y-2">
          <Label htmlFor="prompt">Consigne de classement</Label>
          <textarea
            id="prompt"
            className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Sera genere automatiquement depuis les sources, ou saisissez votre consigne..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Instructions personnalisees</Label>
          <textarea
            id="instructions"
            className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Precisez vos attentes pour le classement..."
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
            <Label htmlFor="itemCount">Nombre d&apos;elements</Label>
            <Input
              id="itemCount"
              type="number"
              min={3}
              max={15}
              value={itemCount}
              onChange={(e) => setItemCount(parseInt(e.target.value) || 5)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeLimit">Temps limite (secondes)</Label>
            <Input
              id="timeLimit"
              type="number"
              min={30}
              max={600}
              placeholder="Pas de limite"
              value={timeLimit || ''}
              onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
        </div>
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
            'Generer le Classement'
          )}
        </Button>
      </div>
    </div>
  );
}
