import { expect, test, type Page } from "@playwright/test";

async function signInAsCreator(page: Page) {
  const response = await page.request.post("/api/v1/session/create", {
    data: {
      email: "oneofakinde@oneofakinde.com",
      role: "creator"
    }
  });
  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as {
    session?: {
      sessionToken?: string;
    };
  };

  const sessionToken = payload.session?.sessionToken;
  expect(sessionToken).toBeTruthy();

  const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4300";
  await page.context().addCookies([
    {
      name: "ook_session",
      value: sessionToken ?? "",
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax"
    }
  ]);
}

test.describe("lineage smoke", () => {
  test("drop detail renders public lineage panel", async ({ page }) => {
    await page.goto("/drops/stardust", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("drop-lineage-panel")).toBeVisible();
    await expect(page.getByText("lineage", { exact: true })).toBeVisible();
  });

  test("workshop shows lineage create/list surfaces for creators", async ({ page }) => {
    await signInAsCreator(page);
    await page.goto("/workshop", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("workshop-lineage-panel")).toBeVisible();
    await expect(page.getByTestId("workshop-drop-lineage-stardust")).toBeVisible();
  });
});
