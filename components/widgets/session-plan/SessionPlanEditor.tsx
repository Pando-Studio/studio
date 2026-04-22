'use client';

import { Input, Label } from '@/components/ui';
import type { WidgetEditorProps } from '../types';

interface SessionPlanData {
  title?: string;
  description?: string;
  duration?: string;
}

export function SessionPlanEditor({ data, onSave }: WidgetEditorProps) {
  const session = data as unknown as SessionPlanData;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Titre de la seance</Label>
        <Input
          value={session.title ?? ''}
          onChange={(e) => onSave({ ...data, title: e.target.value })}
          placeholder="Titre de la seance"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={session.description ?? ''}
          onChange={(e) => onSave({ ...data, description: e.target.value })}
          placeholder="Description"
        />
      </div>
      <div className="space-y-2">
        <Label>Duree</Label>
        <Input
          value={session.duration ?? ''}
          onChange={(e) => onSave({ ...data, duration: e.target.value })}
          placeholder="Ex: 1h30"
        />
      </div>
    </div>
  );
}
