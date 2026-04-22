'use client';

import { Users, Target, ShieldAlert, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetDisplayProps } from '../types';

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

const assignmentLabels: Record<string, string> = {
  random: 'Aleatoire',
  presenter: 'Par le presentateur',
  participant: 'Choix du participant',
};

const roleColors = [
  'border-blue-200 bg-blue-50',
  'border-green-200 bg-green-50',
  'border-purple-200 bg-purple-50',
  'border-orange-200 bg-orange-50',
  'border-pink-200 bg-pink-50',
  'border-cyan-200 bg-cyan-50',
];

export function RoleplayDisplay({ data }: WidgetDisplayProps) {
  const rpData = data as unknown as RoleplayData;

  return (
    <div className="space-y-6">
      {/* Scenario */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{rpData.scenario}</h3>
        {rpData.context && (
          <p className="text-sm text-muted-foreground">{rpData.context}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
          <Users className="h-3.5 w-3.5" />
          {rpData.roles.length} roles
        </span>
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
          <Shuffle className="h-3.5 w-3.5" />
          {assignmentLabels[rpData.assignmentMethod] || rpData.assignmentMethod}
        </span>
        {rpData.debriefingEnabled && (
          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
            Debriefing
          </span>
        )}
      </div>

      {/* Roles */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Roles
        </h4>
        <div className="grid gap-3">
          {rpData.roles.map((role, index) => (
            <div
              key={role.id || index}
              className={cn('p-4 rounded-lg border', roleColors[index % roleColors.length])}
            >
              <h5 className="font-medium">{role.name}</h5>
              <p className="text-sm text-muted-foreground mt-1">
                {role.description}
              </p>
              {role.personality && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Personnalite: {role.personality}
                </p>
              )}

              {role.objectives && role.objectives.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Objectifs
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                    {role.objectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {role.constraints && role.constraints.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    Contraintes
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                    {role.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Global objectives */}
      {rpData.objectives && rpData.objectives.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Objectifs pedagogiques
          </h4>
          <ul className="text-sm space-y-1 list-disc list-inside">
            {rpData.objectives.map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
