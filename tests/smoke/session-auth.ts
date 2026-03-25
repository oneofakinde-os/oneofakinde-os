import type { Page } from "@playwright/test";

type SmokeRole = "collector" | "creator";

type SignInOptions = {
  email: string;
  password: string;
  role: SmokeRole;
  returnTo: string;
  retries?: number;
};

function randomForwardedFor(): string {
  const octet = Math.floor(Math.random() * 200) + 1;
  return `203.0.113.${octet}`;
}

async function setUniqueForwardedFor(page: Page): Promise<void> {
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": randomForwardedFor()
  });
}

export async function signInViaUi(page: Page, options: SignInOptions): Promise<void> {
  const retries = options.retries ?? 2;
  const signInUrl = `/auth/sign-in?returnTo=${encodeURIComponent(options.returnTo)}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    await setUniqueForwardedFor(page);
    await page.goto(signInUrl, { waitUntil: "domcontentloaded" });

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill(options.email);

    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await passwordInput.fill(options.password);

    if (options.role === "creator") {
      const creatorRadio = page.getByRole("radio", { name: "creator" });
      if (await creatorRadio.count()) {
        await creatorRadio.check();
      }
    }

    const submitButton = page.locator("button").filter({ hasText: /let.?s go/i }).first();
    await submitButton.click();

    try {
      await page.waitForURL((url) => !url.pathname.includes("/auth/sign-in"), {
        timeout: 12_000
      });
      return;
    } catch {
      const currentUrl = page.url();
      if (attempt < retries && currentUrl.includes("rate_limited")) {
        await page.waitForTimeout(400);
        continue;
      }
      throw new Error(`Sign-in failed after ${attempt + 1} attempts. URL: ${currentUrl}`);
    }
  }
}
