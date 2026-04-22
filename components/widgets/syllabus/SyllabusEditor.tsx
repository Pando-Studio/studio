'use client';

import { Input, Label } from '@/components/ui';
import type { WidgetEditorProps } from '../types';

interface SyllabusData {
  title?: string;
  description?: string;
  duration?: string;
  level?: string;
}

export function SyllabusEditor({ data, onSave }: WidgetEditorProps) {
  const syllabus = data as unknown as SyllabusData;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input
          value={syllabus.title ?? ''}
          onChange={(e) => onSave({ ...data, title: e.target.value })}
          placeholder="Titre du syllabus"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={syllabus.description ?? ''}
          onChange={(e) => onSave({ ...data, description: e.target.value })}
          placeholder="Description"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duree</Label>
          <Input
            value={syllabus.duration ?? ''}
            onChange={(e) => onSave({ ...data, duration: e.target.value })}
            placeholder="Ex: 12 semaines"
          />
        </div>
        <div className="space-y-2">
          <Label>Niveau</Label>
          <Input
            value={syllabus.level ?? ''}
            onChange={(e) => onSave({ ...data, level: e.target.value })}
            placeholder="Ex: Master 1"
          />
        </div>
      </div>
    </div>
  );
}
