'use client';

import { Input, Label } from '@/components/ui';
import type { WidgetEditorProps } from '../types';

interface ProgramOverviewData {
  title?: string;
  description?: string;
  credits?: number;
  duration?: string;
  level?: string;
}

export function ProgramOverviewEditor({ data, onSave }: WidgetEditorProps) {
  const program = data as unknown as ProgramOverviewData;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Titre du programme</Label>
        <Input
          value={program.title ?? ''}
          onChange={(e) => onSave({ ...data, title: e.target.value })}
          placeholder="Titre du programme"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={program.description ?? ''}
          onChange={(e) => onSave({ ...data, description: e.target.value })}
          placeholder="Description"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Credits ECTS</Label>
          <Input
            type="number"
            value={program.credits ?? ''}
            onChange={(e) => onSave({ ...data, credits: Number(e.target.value) || undefined })}
            placeholder="60"
          />
        </div>
        <div className="space-y-2">
          <Label>Duree</Label>
          <Input
            value={program.duration ?? ''}
            onChange={(e) => onSave({ ...data, duration: e.target.value })}
            placeholder="1 an"
          />
        </div>
        <div className="space-y-2">
          <Label>Niveau</Label>
          <Input
            value={program.level ?? ''}
            onChange={(e) => onSave({ ...data, level: e.target.value })}
            placeholder="Master 1"
          />
        </div>
      </div>
    </div>
  );
}
