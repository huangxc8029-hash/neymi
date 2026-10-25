import {expect,test} from '@playwright/test';

test('messaging handoff consumes a fragment ticket and sends a webview to the public card',async({page})=>{
  await page.route('**/v1/messaging/handoffs/consume',route=>route.fulfill({status:200,json:{publicationId:'publication_public123'}}));
  await page.route('**/p/publication_public123',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Published card</h1>'}));
  await page.goto('/handoff#ticket=fixture-ticket-value');
  await expect(page).toHaveURL(/\/p\/publication_public123$/);
  await expect(page.getByRole('heading',{name:'Published card'})).toBeVisible();
  expect(page.url()).not.toContain('fixture-ticket-value');
});

test('missing handoff ticket explains the original-browser recovery path',async({page})=>{
  await page.goto('/handoff');
  await expect(page.getByText(/私有资料和未发布草稿保存在创建它们的浏览器里/)).toBeVisible();
  await expect(page.getByText(/请回到原浏览器重新创建/)).toBeVisible();
});
