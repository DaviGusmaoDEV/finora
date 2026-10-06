import { defineConfig } from '@playwright/test';

const webServers = [
  {
    command: 'npm run dev --workspace=@finance/web -- --host 0.0.0.0',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
];
if (process.env.E2E_DATABASE_URL)
  webServers.push({
    command: 'npm run dev:api',
    url: 'http://localhost:3333/health',
    reuseExistingServer: true,
  });

export default defineConfig({
  testDir: './apps/web/tests/e2e',
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : 'list',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: webServers,
});
