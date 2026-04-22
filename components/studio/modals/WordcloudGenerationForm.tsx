'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2 } from 'lucide-react';

interface WordcloudGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

export function WordcloudGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: WordcloudGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [question, setQuestion] = useState('');
  const [maxWordsPerParticipant, setMaxWordsPerParticipant] = useState(3);
  const [minWordLength, setMinWordLength] = useState(2);
  const [maxWords, setMaxWords] = useState(30);
  const [groupSimilar, setGroupSimilar] = useState(true);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/wordcloud-interactive',
          title: title || 'Nuage de mots sans titre',
          description: description || undefined,
          inputs: {
            maxWords,
            minWordLength,
            maxWordLength: 30,
            instructions: instructions || undefined,
            question: question || undefined,
            maxWordsPerParticipant,
            groupSimilar,
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
      console.error('Error generating wordcloud:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1 - Informations de base */}
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

      {/* Section 2 - Question */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Question
        </h3>

        <div className="space-y-2">
          <Label htmlFor="question">Question posee aux participants</Label>
          <textarea
            id="question"
            className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Sera generee automatiquement depuis les sources, ou saisissez votre question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Instructions personnalisees</Label>
          <textarea
            id="instructions"
            className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Precisez vos attentes pour le nuage de mots..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
      </div>

      {/* Section 3 - Parametres */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Parametres
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxWordsPerParticipant">Mots max par participant</Label>
            <Input
              id="maxWordsPerParticipant"
              type="number"
              min={1}
              max={10}
              value={maxWordsPerParticipant}
              onChange={(e) => setMaxWordsPerParticipant(parseInt(e.target.value) || 3)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxWords">Nombre total de mots affiches</Label>
            <Input
              id="maxWords"
              type="number"
              min={10}
              max={100}
              value={maxWords}
              onChange={(e) => setMaxWords(parseInt(e.target.value) || 30)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minWordLength">Longueur minimale des mots</Label>
          <Input
            id="minWordLength"
            type="number"
            min={1}
            max={5}
            value={minWordLength}
            onChange={(e) => setMinWordLength(parseInt(e.target.value) || 2)}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={groupSimilar}
            onChange={(e) => setGroupSimilar(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Grouper les mots similaires</span>
        </label>
      </div>

      {/* Actions */}
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
            'Generer le Nuage de mots'
          )}
        </Button>
      </div>
    </div>
  );
}
