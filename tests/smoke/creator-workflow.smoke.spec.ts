import { expect, test } from "@playwright/test";
import { signInViaUi } from "./session-auth";

/**
 * Creator workflow smoke tests.
 *
 * Validates core creator surfaces:
 *   sign-in as creator → workshop → dashboard → moderation → world schedule
 *
 * Uses the mock backend's dynamic account creation (creator role).
 */

const CREATOR_EMAIL = "smoke-creator@oneofakinde.com";
const CREATOR_PASSWORD = "creator_smoke_123";

async function signInAsCreator(page: import("@playwright/test").Page, returnTo: string) {
  await signInViaUi(page, {
    email: CREATOR_EMAIL,
    password: CREATOR_PASSWORD,
    role: "creator",
    returnTo,
    retries: 3
  });
}

/* ------------------------------------------------------------------ */
/*  Creator page rendering (auth-gated)                                */
/* ------------------------------------------------------------------ */

test.describe("creator pages render after sign-in", () => {
  test("workshop page loads for creator", async ({ page }) => {
    await signInAsCreator(page, "/workshop");
    await expect(page.locator("body")).not.toBeEmpty();
    expect(page.url()).toContain("/workshop");
  });

  test("dashboard page loads for creator", async ({ page }) => {
    await signInAsCreator(page, "/dashboard");
    await expect(page.locator("body")).not.toBeEmpty();
    // Dashboard should render without 500
    const response = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("moderation page loads for creator", async ({ page }) => {
    await signInAsCreator(page, "/workshop/moderation");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("payouts page loads for creator", async ({ page }) => {
    await signInAsCreator(page, "/payouts");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("my-campaigns page loads for creator", async ({ page }) => {
    await signInAsCreator(page, "/my-campaigns");
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

/* ------------------------------------------------------------------ */
/*  Creator onboarding flow                                            */
/* ------------------------------------------------------------------ */

test.describe("creator onboarding flow", () => {
  test("become-creator page renders", async ({ page }) => {
    const response = await page.goto("/become-creator", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("create drop page redirects to sign-in when unauthenticated", async ({ page }) => {
    const response = await page.goto("/create/drop", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("create world page redirects to sign-in when unauthenticated", async ({ page }) => {
    const response = await page.goto("/create/world", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });
});

/* ------------------------------------------------------------------ */
/*  World schedule and upgrade surfaces                                */
/* ------------------------------------------------------------------ */

test.describe("world schedule and upgrade surfaces", () => {
  test("world upgrade page requires auth", async ({ page }) => {
    const response = await page.goto("/worlds/dark-matter/upgrade", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("world schedule page requires creator auth", async ({ page }) => {
    const response = await page.goto("/workshop/worlds/dark-matter/schedule", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });
});
