import {expect,test} from '@playwright/test';

const publicId='public_card_123456789012',revokeToken='local-revoke-token-for-e2e';
const baseUrl='http://127.0.0.1:3455';
function receipt(){const createdAt=new Date().toISOString();return{publication:{publicId,url:`${baseUrl}/p/${publicId}`,createdAt,expiresAt:new Date(Date.now()+30*24*60*60*1000).toISOString()},revokeToken};}

test('visibility selection drives the studio preview without publishing',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');
  await page.getByRole('textbox',{name:'展示名称'}).fill('Lin Example');await page.locator('#company').fill('Hidden Company');
  const preview=page.locator('.studio-workspace .preview-panel .identity-card');
  await expect(preview).toContainText('Hidden Company');
  await page.getByRole('navigation',{name:'名片制作步骤'}).getByRole('button',{name:/选择显示内容/}).click();
  const company=page.locator('.editor-visibility-step').getByRole('checkbox',{name:'公司或团队'});await company.uncheck();
  await expect(preview).not.toContainText('Hidden Company');
  await company.check();await expect(preview).toContainText('Hidden Company');
  await expect(page.locator('.share-confirmation')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'分享名片'})).toBeVisible();await expect(page.getByRole('button',{name:'复制链接'})).toBeVisible();
  await expect(page.getByRole('button',{name:'微信图片 / 下载名片'})).toBeVisible();
});

test('copy link reuses one public snapshot and omits unselected profile fields',async({page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  let created=0,deleted=0,projection:Record<string,unknown>|undefined;
  await page.route('**/v1/session',route=>route.request().method()==='GET'?route.fulfill({status:404,json:{error:{message:'No session'}}}):route.fulfill({status:201,json:{expiresAt:new Date(Date.now()+86400000).toISOString()}}));
  await page.route('**/v1/publications',async route=>{created++;projection=route.request().postDataJSON().projection;await route.fulfill({status:201,json:receipt()});});
  await page.route(`**/v1/publications/${publicId}`,async route=>{if(route.request().method()==='GET')await route.fulfill({status:200,json:{projection}});else{deleted++;expect(route.request().headers().authorization).toBe(`Bearer ${revokeToken}`);await route.fulfill({status:200,json:{ok:true}});}});
  await page.goto('/');await page.getByRole('textbox',{name:'展示名称'}).fill('Lin Example');await page.locator('#company').fill('Private Company');
  await page.getByRole('navigation',{name:'名片制作步骤'}).getByRole('button',{name:/选择显示内容/}).click();await page.locator('.editor-visibility-step').getByRole('checkbox',{name:'公司或团队'}).uncheck();
  await page.getByRole('button',{name:'复制链接'}).click();await expect(page.locator('.quick-share [role="status"]')).toContainText('链接已复制');
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(`${baseUrl}/p/${publicId}`);
  expect(created).toBe(1);expect(JSON.stringify(projection)).not.toContain('Private Company');
  await page.getByRole('button',{name:'复制链接'}).click();await expect(page.locator('.quick-share [role="status"]')).toContainText('链接已复制');expect(created).toBe(1);
  expect(deleted).toBe(0);
});

test('visibility and final share actions remain usable at desktop and phone widths',async({page})=>{
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await page.goto('/');await page.getByRole('textbox',{name:'展示名称'}).fill('Share test');
    const stepNav=width<=760?page.locator('.mobile-studio-steps nav'):page.getByRole('navigation',{name:'名片制作步骤'});
    if(width<=760)await page.locator('.mobile-studio-steps summary').click();
    await stepNav.getByRole('button',{name:/选择显示内容/}).click();
    if(width<=760)await page.locator('.mobile-studio-steps summary').click();
    await expect(page.locator('.editor-visibility-step')).toBeVisible();
    if(width<=1023)await page.getByRole('button',{name:'预览'}).click();
    await expect(page.locator('.preview-panel .quick-share-actions button')).toHaveCount(5);
    if(width<=1023){
      await page.getByRole('button',{name:'编辑'}).click();
      await page.locator('.editor-visibility-actions').getByRole('button',{name:'跳过'}).click();
      await expect(page.locator('.studio-workspace')).toHaveAttribute('data-mobile-pane','preview');
      await expect(page.locator('.preview-panel .quick-share-actions button')).toHaveCount(3);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
