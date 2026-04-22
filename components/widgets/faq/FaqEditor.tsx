'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { Plus, Trash2, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqData {
  title: string;
  items: FaqItem[];
}

export function FaqEditor({ data, onSave }: WidgetEditorProps) {
  const [faqData, setFaqData] = useState<FaqData>(() => ({
    title: '',
    items: [{ id: crypto.randomUUID(), question: '', answer: '' }],
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as FaqData));
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    setFaqData((prev) => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), question: '', answer: '' }],
    }));
  };

  const removeItem = (id: string) => {
    if (faqData.items.length <= 1) return;
    setFaqData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const updateItem = (id: string, field: keyof FaqItem, value: string) => {
    setFaqData((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    setFaqData((prev) => {
      const items = [...prev.items];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return { ...prev, items };
    });
  };

  const handleSave = () => {
    const hasEmpty = faqData.items.some((item) => !item.question.trim() || !item.answer.trim());
    if (hasEmpty) {
      setError('Toutes les questions et reponses doivent etre remplies.');
      return;
    }
    setError(null);
    onSave(faqData as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="faq-title">Titre</Label>
        <Input
          id="faq-title"
          placeholder="Titre de la FAQ..."
          value={faqData.title}
          onChange={(e) => setFaqData((prev) => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="space-y-4">
        <Label>Questions / Reponses</Label>
        {faqData.items.map((item, index) => (
          <div key={item.id} className="space-y-2 p-4 border rounded-lg relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Question {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Monter"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === faqData.items.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Descendre"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                {faqData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-destructive hover:text-destructive/80 ml-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <Input
              placeholder="Question..."
              value={item.question}
              onChange={(e) => updateItem(item.id, 'question', e.target.value)}
            />
            <textarea
              className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Reponse..."
              value={item.answer}
              onChange={(e) => updateItem(item.id, 'answer', e.target.value)}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une question
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
