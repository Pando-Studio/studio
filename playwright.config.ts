import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const AUTH_STATE = path.resolve(__dirname, 'e2e/.auth/user.json');

const baseURL = process.env.BASE_URL || 'http://localhost:3001';
const isExternalTarget = baseURL.startsWith('https://');

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/test-results',

  /* Fail build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Parallel execution */
  workers: process.env.CI ? 2 : 4,

  /* Reporter */
  reporter: process.env.CI ? 'github' : 'html',

  /* Timeout: 30s per test */
  timeout: isExternalTarget ? 60_000 : 30_000,

  /* Shared settings */
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    /* Setup: create test user and save auth state */
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },

    /* Authenticated tests */
    {
      name: 'chromium',
      testIgnore: /public-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STATE,
      },
      dependencies: ['setup'],
    },

    /* Public tests (no auth needed) */
    {
      name: 'public',
      testMatch: /public-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  /* Dev server: only start locally */
  ...(isExternalTarget
    ? {}
    : {
        webServer: {
          command: 'pnpm dev',
          url: 'http://localhost:3001',
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      }),
});
