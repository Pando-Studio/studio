'use client';

import { Input, Label, Button } from '@/components/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

interface QcmOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

interface QcmQuestion {
  id: string;
  question: string;
  options: QcmOption[];
  allowMultiple: boolean;
  explanation?: string;
  points: number;
}

interface QcmData {
  questions: QcmQuestion[];
  showCorrectAnswer: boolean;
  showImmediateFeedback: boolean;
}

export function QcmEditor({ data, onSave }: WidgetEditorProps) {
  const qcm = data as unknown as QcmData;
  const questions = qcm.questions || [];

  const updateQuestion = (qIndex: number, updates: Partial<QcmQuestion>) => {
    const newQuestions = [...questions];
    newQuestions[qIndex] = { ...newQuestions[qIndex], ...updates };
    onSave({ ...data, questions: newQuestions });
  };

  const addQuestion = () => {
    onSave({
      ...data,
      questions: [...questions, {
        id: crypto.randomUUID(),
        question: '',
        options: [
          { id: crypto.randomUUID(), label: '', isCorrect: false },
          { id: crypto.randomUUID(), label: '', isCorrect: false },
        ],
        allowMultiple: false,
        points: 1,
      }],
    });
  };

  const removeQuestion = (qIndex: number) => {
    if (questions.length <= 1) return;
    onSave({ ...data, questions: questions.filter((_, i) => i !== qIndex) });
  };

  const updateOption = (qIndex: number, oIndex: number, updates: Partial<QcmOption>) => {
    const newQuestions = [...questions];
    const newOptions = [...newQuestions[qIndex].options];
    newOptions[oIndex] = { ...newOptions[oIndex], ...updates };
    newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOptions };
    onSave({ ...data, questions: newQuestions });
  };

  const addOption = (qIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex] = {
      ...newQuestions[qIndex],
      options: [...newQuestions[qIndex].options, { id: crypto.randomUUID(), label: '', isCorrect: false }],
    };
    onSave({ ...data, questions: newQuestions });
  };

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <div key={q.id} className="border rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary">Q{qi + 1}</span>
            <Input
              value={q.question}
              onChange={(e) => updateQuestion(qi, { question: e.target.value })}
              placeholder="Question..."
              className="flex-1 h-8 text-sm"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuestion(qi)} disabled={questions.length <= 1}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1.5 ml-6">
            {q.options.map((opt, oi) => (
              <div key={opt.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={opt.isCorrect}
                  onChange={(e) => updateOption(qi, oi, { isCorrect: e.target.checked })}
                  className="h-4 w-4 accent-green-600"
                  title="Bonne reponse"
                />
                <Input
                  value={opt.label}
                  onChange={(e) => updateOption(qi, oi, { label: e.target.value })}
                  placeholder={`Option ${oi + 1}`}
                  className="flex-1 h-7 text-xs"
                />
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => addOption(qi)}>
              <Plus className="h-3 w-3 mr-1" /> Option
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addQuestion} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Ajouter une question
      </Button>
    </div>
  );
}
