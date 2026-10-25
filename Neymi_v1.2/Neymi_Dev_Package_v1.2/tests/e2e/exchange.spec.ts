import {expect,test} from '@playwright/test';
import {makeProjection} from '../fixtures/domain';

test('received cards stay separate and can prompt a return card without registration',async({page})=>{
  await page.goto('/');await page.getByLabel('展示名称').fill('My Own Card');await page.getByRole('button',{name:'预览名片'}).click();
  await page.goto('/receive');
  await page.getByLabel('导入 Neymi 名片文件').setInputFiles({name:'received.ncard',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeProjection({identity:{name:'Incoming Contact'}})))});
  await expect(page.getByRole('heading',{name:'Incoming Contact'})).toBeVisible();
  await expect(page.getByText('本人资料没有更改')).toBeVisible();
  await page.getByRole('link',{name:'回赠我的名片'}).click();
  await expect(page.getByLabel('展示名称')).toHaveValue('My Own Card');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('public links explain the cache and offline boundary',async({page})=>{
  await page.goto('/offline.html');
  await expect(page.getByText(/公开链接需要联网打开/)).toBeVisible();
});
