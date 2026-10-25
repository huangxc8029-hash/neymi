import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run dev -- --port 3100', url: 'http://127.0.0.1:3100', reuseExistingServer: false,
    env: { NEYMI_SESSION_SECRET: 'e2e-only-neymi-session-secret-32-bytes-long' } },
});
