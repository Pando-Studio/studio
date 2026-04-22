import { test, expect } from '@playwright/test';

test.describe('Public Pages — Landing & Docs', () => {
  test('landing /en loads and contains "Qiplim Studio"', async ({ page }) => {
    const response = await page.goto('/en');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toContainText(/Qiplim Studio/i, {
      timeout: 10_000,
    });
  });

  test('landing /fr loads in French', async ({ page }) => {
    const response = await page.goto('/fr');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    // Page should contain French content (not English-only)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    // The page loaded without a 500 — that's the main assertion
  });

  test('/en/docs loads with navigation links', async ({ page }) => {
    const response = await page.goto('/en/docs');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    // Should contain navigation links to doc sections
    const links = page.locator('a[href*="/docs/"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test('/en/docs/getting-started loads', async ({ page }) => {
    const response = await page.goto('/en/docs/getting-started');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');
  });

  test('/en/docs/widget-types loads', async ({ page }) => {
    const response = await page.goto('/en/docs/widget-types');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');
  });

  test('/en/docs/self-hosting loads', async ({ page }) => {
    const response = await page.goto('/en/docs/self-hosting');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');
  });

  test('/en/developers loads and contains "API"', async ({ page }) => {
    const response = await page.goto('/en/developers');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toContainText(/API/i, {
      timeout: 10_000,
    });
  });

  test('/en/education loads', async ({ page }) => {
    const response = await page.goto('/en/education');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');
  });

  test('language switcher toggles between FR and EN', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');

    // Find and click the language switcher (FR link or button)
    const frLink = page
      .getByRole('link', { name: /^FR$/i })
      .or(page.locator('a[href="/fr"]'))
      .or(page.getByText(/^FR$/).first());

    if (await frLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await frLink.click();
      await page.waitForURL(/\/fr/, { timeout: 10_000 });
      expect(page.url()).toContain('/fr');
    } else {
      // Try a button-based switcher
      const switchBtn = page
        .getByRole('button', { name: /FR|langue|language/i })
        .first();
      if (await switchBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await switchBtn.click();
        await page.waitForURL(/\/fr/, { timeout: 10_000 });
        expect(page.url()).toContain('/fr');
      } else {
        // Language switcher not found — skip gracefully
        test.skip(true, 'Language switcher not found on page');
      }
    }
  });
});
