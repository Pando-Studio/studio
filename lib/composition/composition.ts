// ===========================================
// Composition Types (simplified from WPS++)
// ===========================================

// Re-export Zod-validated types from schemas
export type { Orchestration, Transition, Composition, Group } from '@/lib/schemas/composition';
export { OrchestrationSchema, TransitionSchema, CompositionSchema, GroupSchema } from '@/lib/schemas/composition';

// Widget Kind (matches Prisma enum)
export type WidgetKind = 'LEAF' | 'COMPOSED';
