import { expect, test, type Page, type TestInfo } from "@playwright/test";

const TOWNHALL_BASE_PATH = "/showroom?lane_key=featured";
const TOWNHALL_MODE_PATHS = [
  "/showroom/watch",
  "/showroom/listen",
  "/showroom/read",
  "/showroom/photos",
  "/showroom/live"
] as const;

async function expectTownhallShell(page: Page, path: string) {
  const href = path.includes("?") ? path : `${path}?lane_key=featured`;
  await page.goto(href, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("showroom-page")).toBeVisible();
  await expect(page.getByTestId("showroom-shell")).toBeVisible();
  await expect(page.getByTestId("showroom-feed-viewport")).toBeVisible();
  await expect(page.getByTestId("showroom-drop-stage").first()).toBeVisible();
  await expect(page.getByLabel("townhall bottom nav")).toBeVisible();
}

function skipUnlessDesktop(testInfo: TestInfo) {
  if (!testInfo.project.name.includes("desktop")) {
    test.skip();
  }
}

test("th-man-01/02/03/09: feed shell, autoplay-muted preview, snap scroll, repeated tap stability, mode tabs", async ({
  page
}) => {
  await expectTownhallShell(page, TOWNHALL_BASE_PATH);

  // th-man-01: autoplay + muted preview stability
  await page.waitForTimeout(5_000);
  const mediaState = await page.evaluate(() => {
    const stage = document.querySelector("[data-testid='showroom-drop-stage']");
    if (!stage) {
      return { kind: "none" as const };
    }

    const video = stage.querySelector("video");
    if (video instanceof HTMLVideoElement) {
      return {
        kind: "video" as const,
        muted: video.muted,
        paused: video.paused,
        currentTime: video.currentTime
      };
    }

    const audio = stage.querySelector("audio");
    if (audio instanceof HTMLAudioElement) {
      return {
        kind: "audio" as const,
        muted: audio.muted,
        paused: audio.paused,
        currentTime: audio.currentTime
      };
    }

    return { kind: "none" as const };
  });

  expect(mediaState.kind).not.toBe("none");
  expect(mediaState.muted).toBe(true);
  expect(!mediaState.paused || mediaState.currentTime > 0.1).toBe(true);

  // th-man-02: snap scroll one drop at a time
  const snapState = await page.evaluate(async () => {
    const viewport = document.querySelector("[data-testid='showroom-feed-viewport']");
    if (!(viewport instanceof HTMLElement)) {
      return { ok: false as const };
    }

    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-testid='showroom-drop-card']")
    );
    if (cards.length < 2) {
      return { ok: false as const };
    }

    const beforeIndex = cards.findIndex((card) => card.classList.contains("active"));
    viewport.scrollBy({ top: viewport.clientHeight * 0.95, behavior: "auto" });

    await new Promise((resolve) => window.setTimeout(resolve, 750));

    const nextCards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-testid='showroom-drop-card']")
    );
    const afterIndex = nextCards.findIndex((card) => card.classList.contains("active"));
    const activeCard = nextCards[Math.max(afterIndex, 0)];
    if (!activeCard) {
      return { ok: false as const };
    }

    const viewportTop = viewport.getBoundingClientRect().top;
    const activeTop = activeCard.getBoundingClientRect().top;

    return {
      ok: true as const,
      beforeIndex,
      afterIndex,
      topDeltaPx: Math.abs(activeTop - viewportTop)
    };
  });

  expect(snapState.ok).toBe(true);
  if (snapState.ok) {
    expect(Math.abs(snapState.afterIndex - snapState.beforeIndex)).toBeLessThanOrEqual(1);
    expect(snapState.topDeltaPx).toBeLessThan(6);
  }

  // th-man-03: repeated tap does not produce black-screen regressions
  const stage = page.getByTestId("showroom-drop-stage").first();
  await stage.click();
  await stage.click();
  await expect(page.getByTestId("showroom-shell")).toBeVisible();
  const stageVisualState = await stage.evaluate((node) => {
    const style = window.getComputedStyle(node as HTMLElement);
    const hasVisual = Boolean(
      node.querySelector("video, audio, img, .townhall-audio-poster, .townhall-text-preview")
    );
    return {
      hiddenByStyle:
        style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0,
      hasVisual
    };
  });
  expect(stageVisualState.hiddenByStyle).toBe(false);
  expect(stageVisualState.hasVisual).toBe(true);

  // th-man-09: switch mode tabs and ensure shell/overlay stability
  for (const path of TOWNHALL_MODE_PATHS) {
    await expectTownhallShell(page, `${path}?lane_key=featured`);
    const viewport = page.getByTestId("showroom-feed-viewport");
    await viewport.evaluate((element) => {
      if (element instanceof HTMLElement) {
        element.scrollBy({ top: Math.max(200, Math.floor(element.clientHeight * 0.7)), behavior: "auto" });
      }
    });
    await page.waitForTimeout(250);
    await expect(page.getByLabel("townhall bottom nav")).toBeVisible();
    await expect(page.getByTestId("showroom-drop-stage").first()).toBeVisible();
  }
});

test("th-man-08: open drop and back preserves focused drop position", async ({ page }, testInfo) => {
  skipUnlessDesktop(testInfo);

  await expectTownhallShell(page, TOWNHALL_BASE_PATH);

  const activeDropBefore = await page
    .locator("[data-testid='showroom-drop-card'].active")
    .first()
    .getAttribute("data-drop-id");
  expect(activeDropBefore).toBeTruthy();

  await page.getByRole("button", { name: "collect drop details" }).first().click();
  await expect(page.getByRole("region", { name: "collect drop details" })).toBeVisible();
  await page.getByRole("link", { name: "open drop" }).click();
  await page.waitForURL(/\/drops\//, { timeout: 12_000 });

  await page.getByRole("link", { name: "back to showroom" }).click();
  await page.waitForURL(/\/showroom/, { timeout: 12_000 });

  const activeDropAfter = await page
    .locator("[data-testid='showroom-drop-card'].active")
    .first()
    .getAttribute("data-drop-id");
  expect(activeDropAfter).toBeTruthy();
  expect(activeDropAfter).toBe(activeDropBefore);
});
