import { test, expect } from '@playwright/test';

test.describe('Settings — Authenticated', () => {
  test('/settings redirects to /settings/providers', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForURL(/\/settings\/providers/, { timeout: 15_000 });
    expect(page.url()).toContain('/settings/providers');
  });

  test('/settings/providers loads', async ({ page }) => {
    const response = await page.goto('/settings/providers');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');
  });

  test('/settings/api-keys loads (no 404)', async ({ page }) => {
    const response = await page.goto('/settings/api-keys');
    expect(response?.status()).not.toBe(404);
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
  });

  test('/settings/memory loads (no 404)', async ({ page }) => {
    const response = await page.goto('/settings/memory');
    expect(response?.status()).not.toBe(404);
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
  });
});
