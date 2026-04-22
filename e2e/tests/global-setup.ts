import { test as setup } from '@playwright/test';
import { signUp, signIn, TEST_USER } from '../fixtures/auth';

setup('create test user and authenticate', async ({ page }) => {
  // Create the test user (idempotent — ignores 422 if already exists)
  await signUp(page, TEST_USER);

  // Sign in to get session cookies
  await signIn(page, TEST_USER);

  // Save authenticated state for reuse across tests
  await page.context().storageState({ path: './e2e/.auth/user.json' });
});
