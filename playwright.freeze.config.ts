import { defineConfig, devices } from "@playwright/test";

const smokePort = Number(process.env.SMOKE_PORT ?? "4300");
const baseURL = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${smokePort}`;

export default defineConfig({
  testDir: "./tests/smoke",
  testMatch: /townhall\.freeze-matrix\.spec\.ts/,
  timeout: 60_000,
  expect: {
    timeout: 12_000
  },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    },
    {
      name: "desktop-webkit",
      use: {
        ...devices["Desktop Safari"]
      }
    },
    {
      name: "mobile-webkit",
      use: {
        ...devices["iPhone 13"]
      }
    }
  ],
  webServer: process.env.SMOKE_BASE_URL
    ? undefined
    : {
        command: `PORT=${smokePort} npm run start`,
        url: `${baseURL}/townhall`,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI
      }
});
