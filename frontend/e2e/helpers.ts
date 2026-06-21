import { Page, expect } from '@playwright/test';

export type DemoRole = 'Operator' | 'Viewer';

/** Sign in via a demo-account button; suppress the auto-tour for deterministic runs. */
export async function loginAs(page: Page, role: DemoRole = 'Operator'): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ss-tour-seen', '1');
      localStorage.setItem('ss-lang', 'en');
    } catch {
      /* ignore */
    }
  });
  await page.goto('/login');
  // Demo buttons read "Operator operator@sensorscope.app" — match by the label substring.
  await page.getByRole('button', { name: role }).click();
  await page.waitForURL('**/app', { timeout: 20_000 });
  // The device grid is rendered once the snapshot loads.
  await expect(page.locator('a[href^="/app/device"]').first()).toBeVisible({ timeout: 15_000 });
}
