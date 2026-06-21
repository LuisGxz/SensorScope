import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Auth', () => {
  test('operator signs in and sees the live plant', async ({ page }) => {
    await loginAs(page, 'Operator');
    // Summary chips + at least one device card.
    await expect(page.getByText('NORTH PLANT')).toBeVisible();
    await expect(page.locator('a[href="/app/device/TH-204"]')).toBeVisible({ timeout: 15_000 });
  });

  test('invalid credentials are rejected', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ss-tour-seen', '1'));
    await page.goto('/login');
    await page.getByPlaceholder('operator@sensorscope.app').fill('operator@sensorscope.app');
    await page.getByPlaceholder('••••••••').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });
});
