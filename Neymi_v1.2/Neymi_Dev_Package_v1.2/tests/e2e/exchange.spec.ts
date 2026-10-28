import {expect,test} from '@playwright/test';
import {makeProjection} from '../fixtures/domain';

test('received cards stay separate without registration and do not overwrite the local profile',async({page})=>{
  await page.goto('/');await page.getByRole('textbox',{name:'展示名称'}).fill('My Own Card');await expect(page.locator('.studio-save-status')).toContainText('已自动保存在此浏览器');
  await page.goto('/receive');
  await page.locator('#card-file').setInputFiles({name:'received.ncard',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeProjection({identity:{name:'Incoming Contact'}})))});
  await expect(page.getByRole('region',{name:'Incoming Contact名片'}).getByRole('heading',{name:'Incoming Contact'})).toBeVisible();
  await expect(page.getByText('本人资料没有更改')).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('textbox',{name:'展示名称',exact:true})).toHaveValue('My Own Card');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('public links explain the cache and offline boundary',async({page})=>{
  await page.goto('/offline.html');
  await expect(page.getByText(/公开链接需要联网打开/)).toBeVisible();
});

test('social account names stay separate from validated website links',async({page})=>{
  await page.goto('/');await page.getByRole('textbox',{name:'展示名称'}).fill('Link owner');
  await page.getByRole('navigation',{name:'名片制作步骤'}).getByRole('button',{name:/其他个人信息/}).click();
  await page.getByRole('combobox',{name:'搜索社交平台 1名称或首字母'}).fill('GitHub');
  await page.getByRole('option',{name:'GitHub'}).click();
  await page.getByRole('textbox',{name:'GitHub账号名称'}).fill('PRIVATE_ACCOUNT');
  await page.locator('.vip-website-field input').fill('example.org/work');
  await page.locator('.vip-website-field input').press('Tab');
  const card=page.getByRole('region',{name:'我的名片'});
  await card.getByRole('button',{name:'查看社交账号'}).click();
  const social=card.getByRole('group',{name:'社交账号详情'});
  await expect(social).toContainText('PRIVATE_ACCOUNT');await expect(social.getByRole('link')).toHaveCount(0);
  await card.getByRole('button',{name:'返回名片模块'}).click();
  await card.getByRole('button',{name:'查看个人网站'}).click();
  await expect(card.getByRole('link',{name:'打开主页'})).toHaveAttribute('href','https://example.org/work');
  await page.locator('.vip-website-field input').fill('javascript:alert(1)');
  await page.locator('.vip-website-field input').press('Tab');
  await expect(page.getByText(/请输入有效的 http\/https 网址/)).toBeVisible();
  await expect(card.getByRole('link',{name:'打开 URL'})).toHaveCount(0);
});
