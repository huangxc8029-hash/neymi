import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '3100';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL, trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: `npm run dev -- --port ${port}`, url: baseURL, reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER==='1', env:{NEYMI_SESSION_SECRET:'e2e-only-neymi-session-signing-secret-123456'} },
});
