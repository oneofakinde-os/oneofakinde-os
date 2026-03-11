import { expect, test, type Page } from "@playwright/test";

async function signInAsCreator(page: Page) {
  await page.goto("/auth/sign-in?returnTo=%2Fworkshop", { waitUntil: "domcontentloaded" });
  await page.getByLabel("what's your email?").fill("oneofakinde@oneofakinde.com");
  await page.getByLabel("enter your password").fill("smoke-password");
  await page.getByRole("radio", { name: "creator" }).check();
  await page.getByRole("button", { name: "let's go" }).click();
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
