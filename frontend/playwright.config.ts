import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. The Angular dev server is started automatically. The .NET API (http://localhost:5192)
 * must be running separately (it needs TimescaleDB), e.g.
 *   docker compose up -d timescaledb
 *   dotnet run --project ../backend/src/SensorScope.Api
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'line' : 'list',
  timeout: 45_000,
  use: {
    baseURL: 'http://localhost:4200',
    locale: 'en-US',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
