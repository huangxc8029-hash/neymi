import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',testMatch:['content-import.spec.ts','assistant.spec.ts'],
  use:{baseURL:'http://127.0.0.1:3452',trace:'retain-on-failure',serviceWorkers:'block'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:{command:'npm run dev -- --port 3452',url:'http://127.0.0.1:3452',reuseExistingServer:false,
    env:{NEYMI_NEXT_DIST_DIR:'.next-content-final2',NEYMI_SESSION_SECRET:'e2e-only-neymi-session-signing-secret-123456'}},
});
