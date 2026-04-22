'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { WidgetEditorProps } from '../types';

interface RolePlayRole {
  id: string;
  name: string;
  description: string;
  personality?: string;
  constraints?: string[];
  objectives?: string[];
}

interface RoleplayData {
  scenario: string;
  context?: string;
  roles: RolePlayRole[];
  objectives?: string[];
  assignmentMethod: 'random' | 'presenter' | 'participant';
  allowRoleSwitch?: boolean;
  debriefingEnabled?: boolean;
  showLiveResults?: boolean;
}

export function RoleplayEditor({ data, onSave }: WidgetEditorProps) {
  const [rpData, setRpData] = useState<RoleplayData>(() => ({
    scenario: '',
    context: '',
    roles: [],
    objectives: [],
    assignmentMethod: 'random' as const,
    debriefingEnabled: true,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as RoleplayData));
  const [errors, setErrors] = useState<string[]>([]);

  const updateRole = (index: number, updates: Partial<RolePlayRole>) => {
    setRpData((prev) => ({
      ...prev,
      roles: prev.roles.map((r, i) => (i === index ? { ...r, ...updates } : r)),
    }));
  };

  const addRole = () => {
    setRpData((prev) => ({
      ...prev,
      roles: [
        ...prev.roles,
        {
          id: crypto.randomUUID(),
          name: '',
          description: '',
          personality: '',
          objectives: [],
          constraints: [],
        },
      ],
    }));
  };

  const removeRole = (index: number) => {
    setRpData((prev) => ({
      ...prev,
      roles: prev.roles.filter((_, i) => i !== index),
    }));
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!rpData.scenario.trim()) errs.push('Le scenario est obligatoire');
    if (rpData.roles.length < 2) errs.push('Au moins 2 roles requis');
    rpData.roles.forEach((r, i) => {
      if (!r.name.trim()) errs.push(`Role ${i + 1}: nom manquant`);
      if (!r.description.trim()) errs.push(`Role ${i + 1}: description manquante`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(rpData as unknown as Record<string, unknown>);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scenario */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="scenario">Scenario</Label>
          <Input
            id="scenario"
            placeholder="Resume du scenario..."
            value={rpData.scenario}
            onChange={(e) => setRpData((prev) => ({ ...prev, scenario: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="context">Contexte</Label>
          <textarea
            id="context"
            className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Contexte detaille du scenario..."
            value={rpData.context || ''}
            onChange={(e) => setRpData((prev) => ({ ...prev, context: e.target.value }))}
          />
        </div>
      </div>

      {/* Roles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Roles ({rpData.roles.length})</Label>
          <Button variant="outline" size="sm" onClick={addRole}>
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        </div>

        {rpData.roles.map((role, index) => (
          <div key={role.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Role {index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeRole(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom</Label>
                <Input
                  value={role.name}
                  onChange={(e) => updateRole(index, { name: e.target.value })}
                  placeholder="Nom du role..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Personnalite</Label>
                <Input
                  value={role.personality || ''}
                  onChange={(e) => updateRole(index, { personality: e.target.value })}
                  placeholder="Traits de personnalite..."
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                value={role.description}
                onChange={(e) => updateRole(index, { description: e.target.value })}
                placeholder="Description du role..."
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Objectifs (un par ligne)</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                value={(role.objectives || []).join('\n')}
                onChange={(e) =>
                  updateRole(index, {
                    objectives: e.target.value.split('\n').filter(Boolean),
                  })
                }
                placeholder="Un objectif par ligne..."
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Contraintes (une par ligne)</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                value={(role.constraints || []).join('\n')}
                onChange={(e) =>
                  updateRole(index, {
                    constraints: e.target.value.split('\n').filter(Boolean),
                  })
                }
                placeholder="Une contrainte par ligne..."
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="space-y-3 border-t pt-4">
        <div className="space-y-2">
          <Label>Methode d&apos;assignation</Label>
          <div className="flex gap-2">
            {(['random', 'presenter', 'participant'] as const).map((method) => (
              <Button
                key={method}
                type="button"
                variant={rpData.assignmentMethod === method ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRpData((prev) => ({ ...prev, assignmentMethod: method }))}
              >
                {method === 'random' ? 'Aleatoire' : method === 'presenter' ? 'Presentateur' : 'Participant'}
              </Button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!rpData.debriefingEnabled}
            onChange={(e) =>
              setRpData((prev) => ({ ...prev, debriefingEnabled: e.target.checked }))
            }
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Debriefing active</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!rpData.showLiveResults}
            onChange={(e) =>
              setRpData((prev) => ({ ...prev, showLiveResults: e.target.checked }))
            }
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Resultats en direct</span>
        </label>
      </div>

      {/* Global objectives */}
      <div className="space-y-2">
        <Label>Objectifs pedagogiques globaux (un par ligne)</Label>
        <textarea
          className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          value={(rpData.objectives || []).join('\n')}
          onChange={(e) =>
            setRpData((prev) => ({
              ...prev,
              objectives: e.target.value.split('\n').filter(Boolean),
            }))
          }
          placeholder="Un objectif par ligne..."
        />
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
