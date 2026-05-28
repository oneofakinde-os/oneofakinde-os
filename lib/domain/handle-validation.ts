/**
 * Sprint 0.2 — Handle validation rules.
 *
 * Handles are the public @-mention identifier for every account. They
 * appear in URLs (`/studio/:handle`), in @-mentions across townhall
 * posts, and in certificate provenance lines. Because they are permanent
 * references, the rules here are intentionally strict:
 *
 *   - 3–30 characters.
 *   - Lowercase alphanumeric plus underscore and hyphen.
 *   - Must start with a letter.
 *   - Must end with a letter or digit (no trailing `_` or `-`).
 *   - No consecutive special characters (`__`, `--`, `_-`, `-_`).
 *   - A set of reserved words is blocked to avoid confusion with
 *     platform routes and system identifiers.
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;

const HANDLE_PATTERN = /^[a-z][a-z0-9_-]*[a-z0-9]$/;
const CONSECUTIVE_SPECIALS = /[_-]{2}/;

export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  // Platform routes
  "admin",
  "api",
  "app",
  "auth",
  "about",
  "blog",
  "browse",
  "catalog",
  "checkout",
  "collection",
  "collections",
  "community",
  "contact",
  "create",
  "creator",
  "creators",
  "dashboard",
  "discover",
  "docs",
  "drop",
  "drops",
  "explore",
  "faq",
  "feed",
  "help",
  "home",
  "invite",
  "jobs",
  "legal",
  "library",
  "live",
  "login",
  "logout",
  "marketplace",
  "me",
  "messages",
  "mod",
  "moderation",
  "notifications",
  "oneofakinde",
  "ook",
  "onboarding",
  "post",
  "posts",
  "press",
  "pricing",
  "privacy",
  "profile",
  "register",
  "resale",
  "search",
  "settings",
  "shop",
  "signin",
  "signup",
  "signout",
  "status",
  "store",
  "studio",
  "studios",
  "support",
  "system",
  "terms",
  "test",
  "townhall",
  "trending",
  "undefined",
  "user",
  "users",
  "wallet",
  "world",
  "worlds",
  "workshop",
  // System identifiers
  "null",
  "deleted",
  "anonymous",
  "root",
  "superadmin",
]);

export type HandleValidationResult =
  | { valid: true }
  | { valid: false; reason: HandleValidationError };

export type HandleValidationError =
  | "too_short"
  | "too_long"
  | "invalid_characters"
  | "must_start_with_letter"
  | "must_end_with_alphanumeric"
  | "consecutive_specials"
  | "reserved";

export function validateHandle(raw: string): HandleValidationResult {
  const handle = raw.trim().toLowerCase();

  if (handle.length < HANDLE_MIN_LENGTH) {
    return { valid: false, reason: "too_short" };
  }

  if (handle.length > HANDLE_MAX_LENGTH) {
    return { valid: false, reason: "too_long" };
  }

  if (!/^[a-z]/.test(handle)) {
    return { valid: false, reason: "must_start_with_letter" };
  }

  if (!/[a-z0-9]$/.test(handle)) {
    return { valid: false, reason: "must_end_with_alphanumeric" };
  }

  if (!HANDLE_PATTERN.test(handle)) {
    return { valid: false, reason: "invalid_characters" };
  }

  if (CONSECUTIVE_SPECIALS.test(handle)) {
    return { valid: false, reason: "consecutive_specials" };
  }

  if (RESERVED_HANDLES.has(handle)) {
    return { valid: false, reason: "reserved" };
  }

  return { valid: true };
}

/**
 * Quick boolean check — used by form-level validation where the error
 * reason is not surfaced to the caller.
 */
export function isValidHandle(raw: string): boolean {
  return validateHandle(raw).valid;
}

/**
 * Normalize a handle string before persistence or comparison.
 * Trims whitespace and lowercases.
 */
export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}
