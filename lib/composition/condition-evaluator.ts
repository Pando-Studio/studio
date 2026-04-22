/**
 * Simple condition expression evaluator.
 * Supports: ==, !=, >=, <=, >, <
 * Operands: property names (resolved from context) and literals (string, number, boolean).
 *
 * Examples:
 *   evaluate("score >= 70", { score: 85 }) → true
 *   evaluate("winningOptionId == 'explore'", { winningOptionId: "explore" }) → true
 *   evaluate("responseCount > 10", { responseCount: 5 }) → false
 */

const OPERATORS = ['>=', '<=', '!=', '==', '>', '<'] as const;
type Operator = (typeof OPERATORS)[number];

function parseValue(raw: string): string | number | boolean {
  const trimmed = raw.trim();

  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Quoted string
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }

  // Number
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;

  // Property name (returned as-is, resolved later)
  return trimmed;
}

function resolveOperand(
  value: string | number | boolean,
  context: Record<string, unknown>,
): unknown {
  if (typeof value === 'string' && value in context) {
    return context[value];
  }
  return value;
}

function compare(left: unknown, operator: Operator, right: unknown): boolean {
  switch (operator) {
    case '==':
      return left == right; // eslint-disable-line eqeqeq
    case '!=':
      return left != right; // eslint-disable-line eqeqeq
    case '>=':
      return Number(left) >= Number(right);
    case '<=':
      return Number(left) <= Number(right);
    case '>':
      return Number(left) > Number(right);
    case '<':
      return Number(left) < Number(right);
    default:
      return false;
  }
}

/**
 * Evaluate a simple condition expression against a context object.
 * Returns false if the expression is invalid or cannot be evaluated.
 */
export function evaluateCondition(
  expression: string,
  context: Record<string, unknown>,
): boolean {
  if (!expression || !expression.trim()) return true;

  // Find the operator
  let foundOp: Operator | null = null;
  let opIndex = -1;

  for (const op of OPERATORS) {
    const idx = expression.indexOf(op);
    if (idx !== -1) {
      foundOp = op;
      opIndex = idx;
      break;
    }
  }

  if (!foundOp || opIndex === -1) return false;

  const leftRaw = expression.slice(0, opIndex);
  const rightRaw = expression.slice(opIndex + foundOp.length);

  const leftParsed = parseValue(leftRaw);
  const rightParsed = parseValue(rightRaw);

  const leftResolved = resolveOperand(leftParsed, context);
  const rightResolved = resolveOperand(rightParsed, context);

  return compare(leftResolved, foundOp, rightResolved);
}
