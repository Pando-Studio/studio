'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Loader2 } from 'lucide-react';

interface QuizGenerationFormProps {
  studioId: string;
  selectedSourceIds: Set<string>;
  onClose: () => void;
  onGenerated: () => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';

export function QuizGenerationForm({
  studioId,
  selectedSourceIds,
  onClose,
  onGenerated,
}: QuizGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [answersPerQuestion, setAnswersPerQuestion] = useState(4);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [timerPerQuestion, setTimerPerQuestion] = useState<number | undefined>(undefined);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/studios/${studioId}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: 'qiplim/quiz-interactive',
          title: title || 'Quiz sans titre',
          description: description || undefined,
          inputs: {
            questionCount,
            optionsPerQuestion: answersPerQuestion,
            difficulty,
            instructions: instructions || undefined,
            timerPerQuestion,
            showLeaderboard,
            shuffleQuestions,
            shuffleAnswers,
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
      console.error('Error generating quiz:', error);
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
            className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Sera generee automatiquement"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Instructions personnalisees</Label>
          <textarea
            id="instructions"
            className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Precisez vos attentes pour le quiz..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
      </div>

      {/* Section 2 - Parametres du quiz */}
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
            <Label htmlFor="answersPerQuestion">Reponses par question</Label>
            <Input
              id="answersPerQuestion"
              type="number"
              min={2}
              max={6}
              value={answersPerQuestion}
              onChange={(e) => setAnswersPerQuestion(parseInt(e.target.value) || 4)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Difficulte</Label>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
              <Button
                key={level}
                type="button"
                variant={difficulty === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDifficulty(level)}
              >
                {level === 'easy' ? 'Facile' : level === 'medium' ? 'Moyen' : 'Difficile'}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timer">Timer par question (secondes, optionnel)</Label>
          <Input
            id="timer"
            type="number"
            min={10}
            max={120}
            placeholder="Pas de timer"
            value={timerPerQuestion || ''}
            onChange={(e) => setTimerPerQuestion(e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
      </div>

      {/* Section 3 - Options */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Options
        </h3>

        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLeaderboard}
              onChange={(e) => setShowLeaderboard(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">Afficher le classement</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">Melanger les questions</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleAnswers}
              onChange={(e) => setShuffleAnswers(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">Melanger les reponses</span>
          </label>
        </div>
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
            'Generer le Quiz'
          )}
        </Button>
      </div>
    </div>
  );
}
