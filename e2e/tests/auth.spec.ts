import { test, expect } from '@playwright/test';

test.describe('Authentication — Studio', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page loads without error', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    // Should contain a login form element
    await expect(
      page.getByRole('button', { name: /connexion|se connecter|sign in|login/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('register page loads without error', async ({ page }) => {
    const response = await page.goto('/register');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    // Should contain a register form element
    await expect(
      page.getByRole('button', { name: /créer|s'inscrire|register|sign up/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 15_000 });
    expect(page.url()).toContain('/login');
  });
});
