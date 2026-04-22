'use client';

import { Input, Label } from '@/components/ui';
import type { WidgetEditorProps } from '../types';

interface ClassOverviewData {
  title?: string;
  description?: string;
  subject?: string;
  grade?: string;
}

export function ClassOverviewEditor({ data, onSave }: WidgetEditorProps) {
  const cls = data as unknown as ClassOverviewData;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input
          value={cls.title ?? ''}
          onChange={(e) => onSave({ ...data, title: e.target.value })}
          placeholder="Titre"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={cls.description ?? ''}
          onChange={(e) => onSave({ ...data, description: e.target.value })}
          placeholder="Description"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Matiere</Label>
          <Input
            value={cls.subject ?? ''}
            onChange={(e) => onSave({ ...data, subject: e.target.value })}
            placeholder="Ex: Mathematiques"
          />
        </div>
        <div className="space-y-2">
          <Label>Niveau</Label>
          <Input
            value={cls.grade ?? ''}
            onChange={(e) => onSave({ ...data, grade: e.target.value })}
            placeholder="Ex: Terminale"
          />
        </div>
      </div>
    </div>
  );
}
