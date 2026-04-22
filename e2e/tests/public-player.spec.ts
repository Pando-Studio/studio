import { test, expect } from '@playwright/test';

test.describe('Public Player', () => {
  test('/s/non-existent-slug shows "Studio not found"', async ({ page }) => {
    await page.goto('/s/non-existent-slug');
    await page.waitForLoadState('domcontentloaded');

    // The page should show a "not found" message (rendered client-side after API 404)
    await expect(
      page.getByText(/studio not found|studio introuvable/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
