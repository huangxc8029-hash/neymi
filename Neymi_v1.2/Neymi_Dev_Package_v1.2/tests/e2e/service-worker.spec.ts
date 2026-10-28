import {expect,test} from '@playwright/test';
test.use({serviceWorkers:'allow'});
test.skip(!process.env.NEYMI_E2E_PRODUCTION,'Next dev intentionally unregisters the production service worker. Set NEYMI_E2E_PRODUCTION=1 with a production server.');

test('public pages and APIs stay network-only while the local shell falls back offline',async({page,context})=>{
  await page.goto('/');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload();
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.goto('/p/public-demo');
  await expect(page.getByText(/公开链接需要联网打开/)).toBeVisible();
  const cached=await page.evaluate(async()=>({
    page:await caches.match('/p/public-demo')!==undefined,
    api:await caches.match('/v1/publications/public-demo')!==undefined,
    apiFetch:await fetch('/v1/publications/public-demo').then(()=>true).catch(()=>false),
  }));
  expect(cached).toEqual({page:false,api:false,apiFetch:false});
});
