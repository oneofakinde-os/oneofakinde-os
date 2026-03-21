import { expect, test, type Page } from "@playwright/test";

const MODE_PATHS = [
  "/showroom",
  "/showroom/watch",
  "/showroom/listen",
  "/showroom/read",
  "/showroom/photos",
  "/showroom/live"
] as const;

async function expectShowroomShell(page: Page, path: string) {
  await page.goto(`${path}?lane_key=rising`, { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("showroom-page")).toBeVisible();
  await expect(page.getByTestId("showroom-shell")).toBeVisible();
  await expect(page.getByLabel("search oneofakinde cosmos")).toBeVisible();
  await expect(page.getByTestId("showroom-drop-stage").first()).toBeVisible();
  await expect(page.getByLabel("townhall bottom nav")).toBeVisible();
}

test.describe("showroom smoke", () => {
  test("loads showroom shell across all mode tabs", async ({ page }) => {
    for (const path of MODE_PATHS) {
      await expectShowroomShell(page, path);
    }
  });

  test("supports social drawer interactions", async ({ page }) => {
    await page.goto("/showroom?lane_key=rising", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "open comments" }).first().click();
    const commentsPanel = page.getByRole("region", { name: "drop comments" });
    await expect(commentsPanel).toBeVisible();

    await page.getByRole("button", { name: "collect drop details" }).first().click();
    const collectPanel = page.getByRole("region", { name: "collect drop details" });
    await expect(collectPanel).toBeVisible();
  });
});
