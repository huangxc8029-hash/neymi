import {expect,test} from '@playwright/test';
import {makeProjection} from '../fixtures/domain';

test('received cards stay separate and can prompt a return card without registration',async({page})=>{
  await page.goto('/');await page.getByLabel('展示名称').fill('My Own Card');await page.getByRole('button',{name:'保存并更新预览'}).click();
  await page.goto('/receive');
  await page.getByLabel('导入 Neymi 名片文件').setInputFiles({name:'received.ncard',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeProjection({identity:{name:'Incoming Contact'}})))});
  await expect(page.getByRole('heading',{name:'Incoming Contact'})).toBeVisible();
  await expect(page.getByText('本人资料没有更改')).toBeVisible();
  await page.getByRole('link',{name:'回赠我的名片'}).click();
  await expect(page.getByRole('textbox',{name:'展示名称',exact:true})).toHaveValue('My Own Card');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('public links explain the cache and offline boundary',async({page})=>{
  await page.goto('/offline.html');
  await expect(page.getByText(/公开链接需要联网打开/)).toBeVisible();
});

test('social account and URL can be shared independently and opened only as a safe link',async({page})=>{
  await page.goto('/');await page.getByLabel('展示名称').fill('Link owner');
  await page.locator('summary').filter({hasText:'社交账号 免费'}).click();
  await page.getByRole('button',{name:'添加社交账号',exact:true}).click();
  await page.getByLabel('平台',{exact:true}).fill('GitHub');
  await page.getByLabel('账号',{exact:true}).fill('PRIVATE_ACCOUNT');
  await page.getByLabel('URL',{exact:true}).fill('example.org/work');
  await page.getByRole('button',{name:'保存并更新预览'}).click();
  await expect(page.locator('.save-status')).toContainText('已保存在此浏览器');
  await page.getByRole('region',{name:'我的名片'}).getByRole('button',{name:'社交账号'}).click();
  await expect(page.getByRole('link',{name:'打开 URL'})).toHaveAttribute('href','https://example.org/work');
  await page.getByRole('checkbox',{name:/社交账号 · URL/}).check();
  await page.getByRole('button',{name:'生成分享预览'}).click();
  await expect(page.locator('.share-confirmation pre')).toContainText('https://example.org/work');
  await expect(page.locator('.share-confirmation pre')).not.toContainText('PRIVATE_ACCOUNT');
  const wait=page.waitForEvent('download');await page.getByRole('button',{name:'确认下载 vCard'}).click();
  const {readFile}=await import('node:fs/promises');const bytes=await readFile(await(await wait).path());
  expect(bytes.toString()).toContain('URL:https://example.org/work');expect(bytes.toString()).not.toContain('PRIVATE_ACCOUNT');
  await page.getByLabel('URL',{exact:true}).fill('javascript:alert(1)');
  await expect(page.getByText(/链接仅支持/).first()).toBeVisible();
  await expect(page.getByRole('link',{name:'打开 URL'})).toHaveCount(0);
});
