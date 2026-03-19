import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type {
  PatronCommitmentCadence,
  PatronTierStatus,
  UpsertWorkshopPatronTierConfigInput
} from "@/lib/domain/contracts";

type PostWorkshopPatronConfigBody = {
  worldId?: string | null;
  title?: string;
  amountCents?: number | string;
  commitmentCadence?: string;
  periodDays?: number | string;
  earlyAccessWindowHours?: number | string;
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

function isPatronCommitmentCadence(value: unknown): value is PatronCommitmentCadence {
  return value === "weekly" || value === "monthly" || value === "quarterly";
}

function toPatronCommitmentPeriodDays(cadence: PatronCommitmentCadence): number {
  if (cadence === "weekly") return 7;
  if (cadence === "quarterly") return 90;
  return 30;
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

  const commitmentCadenceRaw = normalizeOptionalBodyString(body, "commitmentCadence");
  if (!commitmentCadenceRaw || !isPatronCommitmentCadence(commitmentCadenceRaw)) {
    return {
      ok: false,
      response: badRequest("commitmentCadence must be one of: weekly, monthly, quarterly")
    };
  }

  const periodDays = toPatronCommitmentPeriodDays(commitmentCadenceRaw);
  const hasPeriodDays = Object.prototype.hasOwnProperty.call(body ?? {}, "periodDays");
  if (hasPeriodDays) {
    const submittedPeriodDays = parsePositiveInteger(body?.periodDays);
    if (!submittedPeriodDays || submittedPeriodDays !== periodDays) {
      return {
        ok: false,
        response: badRequest("periodDays must align with commitmentCadence")
      };
    }
  }

  const earlyAccessWindowHours = parsePositiveInteger(body?.earlyAccessWindowHours);
  if (!earlyAccessWindowHours || earlyAccessWindowHours > 168) {
    return {
      ok: false,
      response: badRequest("earlyAccessWindowHours must be an integer between 1 and 168")
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
      commitmentCadence: commitmentCadenceRaw,
      periodDays,
      earlyAccessWindowHours,
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
