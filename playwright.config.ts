import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith("_test"))
  throw new Error(
    "Browser tests require a dedicated TEST_DATABASE_URL ending in _test.",
  );
process.env.DATABASE_URL = testUrl;
export default defineConfig({
  globalSetup: "./tests/helpers/prepare-test-db.ts",
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: testUrl,
      NEXTAUTH_URL: "http://127.0.0.1:3100",
      APP_URL: "http://127.0.0.1:3100",
      MAIL_TRANSPORT: "file",
      ALLOW_LOCAL_MAIL: "true",
      LOCAL_MAIL_DIRECTORY: ".local/e2e-mail",
    },
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
