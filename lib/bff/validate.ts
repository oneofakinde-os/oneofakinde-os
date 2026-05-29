import { unprocessableEntity } from "@/lib/bff/http";
import type { NextResponse } from "next/server";
import { z } from "zod";

export { z };

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse<{ error: string; reasons?: string[] }> };

export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const reasons = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "value"}: ${issue.message}`
    );
    return {
      ok: false,
      response: unprocessableEntity("validation failed", reasons),
    };
  }
  return { ok: true, data: result.data };
}

export async function validateBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<ValidationResult<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: unprocessableEntity("request body must be valid JSON"),
    };
  }
  return validate(schema, body);
}

export function validateQuery<T>(
  url: URL,
  schema: z.ZodType<T>
): ValidationResult<T> {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return validate(schema, params);
}

// Common reusable field schemas
export const schemas = {
  accountId: z.string().min(1).regex(/^acct_/, "must be a valid account id"),
  dropId: z.string().min(1).regex(/^drop_/, "must be a valid drop id"),
  worldId: z.string().min(1).regex(/^world_/, "must be a valid world id"),
  handle: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/, "must be a valid handle"),
  email: z.string().email(),
  nonEmptyString: z.string().min(1).max(4096),
  positiveNumber: z.number().positive(),
  priceUsd: z.number().min(0.01).max(100_000),
  uuid: z.string().uuid(),
  isoDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  boolean: z.boolean(),
  paginationLimit: z.coerce.number().int().min(1).max(100).default(20),
  paginationCursor: z.string().optional(),
} as const;
