'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

interface FlashcardItem {
  id: string;
  front: string;
  back: string;
}

interface FlashcardData {
  title: string;
  cardCount: 'moins' | 'standard' | 'plus';
  difficulty: 'facile' | 'moyen' | 'difficile';
  cards: FlashcardItem[];
  shuffleOnStart: boolean;
  showProgress: boolean;
  enableSelfScoring: boolean;
}

export function FlashcardEditor({ data, onSave }: WidgetEditorProps) {
  const [flashcardData, setFlashcardData] = useState<FlashcardData>(() => ({
    title: '',
    cardCount: 'standard',
    difficulty: 'moyen',
    cards: [{ id: crypto.randomUUID(), front: '', back: '' }],
    shuffleOnStart: true,
    showProgress: true,
    enableSelfScoring: true,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as FlashcardData));
  const [error, setError] = useState<string | null>(null);

  const addCard = () => {
    setFlashcardData((prev) => ({
      ...prev,
      cards: [...prev.cards, { id: crypto.randomUUID(), front: '', back: '' }],
    }));
  };

  const removeCard = (id: string) => {
    if (flashcardData.cards.length <= 1) return;
    setFlashcardData((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.id !== id),
    }));
  };

  const updateCard = (id: string, field: 'front' | 'back', value: string) => {
    setFlashcardData((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  const handleSave = () => {
    const hasEmpty = flashcardData.cards.some((c) => !c.front.trim() || !c.back.trim());
    if (hasEmpty) {
      setError('Toutes les cartes doivent avoir un recto et un verso.');
      return;
    }
    setError(null);
    onSave(flashcardData as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="flashcard-title">Titre</Label>
        <Input
          id="flashcard-title"
          placeholder="Titre du jeu de cartes..."
          value={flashcardData.title}
          onChange={(e) => setFlashcardData((prev) => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fc-difficulty">Difficulte</Label>
          <select
            id="fc-difficulty"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={flashcardData.difficulty}
            onChange={(e) =>
              setFlashcardData((prev) => ({
                ...prev,
                difficulty: e.target.value as FlashcardData['difficulty'],
              }))
            }
          >
            <option value="facile">Facile</option>
            <option value="moyen">Moyen</option>
            <option value="difficile">Difficile</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fc-count">Quantite</Label>
          <select
            id="fc-count"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={flashcardData.cardCount}
            onChange={(e) =>
              setFlashcardData((prev) => ({
                ...prev,
                cardCount: e.target.value as FlashcardData['cardCount'],
              }))
            }
          >
            <option value="moins">Moins (~5)</option>
            <option value="standard">Standard (~15)</option>
            <option value="plus">Plus (~30)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={flashcardData.shuffleOnStart}
            onChange={(e) =>
              setFlashcardData((prev) => ({ ...prev, shuffleOnStart: e.target.checked }))
            }
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Melanger les cartes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={flashcardData.enableSelfScoring}
            onChange={(e) =>
              setFlashcardData((prev) => ({ ...prev, enableSelfScoring: e.target.checked }))
            }
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Auto-evaluation (su / pas su)</span>
        </label>
      </div>

      <div className="space-y-4">
        <Label>Cartes</Label>
        {flashcardData.cards.map((card, index) => (
          <div key={card.id} className="space-y-2 p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Carte {index + 1}
              </span>
              {flashcardData.cards.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCard(card.id)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <Input
              placeholder="Recto (question / terme)..."
              value={card.front}
              onChange={(e) => updateCard(card.id, 'front', e.target.value)}
            />
            <textarea
              className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Verso (reponse / definition)..."
              value={card.back}
              onChange={(e) => updateCard(card.id, 'back', e.target.value)}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addCard} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une carte
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave}>Sauvegarder</Button>
      </div>
    </div>
  );
}
