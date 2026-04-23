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
  quarter: string;
  icon: LucideIcon;
}

export const roadmapPhases: RoadmapPhase[] = [
  { id: 'mvp', status: 'done', quarter: 'Q1 2026', icon: Rocket },
  { id: 'chatAi', status: 'done', quarter: 'Q2 2026', icon: MessageCircle },
  { id: 'openSource', status: 'done', quarter: 'Q3 2026', icon: Github },
  {
    id: 'presentations',
    status: 'in-progress',
    quarter: 'Q1-Q2 2026',
    icon: Presentation,
  },
  {
    id: 'templates',
    status: 'in-progress',
    quarter: 'Q2-Q3 2026',
    icon: Layers,
  },
  {
    id: 'interop',
    status: 'in-progress',
    quarter: 'Q3-Q4 2026',
    icon: Globe,
  },
  {
    id: 'cliApiMcp',
    status: 'planned',
    quarter: 'Q2-Q3 2026',
    icon: Terminal,
  },
  { id: 'workflows', status: 'planned', quarter: 'Q3 2026', icon: Workflow },
  { id: 'notebook', status: 'planned', quarter: 'Q3 2026', icon: Code2 },
  { id: 'roles', status: 'planned', quarter: 'Q3-Q4 2026', icon: Shield },
  { id: 'marketplace', status: 'planned', quarter: 'Q4 2026', icon: Store },
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
