'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
}

interface TimelineData {
  title: string;
  events: TimelineEvent[];
}

export function TimelineEditor({ data, onSave }: WidgetEditorProps) {
  const [timelineData, setTimelineData] = useState<TimelineData>(() => ({
    title: '',
    events: [{ id: crypto.randomUUID(), date: '', title: '', description: '' }],
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as TimelineData));
  const [error, setError] = useState<string | null>(null);

  const addEvent = () => {
    setTimelineData((prev) => ({
      ...prev,
      events: [
        ...prev.events,
        { id: crypto.randomUUID(), date: '', title: '', description: '' },
      ],
    }));
  };

  const removeEvent = (id: string) => {
    if (timelineData.events.length <= 1) return;
    setTimelineData((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== id),
    }));
  };

  const updateEvent = (id: string, field: keyof TimelineEvent, value: string) => {
    setTimelineData((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));
  };

  const handleSave = () => {
    const hasEmpty = timelineData.events.some((e) => !e.date.trim() || !e.title.trim());
    if (hasEmpty) {
      setError('Chaque evenement doit avoir une date et un titre.');
      return;
    }
    setError(null);
    onSave(timelineData as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="timeline-title">Titre</Label>
        <Input
          id="timeline-title"
          placeholder="Titre de la frise..."
          value={timelineData.title}
          onChange={(e) => setTimelineData((prev) => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="space-y-4">
        <Label>Evenements</Label>
        {timelineData.events.map((event, index) => (
          <div key={event.id} className="space-y-2 p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Evenement {index + 1}
              </span>
              {timelineData.events.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEvent(event.id)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Date (ex: 1950, 2024-03-15)..."
                value={event.date}
                onChange={(e) => updateEvent(event.id, 'date', e.target.value)}
              />
              <Input
                placeholder="Titre..."
                value={event.title}
                onChange={(e) => updateEvent(event.id, 'title', e.target.value)}
              />
            </div>
            <textarea
              className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Description (optionnel)..."
              value={event.description ?? ''}
              onChange={(e) => updateEvent(event.id, 'description', e.target.value)}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addEvent} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un evenement
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
