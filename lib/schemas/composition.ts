import { z } from 'zod';

// ---------------------------------------------------------------------------
// Transition condition (simple expression)
// ---------------------------------------------------------------------------

export const TransitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  condition: z.string().optional(), // e.g. "score >= 70", "winningOptionId == 'explore'"
});

export type Transition = z.infer<typeof TransitionSchema>;

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export const OrchestrationSchema = z.object({
  mode: z.enum(['sequential', 'conditional']),
  transitions: z.array(TransitionSchema).optional(),
});

export type Orchestration = z.infer<typeof OrchestrationSchema>;

// ---------------------------------------------------------------------------
// Composition (groups within a COMPOSED widget)
// ---------------------------------------------------------------------------

export const GroupSchema = z.object({
  label: z.string(),
  childIds: z.array(z.string()),
});

export type Group = z.infer<typeof GroupSchema>;

export const CompositionSchema = z.object({
  groups: z.array(GroupSchema).optional(),
});

export type Composition = z.infer<typeof CompositionSchema>;
