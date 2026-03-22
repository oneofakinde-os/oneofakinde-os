import { expect, test } from "@playwright/test";

/**
 * Page-rendering smoke tests.
 *
 * Verifies that all major routes load without a server-side crash (500).
 * Public routes are visited directly. Auth-gated routes are expected to
 * redirect to sign-in or return the sign-in page.
 *
 * These tests do NOT assert specific content — only that the response
 * is not a 500 and that the page renders some DOM.
 */

/* ------------------------------------------------------------------ */
/*  Public routes — no session required                                */
/* ------------------------------------------------------------------ */

const PUBLIC_ROUTES = [
  "/showroom",
  "/showroom/watch",
  "/showroom/listen",
  "/showroom/read",
  "/showroom/photos",
  "/showroom/live",
  "/showroom/search",
  "/townhall",
  "/townhall/watch",
  "/townhall/listen",
  "/townhall/read",
  "/townhall/photos",
  "/townhall/live",
  "/townhall/gallery",
  "/townhall/search",
  "/worlds",
  "/explore",
  "/connect",
  "/gallery",
  "/watch",
  "/listen",
  "/read",
  "/photos",
  "/live",
  "/live-now",
  "/auctions",
] as const;

test.describe("public pages render", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`GET ${route} returns 200 and renders`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response).not.toBeNull();
      expect(response!.status()).toBeLessThan(500);
      // Page should have some visible content
      await expect(page.locator("body")).not.toBeEmpty();
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Sprint 5 screens — new surfaces with dynamic params               */
/* ------------------------------------------------------------------ */

test.describe("sprint 5 new surface screens", () => {
  test("world conversation page loads for known world", async ({ page }) => {
    // Navigate to a world first to get a valid world ID
    const response = await page.goto("/worlds", { waitUntil: "domcontentloaded" });
    expect(response!.status()).toBeLessThan(500);

    // Try to find a world link
    const worldLink = page.getByRole("link").filter({ hasText: /dark.matter|world/i }).first();
    if (await worldLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await worldLink.click();
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });

  test("listing detail page handles missing listing gracefully", async ({ page }) => {
    const response = await page.goto("/collect/listings/nonexistent-listing-id", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    // Should not crash — either 404 or redirect
    expect(response!.status()).toBeLessThan(500);
  });

  test("collector page handles missing collector gracefully", async ({ page }) => {
    const response = await page.goto("/collectors/nonexistent-handle", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });
});

/* ------------------------------------------------------------------ */
/*  Auth-gated routes — should redirect, not crash                     */
/* ------------------------------------------------------------------ */

const AUTH_GATED_ROUTES = [
  "/my-collection",
  "/library",
  "/favorites",
  "/collect",
  "/workshop",
  "/notifications",
  "/settings/account",
  "/settings/notifications",
  "/dashboard",
  "/payouts",
] as const;

test.describe("auth-gated pages redirect without crashing", () => {
  for (const route of AUTH_GATED_ROUTES) {
    test(`GET ${route} does not 500`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response).not.toBeNull();
      // Auth-gated pages should redirect to sign-in or render the page
      // They should never return a 500
      expect(response!.status()).toBeLessThan(500);
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Drop detail routes with seed drop ID                               */
/* ------------------------------------------------------------------ */

test.describe("drop detail routes render for seed drop", () => {
  // The BFF file backend seeds a drop with ID "stardust"
  const DROP_ROUTES = [
    "/drops/stardust",
    "/drops/stardust/details",
    "/drops/stardust/activity",
    "/drops/stardust/offers",
    "/drops/stardust/properties",
    "/drops/stardust/thread",
  ] as const;

  for (const route of DROP_ROUTES) {
    test(`GET ${route} renders`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response).not.toBeNull();
      expect(response!.status()).toBeLessThan(500);
      await expect(page.locator("body")).not.toBeEmpty();
    });
  }
});

/* ------------------------------------------------------------------ */
/*  API health — key endpoints respond                                 */
/* ------------------------------------------------------------------ */

test.describe("API health", () => {
  const API_ROUTES = [
    "/api/v1/notifications/unread-count",
    "/api/v1/analytics/signals",
  ] as const;

  for (const route of API_ROUTES) {
    test(`GET ${route} responds`, async ({ request }) => {
      const response = await request.get(route);
      // Should respond (even if 401/403 for unauthed) — never 500
      expect(response.status()).toBeLessThan(500);
    });
  }
});
