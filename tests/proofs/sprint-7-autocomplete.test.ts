/**
 * Proof: Sprint 7 — search autocomplete (DSC-008).
 *
 * The autocomplete route surfaces typeahead suggestions across studios,
 * worlds, and hashtags (drops covered separately by catalog search).
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getAutocompleteRoute } from "../../app/api/v1/catalog/autocomplete/route";
import { commerceBffService } from "../../lib/bff/service";

type AutocompletePayload = {
  suggestions: Array<{ text: string; kind: string; score: number }>;
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: empty query yields no suggestions", async () => {
  const res = await getAutocompleteRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/autocomplete?q=")
  );
  assert.equal(res.status, 200);
  const payload = await parseJson<AutocompletePayload>(res);
  assert.deepEqual(payload.suggestions, []);
});

test("proof: hashtag suggestions surface after a post is tagged", async (t) => {
  const dbPath = path.join("/tmp", `ook-bff-autocomplete-${randomUUID()}.json`);
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const author = await commerceBffService.createSession({
    email: `auto-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const unique = `zephyr${randomUUID().slice(0, 6)}`;
  await commerceBffService.createTownhallPost(author.accountId, { body: `vibes #${unique}` });

  const res = await getAutocompleteRoute(
    new Request(`http://127.0.0.1:3000/api/v1/catalog/autocomplete?q=${unique.slice(0, 5)}`)
  );
  assert.equal(res.status, 200);
  const payload = await parseJson<AutocompletePayload>(res);
  const hashtagHit = payload.suggestions.find(
    (s) => s.kind === "hashtag" && s.text === `#${unique}`
  );
  assert.ok(hashtagHit, "tagged hashtag is suggested by prefix");
});

test("proof: suggestions are ranked by score (prefix matches first)", async () => {
  // Uses seeded catalog; query a common token and assert descending score.
  const res = await getAutocompleteRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/autocomplete?q=a&limit=8")
  );
  assert.equal(res.status, 200);
  const payload = await parseJson<AutocompletePayload>(res);
  for (let i = 1; i < payload.suggestions.length; i += 1) {
    assert.ok(
      payload.suggestions[i - 1].score >= payload.suggestions[i].score,
      "suggestions are sorted by descending score"
    );
  }
});
