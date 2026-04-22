import { test as base, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

/** Headers required by BetterAuth (CSRF Origin check) */
const AUTH_HEADERS = {
  Origin: BASE_URL,
  Referer: `${BASE_URL}/login`,
};

/** Test user credentials — must exist in the DB (created by global-setup) */
export const TEST_USER = {
  name: 'E2E Studio Test User',
  email: 'e2e-studio@qiplim.local',
  password: 'StudioTestPass123!',
};

/**
 * Sign up a user via BetterAuth API.
 * Silently succeeds if the user already exists (422).
 */
export async function signUp(
  page: Page,
  user = TEST_USER,
): Promise<void> {
  const response = await page.request.post('/api/auth/sign-up/email', {
    headers: AUTH_HEADERS,
    data: {
      name: user.name,
      email: user.email,
      password: user.password,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    if (response.status() !== 422 && !body.includes('already exists')) {
      throw new Error(`Sign up failed (${response.status()}): ${body}`);
    }
  }
}

/**
 * Sign in a user via BetterAuth API and set session cookies.
 */
export async function signIn(
  page: Page,
  user = TEST_USER,
): Promise<void> {
  const response = await page.request.post('/api/auth/sign-in/email', {
    headers: AUTH_HEADERS,
    data: {
      email: user.email,
      password: user.password,
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Sign in failed (${response.status()}): ${await response.text()}`,
    );
  }
}

/** Extended test fixture with authenticated page */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: './e2e/.auth/user.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
