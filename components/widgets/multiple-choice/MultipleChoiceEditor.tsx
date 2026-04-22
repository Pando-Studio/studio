'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetEditorProps } from '../types';

interface MultipleChoiceOption {
  id: string;
  label: string;
  isCorrect?: boolean;
}

interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: MultipleChoiceOption[];
  allowMultiple?: boolean;
}

interface MultipleChoiceData {
  questions: MultipleChoiceQuestion[];
  showCorrectAnswer?: boolean;
  timeLimit?: number;
  showLiveResults?: boolean;
}

export function MultipleChoiceEditor({ data, onSave }: WidgetEditorProps) {
  const [mcData, setMcData] = useState<MultipleChoiceData>(() => ({
    questions: [],
    showCorrectAnswer: true,
    showLiveResults: true,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as MultipleChoiceData));
  const [errors, setErrors] = useState<string[]>([]);

  const updateQuestion = (qIndex: number, updates: Partial<MultipleChoiceQuestion>) => {
    setMcData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === qIndex ? { ...q, ...updates } : q)),
    }));
  };

  const addQuestion = () => {
    setMcData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: crypto.randomUUID(),
          question: '',
          options: [
            { id: crypto.randomUUID(), label: '', isCorrect: true },
            { id: crypto.randomUUID(), label: '' },
          ],
          allowMultiple: false,
        },
      ],
    }));
  };

  const removeQuestion = (qIndex: number) => {
    setMcData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== qIndex),
    }));
  };

  const updateOption = (qIndex: number, oIndex: number, updates: Partial<MultipleChoiceOption>) => {
    setMcData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, qi) =>
        qi === qIndex
          ? { ...q, options: q.options.map((o, oi) => (oi === oIndex ? { ...o, ...updates } : o)) }
          : q
      ),
    }));
  };

  const addOption = (qIndex: number) => {
    setMcData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, qi) =>
        qi === qIndex
          ? { ...q, options: [...q.options, { id: crypto.randomUUID(), label: '' }] }
          : q
      ),
    }));
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setMcData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, qi) =>
        qi === qIndex ? { ...q, options: q.options.filter((_, oi) => oi !== oIndex) } : q
      ),
    }));
  };

  const toggleCorrect = (qIndex: number, oIndex: number) => {
    setMcData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, qi) => {
        if (qi !== qIndex) return q;
        if (q.allowMultiple) {
          return {
            ...q,
            options: q.options.map((o, oi) =>
              oi === oIndex ? { ...o, isCorrect: !o.isCorrect } : o
            ),
          };
        }
        return {
          ...q,
          options: q.options.map((o, oi) => ({
            ...o,
            isCorrect: oi === oIndex,
          })),
        };
      }),
    }));
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (mcData.questions.length === 0) errs.push('Au moins une question requise');
    mcData.questions.forEach((q, i) => {
      if (!q.question.trim()) errs.push(`Question ${i + 1}: texte manquant`);
      if (q.options.length < 2) errs.push(`Question ${i + 1}: au moins 2 options`);
      q.options.forEach((o, j) => {
        if (!o.label.trim()) errs.push(`Question ${i + 1}, option ${j + 1}: texte manquant`);
      });
      if (!q.options.some((o) => o.isCorrect)) errs.push(`Question ${i + 1}: aucune bonne reponse`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(mcData as unknown as Record<string, unknown>);
    }
  };

  return (
    <div className="space-y-6">
      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Questions ({mcData.questions.length})</Label>
          <Button variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        </div>

        {mcData.questions.map((question, qIndex) => (
          <div key={question.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Question {qIndex + 1}
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={!!question.allowMultiple}
                    onChange={(e) => updateQuestion(qIndex, { allowMultiple: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Multiples
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeQuestion(qIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Input
              value={question.question}
              onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
              placeholder="Texte de la question..."
            />

            <div className="space-y-2">
              {question.options.map((option, oIndex) => (
                <div key={option.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    className={cn(
                      'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      option.isCorrect
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300 hover:border-gray-400'
                    )}
                    onClick={() => toggleCorrect(qIndex, oIndex)}
                  >
                    {option.isCorrect && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </button>
                  <Input
                    value={option.label}
                    onChange={(e) => updateOption(qIndex, oIndex, { label: e.target.value })}
                    placeholder={`Option ${oIndex + 1}...`}
                    className="flex-1"
                  />
                  {question.options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-8 w-8 p-0"
                      onClick={() => removeOption(qIndex, oIndex)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {question.options.length < 6 && (
                <Button variant="ghost" size="sm" onClick={() => addOption(qIndex)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Option
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="space-y-3 border-t pt-4">
        <div className="space-y-2">
          <Label htmlFor="timeLimit">Temps limite (secondes, optionnel)</Label>
          <Input
            id="timeLimit"
            type="number"
            min={10}
            max={300}
            placeholder="Pas de limite"
            value={mcData.timeLimit || ''}
            onChange={(e) =>
              setMcData((prev) => ({
                ...prev,
                timeLimit: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!mcData.showCorrectAnswer}
            onChange={(e) =>
              setMcData((prev) => ({ ...prev, showCorrectAnswer: e.target.checked }))
            }
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Afficher la bonne reponse</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!mcData.showLiveResults}
            onChange={(e) =>
              setMcData((prev) => ({ ...prev, showLiveResults: e.target.checked }))
            }
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Resultats en direct</span>
        </label>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1 text-sm text-destructive">
          {errors.map((err, i) => (
            <div key={i} className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave}>Sauvegarder</Button>
      </div>
    </div>
  );
}
