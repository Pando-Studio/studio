'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2 } from 'lucide-react';

interface PostitGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

export function PostitGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: PostitGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prompt, setPrompt] = useState('');
  const [categoryCount, setCategoryCount] = useState(3);
  const [maxPostIts, setMaxPostIts] = useState(5);
  const [allowVoting, setAllowVoting] = useState(true);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/postit-brainstorm',
          title: title || 'Post-it sans titre',
          description: description || undefined,
          inputs: {
            prompt: prompt || undefined,
            categoryCount,
            maxPostIts,
            allowVoting,
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
      console.error('Error generating PostIt:', error);
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
          Question
        </h3>

        <div className="space-y-2">
          <Label htmlFor="prompt">Question / Theme du brainstorming</Label>
          <textarea
            id="prompt"
            className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Sera genere automatiquement depuis les sources, ou saisissez votre question..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Instructions personnalisees</Label>
          <textarea
            id="instructions"
            className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Precisez vos attentes pour le brainstorming..."
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
            <Label htmlFor="categoryCount">Nombre de categories</Label>
            <Input
              id="categoryCount"
              type="number"
              min={0}
              max={8}
              value={categoryCount}
              onChange={(e) => setCategoryCount(parseInt(e.target.value) || 3)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPostIts">Post-its max par participant</Label>
            <Input
              id="maxPostIts"
              type="number"
              min={1}
              max={20}
              value={maxPostIts}
              onChange={(e) => setMaxPostIts(parseInt(e.target.value) || 5)}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowVoting}
            onChange={(e) => setAllowVoting(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Autoriser le vote</span>
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
            'Generer le Post-it'
          )}
        </Button>
      </div>
    </div>
  );
}
