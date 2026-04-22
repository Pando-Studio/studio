import { z, ZodTypeAny } from 'zod';
import type { JSONSchema } from './types';

/**
 * Convert a JSON Schema to a Zod schema
 * Supports a subset of JSON Schema Draft 7 commonly used in templates
 */
export function jsonSchemaToZod(schema: JSONSchema): ZodTypeAny {
  if (!schema.type) {
    // Handle schema references or untyped schemas
    if (schema.$ref) {
      // For now, treat refs as any - full implementation would resolve refs
      return z.any();
    }
    // If no type specified, allow any
    return z.any();
  }

  switch (schema.type) {
    case 'string':
      return buildStringSchema(schema);
    case 'number':
      return buildNumberSchema(schema);
    case 'integer':
      return buildIntegerSchema(schema);
    case 'boolean':
      return applyDescription(z.boolean(), schema.description);
    case 'null':
      return z.null();
    case 'array':
      return buildArraySchema(schema);
    case 'object':
      return buildObjectSchema(schema);
    default:
      return z.any();
  }
}

function buildStringSchema(schema: JSONSchema): ZodTypeAny {
  let zodSchema = z.string();

  if (schema.enum) {
    const stringEnums = schema.enum.filter((e): e is string => typeof e === 'string');
    if (stringEnums.length > 0) {
      return applyDescription(z.enum(stringEnums as [string, ...string[]]), schema.description);
    }
  }

  if (schema.minLength !== undefined) {
    zodSchema = zodSchema.min(schema.minLength);
  }

  if (schema.maxLength !== undefined) {
    zodSchema = zodSchema.max(schema.maxLength);
  }

  if (schema.pattern) {
    zodSchema = zodSchema.regex(new RegExp(schema.pattern));
  }

  if (schema.format === 'email') {
    zodSchema = zodSchema.email();
  } else if (schema.format === 'uri' || schema.format === 'url') {
    zodSchema = zodSchema.url();
  } else if (schema.format === 'uuid') {
    zodSchema = zodSchema.uuid();
  }

  return applyDescription(applyDefault(zodSchema, schema.default), schema.description);
}

function buildNumberSchema(schema: JSONSchema): ZodTypeAny {
  let zodSchema = z.number();

  if (schema.minimum !== undefined) {
    zodSchema = zodSchema.min(schema.minimum);
  }

  if (schema.maximum !== undefined) {
    zodSchema = zodSchema.max(schema.maximum);
  }

  return applyDescription(applyDefault(zodSchema, schema.default), schema.description);
}

function buildIntegerSchema(schema: JSONSchema): ZodTypeAny {
  let zodSchema = z.number().int();

  if (schema.minimum !== undefined) {
    zodSchema = zodSchema.min(schema.minimum);
  }

  if (schema.maximum !== undefined) {
    zodSchema = zodSchema.max(schema.maximum);
  }

  return applyDescription(applyDefault(zodSchema, schema.default), schema.description);
}

function buildArraySchema(schema: JSONSchema): ZodTypeAny {
  const itemSchema = schema.items ? jsonSchemaToZod(schema.items) : z.any();
  let zodSchema = z.array(itemSchema);

  if (schema.minItems !== undefined) {
    zodSchema = zodSchema.min(schema.minItems);
  }

  if (schema.maxItems !== undefined) {
    zodSchema = zodSchema.max(schema.maxItems);
  }

  return applyDescription(applyDefault(zodSchema, schema.default), schema.description);
}

function buildObjectSchema(schema: JSONSchema): ZodTypeAny {
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];

  const shape: Record<string, ZodTypeAny> = {};

  for (const [key, propSchema] of Object.entries(properties)) {
    let zodProp = jsonSchemaToZod(propSchema);

    // Make optional if not in required array
    if (!required.includes(key)) {
      zodProp = zodProp.optional();
    }

    shape[key] = zodProp;
  }

  const zodSchema = z.object(shape);

  // Handle additionalProperties
  if (schema.additionalProperties === false) {
    return applyDescription(applyDefault(zodSchema.strict(), schema.default), schema.description);
  } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    return applyDescription(applyDefault(zodSchema.passthrough(), schema.default), schema.description);
  }

  return applyDescription(applyDefault(zodSchema, schema.default), schema.description);
}

function applyDefault<T extends ZodTypeAny>(schema: T, defaultValue: unknown): ZodTypeAny {
  if (defaultValue !== undefined) {
    return schema.default(defaultValue);
  }
  return schema;
}

function applyDescription(schema: ZodTypeAny, description: string | undefined): ZodTypeAny {
  if (description) {
    return schema.describe(description);
  }
  return schema;
}

/**
 * Validate data against a JSON Schema using Zod
 */
export function validateWithSchema(
  data: unknown,
  schema: JSONSchema
): { success: true; data: unknown } | { success: false; errors: z.ZodError } {
  const zodSchema = jsonSchemaToZod(schema);
  const result = zodSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Format Zod errors into a readable array
 */
export function formatZodErrors(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));
}
