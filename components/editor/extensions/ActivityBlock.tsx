import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ActivityBlockView } from './ActivityBlockView';

export type ActivityType = 'quiz' | 'wordcloud' | 'roleplay' | 'workshop' | 'exercise';

export interface ActivityBlockConfig {
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: string;
  groupSize?: number;
  [key: string]: unknown;
}

export interface ActivityBlockAttributes {
  activityType: ActivityType;
  title: string;
  description: string;
  config: ActivityBlockConfig;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    activityBlock: {
      setActivityBlock: (attributes: Partial<ActivityBlockAttributes>) => ReturnType;
    };
  }
}

export const ActivityBlock = Node.create({
  name: 'activityBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      activityType: {
        default: 'quiz' as ActivityType,
      },
      title: {
        default: '',
      },
      description: {
        default: '',
      },
      config: {
        default: {} as ActivityBlockConfig,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'activity-block',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['activity-block', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ActivityBlockView);
  },

  addCommands() {
    return {
      setActivityBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});
