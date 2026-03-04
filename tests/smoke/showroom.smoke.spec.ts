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
  await expect(page.getByRole("searchbox", { name: "search users, worlds, and drops" })).toBeVisible();
  await expect(page.getByTestId("showroom-drop-stage").first()).toBeVisible();
  await expect(page.getByLabel("townhall bottom nav")).toBeVisible();
}

test.describe("showroom smoke", () => {
  test("loads showroom shell across all mode tabs", async ({ page }) => {
    for (const path of MODE_PATHS) {
      await expectShowroomShell(page, path);
    }
  });

  test("supports lane switching and social drawer interactions", async ({ page }) => {
    await page.goto("/showroom?lane_key=rising", { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: "most collected" }).click();
    await expect(page).toHaveURL(/lane_key=most_collected/);
    await expect(page.getByTestId("showroom-shell")).toHaveAttribute(
      "data-showroom-ordering",
      "most_collected"
    );

    await page.getByRole("button", { name: "open comments" }).first().click();
    const commentsPanel = page.getByLabel("drop comments");
    await expect(commentsPanel).toBeVisible();
    await commentsPanel.getByRole("button", { name: "close comments" }).click();
    await expect(commentsPanel).toBeHidden();

    await page.getByRole("button", { name: "collect drop details" }).first().click();
    const collectPanel = page.getByLabel("collect drop details");
    await expect(collectPanel).toBeVisible();
    await collectPanel.getByRole("button", { name: "close collect details" }).click();
    await expect(collectPanel).toBeHidden();
  });
});
