import { expect, test, type Page } from "@playwright/test";
import { signInViaUi } from "./session-auth";

async function signInAsCreator(page: Page) {
  await signInViaUi(page, {
    email: "oneofakinde@oneofakinde.com",
    password: "smoke-password",
    role: "creator",
    returnTo: "/workshop",
    retries: 3
  });
  await page.waitForURL("**/workshop", { timeout: 12000 });
}

test.describe("lineage smoke", () => {
  test("drop detail renders public lineage panel", async ({ page }) => {
    await page.goto("/drops/stardust", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("drop-lineage-panel")).toBeVisible();
    await expect(page.getByText("lineage", { exact: true })).toBeVisible();
  });

  test("workshop shows lineage create/list surfaces for creators", async ({ page }) => {
    await signInAsCreator(page);

    await expect(page.getByTestId("workshop-lineage-panel")).toBeVisible();
    await expect(page.getByTestId("workshop-drop-lineage-stardust")).toBeVisible();
  });
});
