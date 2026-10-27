import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const publicId='public_card_123456789012',revokeToken='local-revoke-token-for-e2e';
const baseUrl='http://127.0.0.1:3455';
function receipt(){const createdAt=new Date().toISOString();return{publication:{publicId,url:`${baseUrl}/p/${publicId}`,createdAt,expiresAt:new Date(Date.now()+30*24*60*60*1000).toISOString()},revokeToken};}

test('visibility selection drives the single preview and local downloads without publishing',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');
  await page.getByLabel('展示名称').fill('Lin Example');await page.getByLabel('公司或团队（选填）').fill('Hidden Company');
  const preview=page.locator('.studio-workspace .preview-panel .identity-card');
  await expect(preview).toContainText('Hidden Company');
  const company=page.getByRole('checkbox',{name:'公司或团队'});await company.uncheck();
  await expect(preview).not.toContainText('Hidden Company');
  await page.getByRole('tab',{name:'VIP'}).click();
  await expect(page.locator('.preview-heading')).toContainText('VIP');
  await expect(preview).toContainText('Hidden Company');
  await page.getByRole('tab',{name:'Free'}).click();await company.check();
  await expect(page.locator('.share-confirmation')).toHaveCount(0);
  await expect(page.locator('.studio-workspace .identity-card')).toHaveCount(1);
  const [imageDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'保存名片图片'}).click()]);
  const png=await readFile(await imageDownload.path());expect([...png.subarray(0,4)]).toEqual([137,80,78,71]);
  const [vcardDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'下载联系人（vCard）'}).click()]);
  const vcard=(await readFile(await vcardDownload.path())).toString('utf8');expect(vcard).toContain('FN:Lin Example');expect(vcard).toContain('ORG:Hidden Company');
  await expect(page.getByRole('button',{name:'分享名片'})).toBeVisible();await expect(page.getByRole('button',{name:'复制链接'})).toBeVisible();
});

test('copy reuses one public snapshot and manages revocation without exposing its token',async({page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  let created=0,deleted=0,projection:Record<string,unknown>|undefined;
  await page.route('**/v1/session',route=>route.request().method()==='GET'?route.fulfill({status:404,json:{error:{message:'No session'}}}):route.fulfill({status:201,json:{expiresAt:new Date(Date.now()+86400000).toISOString()}}));
  await page.route('**/v1/publications',async route=>{created++;projection=route.request().postDataJSON().projection;await route.fulfill({status:201,json:receipt()});});
  await page.route(`**/v1/publications/${publicId}`,async route=>{if(route.request().method()==='GET')await route.fulfill({status:200,json:{projection}});else{deleted++;expect(route.request().headers().authorization).toBe(`Bearer ${revokeToken}`);await route.fulfill({status:200,json:{ok:true}});}});
  await page.goto('/');await page.getByLabel('展示名称').fill('Lin Example');await page.getByLabel('公司或团队（选填）').fill('Private Company');
  await page.getByRole('checkbox',{name:'公司或团队'}).uncheck();
  await page.getByRole('button',{name:'复制链接'}).click();await expect(page.getByRole('status')).toContainText('链接已复制');
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(`${baseUrl}/p/${publicId}`);
  expect(created).toBe(1);expect(JSON.stringify(projection)).not.toContain('Private Company');
  await page.getByRole('button',{name:'复制链接'}).click();await expect(page.getByRole('status')).toContainText('链接已复制');expect(created).toBe(1);
  await page.getByText('管理分享').click();await expect(page.getByText(revokeToken)).toHaveCount(0);
  page.on('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'停止分享'}).click();
  await expect(page.getByRole('status')).toContainText('分享链接已停止');expect(deleted).toBe(1);
});

test('visibility sidebar stays beside preview on desktop and stacks on mobile',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/');
  const desktop=await page.evaluate(()=>{const preview=document.querySelector('.studio-workspace .preview-panel')!.getBoundingClientRect(),sidebar=document.querySelector('.studio-workspace .card-visibility-panel')!.getBoundingClientRect();return{previewRight:preview.right,sidebarLeft:sidebar.left};});
  expect(desktop.sidebarLeft).toBeGreaterThanOrEqual(desktop.previewRight-1);
  await page.setViewportSize({width:390,height:844});
  const mobile=await page.evaluate(()=>{const preview=document.querySelector('.studio-workspace .preview-panel')!.getBoundingClientRect(),sidebar=document.querySelector('.studio-workspace .card-visibility-panel')!.getBoundingClientRect();return{previewBottom:preview.bottom,sidebarTop:sidebar.top,scrollWidth:document.documentElement.scrollWidth};});
  expect(mobile.sidebarTop).toBeGreaterThanOrEqual(mobile.previewBottom-1);expect(mobile.scrollWidth).toBeLessThanOrEqual(390);
});
