import {
  Rocket,
  Presentation,
  MessageCircle,
  Layers,
  Github,
  Terminal,
  Workflow,
  Code2,
  Shield,
  Globe,
  Store,
  type LucideIcon,
} from 'lucide-react';

export type RoadmapStatus = 'done' | 'in-progress' | 'planned';

export interface RoadmapPhase {
  id: string;
  status: RoadmapStatus;
  icon: LucideIcon;
}

export const roadmapPhases: RoadmapPhase[] = [
  { id: 'mvp', status: 'done', icon: Rocket },
  { id: 'chatAi', status: 'done', icon: MessageCircle },
  { id: 'openSource', status: 'done', icon: Github },
  { id: 'presentations', status: 'in-progress', icon: Presentation },
  { id: 'templates', status: 'in-progress', icon: Layers },
  { id: 'interop', status: 'in-progress', icon: Globe },
  { id: 'cliApiMcp', status: 'planned', icon: Terminal },
  { id: 'workflows', status: 'planned', icon: Workflow },
  { id: 'notebook', status: 'planned', icon: Code2 },
  { id: 'roles', status: 'planned', icon: Shield },
  { id: 'marketplace', status: 'planned', icon: Store },
];

export const statusConfig: Record<
  RoadmapStatus,
  { bg: string; text: string; dot: string; dotPulse?: string }
> = {
  done: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  'in-progress': {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    dotPulse: 'animate-pulse',
  },
  planned: {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    dot: 'bg-gray-300',
  },
};
