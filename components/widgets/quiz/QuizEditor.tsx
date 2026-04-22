'use client';

import { useState, useContext, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Plus, Trash2, GripVertical, AlertCircle, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetEditorProps } from '../types';
import type { QuizConfig, QuizQuestion } from '@/lib/schemas/widget-configs';
import { useWidgetConfig } from '../widget-edit-context';

// ---------------------------------------------------------------------------
// Hook that tries to use the WidgetEditContext, falls back to local state
// ---------------------------------------------------------------------------

function useQuizState(data: Record<string, unknown>) {
  // Try context first (may be null if not wrapped in WidgetEditProvider)
  let contextValue: ReturnType<typeof useWidgetConfig> | null = null;
  try {
    contextValue = useWidgetConfig();
  } catch {
    // Not inside a WidgetEditProvider -- fall back to local state
  }

  const initialData = useMemo(
    (): QuizConfig => ({
      questions: [],
      showImmediateFeedback: true,
      showCorrectAnswer: true,
      showStatistics: false,
      showLeaderboard: true,
      ...Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined),
      ),
    }),
    // Only compute once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [localConfig, setLocalConfig] = useState<QuizConfig>(initialData);

  if (contextValue) {
    // Context mode: read from context, write through context
    const config = contextValue.config as QuizConfig;
    const updateConfig = contextValue.updateConfig;

    return {
      quizData: config,
      setQuizData: (updater: QuizConfig | ((prev: QuizConfig) => QuizConfig)) => {
        const next = typeof updater === 'function' ? updater(config) : updater;
        updateConfig(next as unknown as Record<string, unknown>);
      },
      isSaving: contextValue.isSaving,
      flushSave: contextValue.flushSave,
      hasContext: true as const,
    };
  }

  // Local-only mode (backward compat)
  return {
    quizData: localConfig,
    setQuizData: setLocalConfig,
    isSaving: false,
    flushSave: undefined,
    hasContext: false as const,
  };
}

// ---------------------------------------------------------------------------
// QuizEditor
// ---------------------------------------------------------------------------

export function QuizEditor({ data, onSave }: WidgetEditorProps) {
  const { quizData, setQuizData, isSaving, flushSave, hasContext } =
    useQuizState(data);
  const [errors, setErrors] = useState<string[]>([]);

  const updateQuestion = useCallback(
    (index: number, updates: Partial<QuizQuestion>) => {
      setQuizData((prev) => ({
        ...prev,
        questions: prev.questions.map((q, i) =>
          i === index ? { ...q, ...updates } : q,
        ),
      }));
    },
    [setQuizData],
  );

  const addQuestion = useCallback(() => {
    setQuizData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: crypto.randomUUID(),
          question: '',
          type: 'single' as const,
          options: [
            { id: crypto.randomUUID(), label: '', isCorrect: false },
            { id: crypto.randomUUID(), label: '', isCorrect: false },
          ],
          explanation: '',
          points: 1,
          difficulty: 'medium' as const,
        },
      ],
    }));
  }, [setQuizData]);

  const removeQuestion = useCallback(
    (index: number) => {
      setQuizData((prev) => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index),
      }));
    },
    [setQuizData],
  );

  const updateOption = useCallback(
    (qIndex: number, optIndex: number, label: string) => {
      setQuizData((prev) => ({
        ...prev,
        questions: prev.questions.map((q, i) => {
          if (i !== qIndex) return q;
          const options = [...q.options];
          options[optIndex] = { ...options[optIndex], label };
          return { ...q, options };
        }),
      }));
    },
    [setQuizData],
  );

  const setCorrectAnswer = useCallback(
    (qIndex: number, optIndex: number) => {
      setQuizData((prev) => ({
        ...prev,
        questions: prev.questions.map((q, i) => {
          if (i !== qIndex) return q;
          return {
            ...q,
            options: q.options.map((o, j) => ({
              ...o,
              isCorrect: j === optIndex,
            })),
          };
        }),
      }));
    },
    [setQuizData],
  );

  const addOption = useCallback(
    (qIndex: number) => {
      setQuizData((prev) => ({
        ...prev,
        questions: prev.questions.map((q, i) =>
          i === qIndex
            ? {
                ...q,
                options: [
                  ...q.options,
                  { id: crypto.randomUUID(), label: '', isCorrect: false },
                ],
              }
            : q,
        ),
      }));
    },
    [setQuizData],
  );

  const removeOption = useCallback(
    (qIndex: number, optIndex: number) => {
      setQuizData((prev) => ({
        ...prev,
        questions: prev.questions.map((q, i) => {
          if (i !== qIndex) return q;
          const options = q.options.filter((_, j) => j !== optIndex);
          return { ...q, options };
        }),
      }));
    },
    [setQuizData],
  );

  const updateSetting = useCallback(
    (key: string, value: boolean) => {
      setQuizData((prev) => ({ ...prev, [key]: value }));
    },
    [setQuizData],
  );

  const validate = (): boolean => {
    const errs: string[] = [];
    quizData.questions.forEach((q, i) => {
      if (!q.question.trim()) errs.push(`Question ${i + 1}: texte manquant`);
      if (q.options.length < 2)
        errs.push(`Question ${i + 1}: au moins 2 options`);
      if (q.options.some((o) => !o.label.trim()))
        errs.push(`Question ${i + 1}: option vide`);
      if (!q.options.some((o) => o.isCorrect))
        errs.push(`Question ${i + 1}: bonne reponse manquante`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleManualSave = () => {
    if (!validate()) return;
    if (hasContext && flushSave) {
      // Flush pending auto-save immediately
      flushSave();
    } else {
      // Legacy path: explicit onSave callback
      onSave(quizData as unknown as Record<string, unknown>);
    }
  };

  return (
    <div className="space-y-6">
      {/* Questions */}
      <div className="space-y-4">
        {quizData.questions.map((question, qIndex) => (
          <div key={question.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Q{qIndex + 1}
              </span>
              <div className="flex-1" />
              <select
                className="text-xs border rounded px-2 py-1"
                value={question.difficulty || 'medium'}
                onChange={(e) =>
                  updateQuestion(qIndex, {
                    difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                  })
                }
              >
                <option value="easy">Facile</option>
                <option value="medium">Moyen</option>
                <option value="hard">Difficile</option>
              </select>
              <Input
                type="number"
                min={0}
                className="w-16 text-xs"
                value={question.points || 1}
                onChange={(e) =>
                  updateQuestion(qIndex, {
                    points: parseInt(e.target.value) || 1,
                  })
                }
                title="Points"
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeQuestion(qIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Question text */}
            <textarea
              className="w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Texte de la question..."
              value={question.question}
              onChange={(e) =>
                updateQuestion(qIndex, { question: e.target.value })
              }
              rows={2}
            />

            {/* Options */}
            <div className="space-y-2">
              <Label className="text-xs">Options</Label>
              {question.options.map((option, optIndex) => (
                <div key={option.id} className="flex items-center gap-2">
                  <button
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                      option.isCorrect
                        ? 'border-green-500 bg-green-500'
                        : 'border-muted-foreground/30 hover:border-green-400',
                    )}
                    onClick={() => setCorrectAnswer(qIndex, optIndex)}
                    title="Marquer comme bonne reponse"
                  >
                    {option.isCorrect && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </button>
                  <Input
                    className="flex-1 text-sm"
                    placeholder={`Option ${optIndex + 1}`}
                    value={option.label}
                    onChange={(e) =>
                      updateOption(qIndex, optIndex, e.target.value)
                    }
                  />
                  {question.options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(qIndex, optIndex)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {question.options.length < 6 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(qIndex)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter une option
                </Button>
              )}
            </div>

            {/* Explanation */}
            <div className="space-y-1">
              <Label className="text-xs">Explication</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Explication de la bonne reponse..."
                value={question.explanation || ''}
                onChange={(e) =>
                  updateQuestion(qIndex, { explanation: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={addQuestion} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une question
        </Button>
      </div>

      {/* Settings */}
      <div className="space-y-3 border-t pt-4">
        <h4 className="text-sm font-medium">Parametres</h4>
        <div className="space-y-2">
          {[
            { key: 'showImmediateFeedback', label: 'Feedback immediat' },
            { key: 'showCorrectAnswer', label: 'Afficher la bonne reponse' },
            { key: 'showStatistics', label: 'Afficher les statistiques' },
            { key: 'showLeaderboard', label: 'Afficher le classement' },
          ].map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={
                  !!(quizData as unknown as Record<string, unknown>)[key]
                }
                onChange={(e) => updateSetting(key, e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
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
      <div className="flex items-center justify-end gap-3 pt-2">
        {hasContext && isSaving && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Sauvegarde...
          </span>
        )}
        <Button onClick={handleManualSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}
