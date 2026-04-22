/**
 * Composition validation utilities.
 * Simplified from WPS++ — only cycle detection and depth validation remain.
 */

const MAX_DEPTH = 5;
const MAX_CHILDREN = 50;

/**
 * Detect if adding parentId would create a cycle.
 */
export function detectCycle(
  widgetId: string,
  parentChain: string[],
): boolean {
  return parentChain.includes(widgetId);
}

/**
 * Validate nesting depth.
 */
export function validateDepth(currentDepth: number, maxDepth = MAX_DEPTH): boolean {
  return currentDepth <= maxDepth;
}

/**
 * Validate total children count.
 */
export function validateChildrenCount(count: number, max = MAX_CHILDREN): boolean {
  return count <= max;
}
