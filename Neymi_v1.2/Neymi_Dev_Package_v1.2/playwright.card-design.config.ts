import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',testMatch:'card-design.spec.ts',
  use:{baseURL:'http://127.0.0.1:3419',trace:'retain-on-failure',serviceWorkers:'block'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:{command:'npm run dev -- --port 3419',url:'http://127.0.0.1:3419',reuseExistingServer:false,
    env:{NEYMI_NEXT_DIST_DIR:'.next-card-design',NEYMI_SESSION_SECRET:'e2e-only-neymi-session-signing-secret-123456'}},
});
