/**
 * Proof: Sprint 0.6a governance authorization.
 *
 * Closes the live hole where ANY authenticated account could mutate ANY governance
 * case (status / notes), flag ANY certificate for review, and read EVERY reporter's
 * PII via the case list. Asserts, at both the service floor and the route surface:
 *   - a non-moderator is refused all three mutations (service returns null; route → 403)
 *   - a configured moderator can perform them (positive control)
 *   - the case list is visibility-scoped: a moderator sees all; a reporter sees only
 *     their own filed cases; an outsider never sees another reporter's case or PII.
 *
 * Moderator status is conferred solely by OOK_MODERATOR_ACCOUNT_IDS (lib/bff/moderation),
 * independent of AccountRole — the moderator here is a plain "collector" whose account
 * id is in the configured admin set.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import { PATCH as patchStatusRoute } from "../../app/api/v1/governance/cases/[case_id]/status/route";
import { POST as postNoteRoute } from "../../app/api/v1/governance/cases/[case_id]/notes/route";
import { PATCH as patchCertReviewRoute } from "../../app/api/v1/certificates/[cert_id]/review/route";
import { GET as getCasesRoute } from "../../app/api/v1/governance/cases/route";

const SEED_CERT_ID = "cert_seed_stardust";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-gauthz-${randomUUID()}.json`);
}

async function setup(t: TestContext) {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    delete process.env.OOK_MODERATOR_ACCOUNT_IDS;
    await fs.rm(dbPath, { force: true });
  });

  const moderator = await commerceBffService.createSession({
    email: `gauthz-mod-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  // Confer moderator status purely via the configured admin set — no role change.
  process.env.OOK_MODERATOR_ACCOUNT_IDS = moderator.accountId;

  const outsider = await commerceBffService.createSession({
    email: `gauthz-outsider-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const reporter = await commerceBffService.createSession({
    email: `gauthz-reporter-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  return { moderator, outsider, reporter };
}

async function fileCase(reporterAccountId: string, subjectId: string) {
  const gc = await commerceBffService.createGovernanceCase({
    reporterAccountId,
    caseType: "safety_report",
    subjectType: "account",
    subjectId,
    reason: `authz proof case ${subjectId}`,
  });
  assert.ok(gc, "case filed");
  return gc;
}

function authedHeaders(token: string): Record<string, string> {
  return { "content-type": "application/json", "x-ook-session-token": token };
}

// ── Service floor: non-moderator refused, moderator allowed ──────────────────

test("proof: a non-moderator cannot mutate governance state (service floor)", async (t) => {
  const { outsider, reporter } = await setup(t);
  const gc = await fileCase(reporter.accountId, "subj-refuse");

  const statusAttempt = await commerceBffService.updateGovernanceCaseStatus(
    outsider.accountId,
    gc.id,
    "resolved"
  );
  assert.equal(statusAttempt, null, "non-moderator status change must be refused");

  const noteAttempt = await commerceBffService.addGovernanceCaseNote(
    outsider.accountId,
    gc.id,
    "outsider note"
  );
  assert.equal(noteAttempt, null, "non-moderator note must be refused");

  const flagAttempt = await commerceBffService.flagCertificateForReview(
    outsider.accountId,
    SEED_CERT_ID,
    "outsider flag"
  );
  assert.equal(flagAttempt, null, "non-moderator certificate flag must be refused");

  // And the case is untouched by the refused mutations.
  const afterList = await commerceBffService.listGovernanceCases({});
  const after = afterList.find((c) => c.id === gc.id);
  assert.equal(after?.status, "open", "case status must be unchanged after refused mutation");
  assert.equal(after?.notes, null, "case notes must be unchanged after refused mutation");
});

test("proof: a configured moderator can mutate governance state (positive control)", async (t) => {
  const { moderator, reporter } = await setup(t);
  const gc = await fileCase(reporter.accountId, "subj-allow");

  const updated = await commerceBffService.updateGovernanceCaseStatus(
    moderator.accountId,
    gc.id,
    "under_review",
    "moderator reviewing"
  );
  assert.ok(updated, "moderator status change must succeed");
  assert.equal(updated.status, "under_review");
  assert.ok(updated.notes?.includes("moderator reviewing"), "moderator note persisted");

  const flagged = await commerceBffService.flagCertificateForReview(
    moderator.accountId,
    SEED_CERT_ID,
    "moderator flag"
  );
  assert.ok(flagged, "moderator certificate flag must succeed");
  assert.equal(flagged.caseType, "certificate_review");
});

// ── Route surface: 403 for non-moderators, 200 for the moderator ─────────────

test("proof: governance mutation routes return 403 for a non-moderator", async (t) => {
  const { moderator, outsider, reporter } = await setup(t);
  const gc = await fileCase(reporter.accountId, "subj-route-403");

  const outsiderStatus = await patchStatusRoute(
    new Request(`http://localhost/api/v1/governance/cases/${gc.id}/status`, {
      method: "PATCH",
      headers: authedHeaders(outsider.sessionToken),
      body: JSON.stringify({ status: "resolved" }),
    }),
    { params: Promise.resolve({ case_id: gc.id }) }
  );
  assert.equal(outsiderStatus.status, 403, "outsider PATCH status must be 403");

  const outsiderNote = await postNoteRoute(
    new Request(`http://localhost/api/v1/governance/cases/${gc.id}/notes`, {
      method: "POST",
      headers: authedHeaders(outsider.sessionToken),
      body: JSON.stringify({ note: "outsider" }),
    }),
    { params: Promise.resolve({ case_id: gc.id }) }
  );
  assert.equal(outsiderNote.status, 403, "outsider POST note must be 403");

  const outsiderCert = await patchCertReviewRoute(
    new Request(`http://localhost/api/v1/certificates/${SEED_CERT_ID}/review`, {
      method: "PATCH",
      headers: authedHeaders(outsider.sessionToken),
      body: JSON.stringify({ reason: "outsider" }),
    }),
    { params: Promise.resolve({ cert_id: SEED_CERT_ID }) }
  );
  assert.equal(outsiderCert.status, 403, "outsider PATCH cert review must be 403");

  // The moderator, by contrast, succeeds through the very same route.
  const moderatorStatus = await patchStatusRoute(
    new Request(`http://localhost/api/v1/governance/cases/${gc.id}/status`, {
      method: "PATCH",
      headers: authedHeaders(moderator.sessionToken),
      body: JSON.stringify({ status: "resolved" }),
    }),
    { params: Promise.resolve({ case_id: gc.id }) }
  );
  assert.equal(moderatorStatus.status, 200, "moderator PATCH status must succeed");
});

// ── Route surface: list visibility + reporter-PII scoping ────────────────────

test("proof: the case list is visibility-scoped and never leaks another reporter's PII", async (t) => {
  const { moderator, outsider, reporter } = await setup(t);
  const reporterCase = await fileCase(reporter.accountId, "subj-vis-reporter");
  const outsiderCase = await fileCase(outsider.accountId, "subj-vis-outsider");

  async function listAs(token: string) {
    const res = await getCasesRoute(
      new Request("http://localhost/api/v1/governance/cases", {
        headers: { "x-ook-session-token": token },
      })
    );
    assert.equal(res.status, 200, "list returns 200 for an authed account");
    const body = (await res.json()) as {
      cases: Array<{ id: string; reporterAccountId: string }>;
    };
    return body.cases;
  }

  // Outsider sees ONLY their own case — never the reporter's case or PII.
  const outsiderView = await listAs(outsider.sessionToken);
  assert.ok(outsiderView.some((c) => c.id === outsiderCase.id), "outsider sees own case");
  assert.ok(
    !outsiderView.some((c) => c.id === reporterCase.id),
    "outsider must not see another reporter's case"
  );
  assert.ok(
    !JSON.stringify(outsiderView).includes(reporter.accountId),
    "outsider list must not contain another reporter's accountId (PII)"
  );

  // Reporter sees ONLY their own case.
  const reporterView = await listAs(reporter.sessionToken);
  assert.ok(reporterView.some((c) => c.id === reporterCase.id), "reporter sees own case");
  assert.ok(
    !reporterView.some((c) => c.id === outsiderCase.id),
    "reporter must not see another reporter's case"
  );

  // Moderator sees BOTH cases.
  const moderatorView = await listAs(moderator.sessionToken);
  assert.ok(moderatorView.some((c) => c.id === reporterCase.id), "moderator sees reporter case");
  assert.ok(moderatorView.some((c) => c.id === outsiderCase.id), "moderator sees outsider case");
});

test("proof: a reporter's own-case view redacts moderator-internal notes", async (t) => {
  const { moderator, reporter } = await setup(t);
  const gc = await fileCase(reporter.accountId, "subj-redact");

  // A moderator records internal deliberation on the case.
  const updated = await commerceBffService.updateGovernanceCaseStatus(
    moderator.accountId,
    gc.id,
    "under_review",
    "INTERNAL: suspected repeat reporter — do not disclose"
  );
  assert.ok(updated?.notes?.includes("INTERNAL"), "moderator note recorded on the case");

  async function listAs(token: string) {
    const res = await getCasesRoute(
      new Request("http://localhost/api/v1/governance/cases", {
        headers: { "x-ook-session-token": token },
      })
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { cases: Array<{ id: string; notes: string | null }> };
    return body.cases;
  }

  // The reporter sees their own case, but NEVER the moderator's internal notes.
  const reporterView = await listAs(reporter.sessionToken);
  const reporterCase = reporterView.find((c) => c.id === gc.id);
  assert.ok(reporterCase, "reporter sees own case");
  assert.equal(reporterCase.notes, null, "moderator notes must be redacted from the reporter view");
  assert.ok(
    !JSON.stringify(reporterView).includes("INTERNAL"),
    "no moderator deliberation text may appear anywhere in the reporter view"
  );

  // The moderator, by contrast, retains visibility of the notes.
  const moderatorView = await listAs(moderator.sessionToken);
  const moderatorCase = moderatorView.find((c) => c.id === gc.id);
  assert.ok(moderatorCase?.notes?.includes("INTERNAL"), "moderator retains visibility of notes");

  // The reporter's data-export carries the same redaction — notes are not their data.
  const exported = await commerceBffService.exportAccountData(reporter.accountId);
  const exportedCase = exported?.governanceCases.find((c) => c.id === gc.id);
  assert.ok(exportedCase, "reporter's export includes their own case");
  assert.equal(exportedCase.notes, null, "data-export must redact moderator notes");
});
