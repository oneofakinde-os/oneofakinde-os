import { expect, test } from "@playwright/test";

/**
 * E2E collector journey smoke test.
 *
 * Validates the core user funnel:
 *   showroom → drop detail → collect redirect → sign-in → auth → settings
 *
 * Uses the BFF file backend's seeded data (collector_demo account, stardust drop).
 */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/auth/sign-in", { waitUntil: "domcontentloaded" });

  const emailInput = page.locator('input[type="email"], input[name="email"]');
  await emailInput.fill("collector@oneofakinde.com");

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill("collector123");

  // Click the "let's go" submit button (last button on the page)
  const submitButton = page.locator("button").filter({ hasText: /let.?s go/i });
  await submitButton.click();

  // Wait for navigation away from sign-in
  await page.waitForURL((url) => !url.pathname.includes("/auth/sign-in"), {
    timeout: 10_000
  });
}

/* ------------------------------------------------------------------ */
/*  Journey: anonymous browsing                                        */
/* ------------------------------------------------------------------ */

test.describe("anonymous collector journey", () => {
  test("showroom → drop detail → poster visible", async ({ page }) => {
    await page.goto("/showroom", { waitUntil: "domcontentloaded" });
    expect(await page.title()).toBeTruthy();

    // Showroom should show "stardust" from seed data
    const stardustHeading = page.getByText("stardust", { exact: false });
    await expect(stardustHeading.first()).toBeVisible({ timeout: 8_000 });

    // Navigate to drop detail
    await page.goto("/drops/stardust", { waitUntil: "domcontentloaded" });

    // Drop detail should render title and price
    await expect(page.getByText("stardust").first()).toBeVisible();
    await expect(page.getByText("$1.99").first()).toBeVisible();

    // Collect button should be visible
    await expect(page.getByText("collect").first()).toBeVisible();
  });

  test("collect page redirects unauthenticated user to sign-in", async ({ page }) => {
    const response = await page.goto("/collect/stardust", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    // Should redirect to sign-in
    expect(page.url()).toContain("/auth/sign-in");
  });

  test("worlds index renders world cards", async ({ page }) => {
    await page.goto("/worlds", { waitUntil: "domcontentloaded" });

    // Should show "dark matter" and "through the lens" from seed
    await expect(page.getByText("dark matter").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("through the lens").first()).toBeVisible();
  });

  test("world detail page loads with drops grid", async ({ page }) => {
    await page.goto("/worlds/dark-matter", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("dark matter").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("recent drops").first()).toBeVisible();
  });

  test("collector profile renders for known handle", async ({ page }) => {
    await page.goto("/collectors/collector_demo", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("collector demo").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("@collector_demo").first()).toBeVisible();
  });

  test("townhall search returns results", async ({ page }) => {
    await page.goto("/townhall/search?q=stardust", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("stardust").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("result").first()).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/*  Journey: authenticated collector                                    */
/* ------------------------------------------------------------------ */

test.describe("authenticated collector journey", () => {
  test("sign in → my-collection shows owned drop", async ({ page }) => {
    await signIn(page);

    await page.goto("/my-collection", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/my-collection");

    // Should show "stardust" in collection from seed data
    await expect(page.getByText("stardust").first()).toBeVisible({ timeout: 8_000 });
  });

  test("sign in → library shows saved drops and queues", async ({ page }) => {
    await signIn(page);

    await page.goto("/library", { waitUntil: "domcontentloaded" });

    // Library should have saved drops section
    await expect(page.locator('[data-testid="library-saved-drops"]')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('[data-testid="library-read-queue"]')).toBeVisible();
  });

  test("sign in → notifications page shows seeded notifications", async ({ page }) => {
    await signIn(page);

    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    // Should show unread count and notification entries
    await expect(page.getByText("unread").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("stardust", { exact: false }).first()).toBeVisible();
  });

  test("sign in → settings account shows profile with edit button", async ({ page }) => {
    await signIn(page);

    await page.goto("/settings/account", { waitUntil: "domcontentloaded" });

    // Settings nav should be visible
    await expect(page.getByText("account").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("security").first()).toBeVisible();
    await expect(page.getByText("notifications").first()).toBeVisible();

    // Should show the edit button
    await expect(page.getByText("edit").first()).toBeVisible();

    // Should show collector_demo's email
    await expect(page.getByText("collector@oneofakinde.com").first()).toBeVisible();
  });

  test("sign in → settings nav navigates between tabs", async ({ page }) => {
    await signIn(page);

    await page.goto("/settings/account", { waitUntil: "domcontentloaded" });

    // Click security tab
    await page.getByRole("link", { name: "security" }).click();
    await page.waitForURL("**/settings/security");
    await expect(page.getByText("security overview").first()).toBeVisible({ timeout: 8_000 });

    // Click notifications tab
    await page.getByRole("link", { name: "notifications" }).click();
    await page.waitForURL("**/settings/notifications");
    await expect(page.getByText("delivery channels").first()).toBeVisible({ timeout: 8_000 });
  });
});

/* ------------------------------------------------------------------ */
/*  Cross-surface navigation                                           */
/* ------------------------------------------------------------------ */

test.describe("cross-surface navigation", () => {
  test("nav links work across major surfaces", async ({ page }) => {
    await page.goto("/showroom", { waitUntil: "domcontentloaded" });

    // Navigate to townhall
    const townhallLink = page.getByRole("link", { name: "townhall" }).first();
    if (await townhallLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await townhallLink.click();
      await page.waitForURL("**/townhall**");
      expect(page.url()).toContain("/townhall");
    }

    // Navigate to worlds
    const worldsLink = page.getByRole("link", { name: "worlds" }).first();
    if (await worldsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await worldsLink.click();
      await page.waitForURL("**/worlds**");
      expect(page.url()).toContain("/worlds");
    }
  });
});
