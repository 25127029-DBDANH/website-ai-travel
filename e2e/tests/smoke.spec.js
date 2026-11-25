import { expect, test } from '@playwright/test';

test.describe('Smoke checks', () => {
  test('landing page loads without console errors', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/', { waitUntil: 'load' });

    await expect(
      page.getByRole('heading', { level: 1, name: /Plan Ho Chi Minh City/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Plan your Ho Chi Minh City trip' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Trips' })).toBeVisible();

    expect(pageErrors, 'Unexpected uncaught page errors on /').toEqual([]);
    expect(consoleErrors, 'Unexpected console.error logs on /').toEqual([]);
  });

  test('/trip/demo displays itinerary stops and map', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/trip/demo', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { level: 1, name: 'Khám phá Sài Gòn 3 ngày' })
    ).toBeVisible();

    const itinerary = page.getByRole('region', { name: 'Your itinerary' });
    await expect(itinerary).toBeVisible();

    const stops = itinerary.getByRole('article');
    await expect(stops.first()).toBeVisible();
    expect(await stops.count()).toBeGreaterThanOrEqual(1);
    await expect(
      itinerary.getByRole('heading', { level: 3, name: 'Nhà thờ Đức Bà Sài Gòn' })
    ).toBeVisible();

    await expect(page.getByText('Day 1 Map')).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();

    expect(pageErrors, 'Unexpected uncaught page errors on /trip/demo').toEqual([]);
  });
});
