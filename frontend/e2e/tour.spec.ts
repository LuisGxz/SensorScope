import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Guided demo layer', () => {
  test('explore panel opens and starts the tour', async ({ page }) => {
    await loginAs(page, 'Operator');

    await page.locator('[data-tour="help"]').click();
    await expect(page.getByRole('heading', { name: 'How to explore' })).toBeVisible();
    await expect(page.getByText(/real here/i)).toBeVisible();

    await page.getByRole('button', { name: 'Take the 30-second tour' }).click();
    await expect(page.getByText('Welcome to the control room')).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('The plant, at a glance')).toBeVisible();

    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByText('The plant, at a glance')).toHaveCount(0);
  });

  test('auto-tour shows on first visit and the about page is reachable', async ({ page }) => {
    // No ss-tour-seen → the tour should auto-start.
    await page.addInitScript(() => localStorage.setItem('ss-lang', 'en'));
    await page.goto('/login');
    await page.getByRole('button', { name: 'Operator' }).click();
    await page.waitForURL('**/app');
    await expect(page.getByText('Welcome to the control room')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Skip' }).click();

    await page.goto('/about');
    await expect(page.getByText('Real-time industrial IoT monitoring')).toBeVisible();
  });
});
