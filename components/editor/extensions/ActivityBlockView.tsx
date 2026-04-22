'use client';

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { HelpCircle, Cloud, Users, Hammer, FileText, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ActivityType, ActivityBlockConfig } from './ActivityBlock';

const activityConfig: Record<
  ActivityType,
  {
    icon: typeof HelpCircle;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  quiz: {
    icon: HelpCircle,
    label: 'Quiz',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  wordcloud: {
    icon: Cloud,
    label: 'Nuage de mots',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  roleplay: {
    icon: Users,
    label: 'Jeu de role',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  workshop: {
    icon: Hammer,
    label: 'Atelier',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  exercise: {
    icon: FileText,
    label: 'Exercice',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
};

export function ActivityBlockView({ node, deleteNode, selected }: NodeViewProps) {
  const activityType = (node.attrs.activityType as ActivityType) || 'quiz';
  const title = node.attrs.title as string;
  const description = node.attrs.description as string;
  const config = node.attrs.config as ActivityBlockConfig;

  const activityInfo = activityConfig[activityType] || activityConfig.quiz;
  const Icon = activityInfo.icon;

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={`
          relative rounded-lg border-2 p-4 transition-all
          ${activityInfo.bgColor} ${activityInfo.borderColor}
          ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${activityInfo.bgColor} border ${activityInfo.borderColor}`}
            >
              <Icon className={`h-5 w-5 ${activityInfo.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={`font-semibold ${activityInfo.color}`}>
                  {title || 'Activite sans titre'}
                </h4>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${activityInfo.bgColor} ${activityInfo.color} border ${activityInfo.borderColor}`}
                >
                  {activityInfo.label}
                </span>
              </div>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                // TODO: Open config modal
                console.log('Edit config', config);
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => deleteNode()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Config preview */}
        {config && Object.keys(config).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed pt-3 text-xs text-muted-foreground">
            {config.questionCount && (
              <span className="rounded bg-white/50 px-2 py-1">
                {config.questionCount} questions
              </span>
            )}
            {config.difficulty && (
              <span className="rounded bg-white/50 px-2 py-1">
                Difficulte: {config.difficulty}
              </span>
            )}
            {config.duration && (
              <span className="rounded bg-white/50 px-2 py-1">{config.duration}</span>
            )}
            {config.groupSize && (
              <span className="rounded bg-white/50 px-2 py-1">
                Groupes de {config.groupSize}
              </span>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
