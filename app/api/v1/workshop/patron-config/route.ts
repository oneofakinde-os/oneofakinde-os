import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type {
  PatronTierStatus,
  UpsertWorkshopPatronTierConfigInput
} from "@/lib/domain/contracts";

type PostWorkshopPatronConfigBody = {
  worldId?: string | null;
  title?: string;
  amountCents?: number | string;
  periodDays?: number | string;
  benefitsSummary?: string;
  status?: string;
};

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : null;
  }

  if (typeof value === "string") {
    const normalized = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(normalized) && normalized > 0) {
      return normalized;
    }
  }

  return null;
}

function normalizeOptionalBodyString(
  payload: Record<string, unknown> | null,
  key: string
): string | null {
  const value = payload?.[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isPatronTierStatus(value: unknown): value is PatronTierStatus {
  return value === "active" || value === "disabled";
}

function parseUpsertInput(
  body: Record<string, unknown> | null
):
  | {
      ok: true;
      input: UpsertWorkshopPatronTierConfigInput;
    }
  | {
      ok: false;
      response: Response;
    } {
  const title = normalizeOptionalBodyString(body, "title");
  if (!title) {
    return {
      ok: false,
      response: badRequest("title is required")
    };
  }

  const amountCents = parsePositiveInteger(body?.amountCents);
  if (!amountCents) {
    return {
      ok: false,
      response: badRequest("amountCents must be a positive integer")
    };
  }

  const periodDays = parsePositiveInteger(body?.periodDays);
  if (!periodDays) {
    return {
      ok: false,
      response: badRequest("periodDays must be a positive integer")
    };
  }

  const statusRaw = normalizeOptionalBodyString(body, "status");
  if (!statusRaw || !isPatronTierStatus(statusRaw)) {
    return {
      ok: false,
      response: badRequest("status must be one of: active, disabled")
    };
  }

  return {
    ok: true,
    input: {
      worldId: normalizeOptionalBodyString(body, "worldId"),
      title,
      amountCents,
      periodDays,
      benefitsSummary: normalizeOptionalBodyString(body, "benefitsSummary") ?? "",
      status: statusRaw
    }
  };
}

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const configs = await commerceBffService.listWorkshopPatronTierConfigs(guard.session.accountId);

  return ok({ configs });
}

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const body = (await safeJson<PostWorkshopPatronConfigBody>(request)) as
    | Record<string, unknown>
    | null;
  const parsed = parseUpsertInput(body);
  if (!parsed.ok) {
    return parsed.response;
  }

  const config = await commerceBffService.upsertWorkshopPatronTierConfig(
    guard.session.accountId,
    parsed.input
  );
  if (!config) {
    return badRequest("workshop patron config could not be saved");
  }

  return ok(
    {
      config
    },
    201
  );
}
