import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',testMatch:['quick-share.spec.ts'],
  use:{baseURL:'http://127.0.0.1:3455',trace:'retain-on-failure',serviceWorkers:'block'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:{command:'npm run dev -- --port 3455',url:'http://127.0.0.1:3455',reuseExistingServer:true,
    env:{NEYMI_NEXT_DIST_DIR:'.next-quick-share',NEYMI_SESSION_SECRET:'e2e-only-neymi-session-signing-secret-123456'}},
});
