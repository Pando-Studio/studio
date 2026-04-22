'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2 } from 'lucide-react';

interface OpentextGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

export function OpentextGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: OpentextGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prompt, setPrompt] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [minLength, setMinLength] = useState(10);
  const [maxLength, setMaxLength] = useState(500);
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/opentext-reflection',
          title: title || 'Texte libre sans titre',
          description: description || undefined,
          inputs: {
            prompt: prompt || undefined,
            placeholder: placeholder || undefined,
            minLength,
            maxLength,
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
      console.error('Error generating OpenText:', error);
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
          Question ouverte
        </h3>

        <div className="space-y-2">
          <Label htmlFor="prompt">Question de reflexion</Label>
          <textarea
            id="prompt"
            className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Sera genere automatiquement depuis les sources, ou saisissez votre question..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="placeholder">Texte d&apos;aide (placeholder)</Label>
          <Input
            id="placeholder"
            placeholder="Ecrivez votre reponse ici..."
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Instructions personnalisees</Label>
          <textarea
            id="instructions"
            className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Precisez vos attentes pour la reflexion..."
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
            <Label htmlFor="minLength">Longueur min (caracteres)</Label>
            <Input
              id="minLength"
              type="number"
              min={0}
              max={500}
              value={minLength}
              onChange={(e) => setMinLength(parseInt(e.target.value) || 10)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxLength">Longueur max (caracteres)</Label>
            <Input
              id="maxLength"
              type="number"
              min={50}
              max={5000}
              value={maxLength}
              onChange={(e) => setMaxLength(parseInt(e.target.value) || 500)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeLimit">Temps limite (secondes, optionnel)</Label>
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
            'Generer le Texte libre'
          )}
        </Button>
      </div>
    </div>
  );
}
