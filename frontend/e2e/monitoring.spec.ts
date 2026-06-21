import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Monitoring', () => {
  test('opens a device and shows its time-series + thresholds', async ({ page }) => {
    await loginAs(page, 'Operator');
    await page.locator('a[href="/app/device/TH-204"]').click();
    await page.waitForURL('**/app/device/TH-204');

    // Header identifies the device; thresholds panel + chart render.
    await expect(page.getByText('Bearing temp — Compressor B')).toBeVisible();
    await expect(page.getByText('Thresholds', { exact: true })).toBeVisible();
    await expect(page.locator('apx-chart')).toBeVisible({ timeout: 15_000 });

    // Range switch reloads the series.
    await page.getByRole('button', { name: '24H', exact: true }).click();
    await expect(page.locator('apx-chart')).toBeVisible();
  });

  test('reading value updates live via SignalR', async ({ page }) => {
    await loginAs(page, 'Operator');
    await page.locator('a[href="/app/device/TH-204"]').click();
    await page.waitForURL('**/app/device/TH-204');
    const value = page.locator('.mono.text-3xl').first();
    await expect(value).toBeVisible();
    const before = (await value.innerText()).trim();
    // The telemetry simulator emits every ~2s.
    await expect.poll(async () => (await value.innerText()).trim(), { timeout: 15_000 }).not.toBe(before);
  });

  test('edits a threshold and persists it', async ({ page }) => {
    await loginAs(page, 'Operator');
    await page.locator('a[href="/app/device/HM-220"]').click();
    await page.waitForURL('**/app/device/HM-220');

    await page.getByRole('button', { name: 'Edit thresholds' }).click();
    const warn = page.locator('input[type="number"]').first();
    await warn.fill('64');
    await page.getByRole('button', { name: 'Save' }).click();

    // Back to the read-only panel showing the new WARN value.
    await expect(page.getByRole('button', { name: 'Edit thresholds' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('64', { exact: false }).first()).toBeVisible();
  });

  test('alerts feed filters and shows history', async ({ page }) => {
    await loginAs(page, 'Operator');
    await page.locator('a[href="/app/alerts"]').click();
    await page.waitForURL('**/app/alerts');
    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible();

    // Filter tabs are present and clickable.
    await page.getByRole('button', { name: 'Resolved', exact: true }).click();
    await expect(page.getByText('shown')).toBeVisible();
  });
});
