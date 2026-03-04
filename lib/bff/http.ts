import { NextResponse } from "next/server";

export function ok<T>(payload: T, status = 200): NextResponse<T> {
  return NextResponse.json(payload, { status });
}

export function notFound(message = "not found"): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequest(message: string): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message = "unauthorized"): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "forbidden"): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function conflict(message = "conflict"): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function getRequiredSearchParam(url: URL, key: string): string | null {
  const value = url.searchParams.get(key)?.trim();
  return value || null;
}

export type RouteContext<TParams extends Record<string, string>> = {
  params: Promise<TParams>;
};

export async function getRequiredRouteParam<TParams extends Record<string, string>>(
  context: RouteContext<TParams>,
  key: keyof TParams
): Promise<string | null> {
  const params = await context.params;
  const value = params[key];
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

export function getRequiredBodyString(payload: Record<string, unknown> | null, key: string): string | null {
  const value = payload?.[key];
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

export function getOptionalBodyString(payload: Record<string, unknown> | null, key: string): string | null {
  const value = payload?.[key];
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

export async function safeJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
