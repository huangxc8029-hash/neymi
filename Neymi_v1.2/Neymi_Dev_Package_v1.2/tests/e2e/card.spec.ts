import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('guest creates, previews and reloads a card without registration',async({page})=>{
  await page.goto('/');
  await page.getByLabel('展示名称').fill('Lin');
  await page.getByLabel('公司或团队').fill('Neymi Lab');
  await page.getByRole('button',{name:'预览名片'}).click();
  await expect(page.getByRole('region',{name:'我的名片'})).toContainText('Lin');
  await page.reload();
  await expect(page.getByLabel('展示名称')).toHaveValue('Lin');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

for(const width of [360,390,768,1440]){
  test(`card fits ${width}px viewport`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    await page.getByLabel('展示名称').fill('Lin');
    await page.getByRole('button',{name:'预览名片'}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.getByRole('region',{name:'我的名片'})).toBeVisible();
  });
}

test('reduced motion removes card animation and details work from the keyboard',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByLabel('展示名称').fill('Lin');
  await page.getByRole('button',{name:'添加展示模块'}).click();
  await page.getByLabel('亮点').fill('Warehouse robot');
  await page.getByRole('button',{name:'预览名片'}).click();
  const card=page.getByRole('region',{name:'我的名片'});
  await expect(card).toHaveCSS('animation-name','none');
  await card.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(card).toContainText('Warehouse robot');
});

test('download contains only the fields selected in the final preview',async({page})=>{
  await page.goto('/');
  await page.getByLabel('展示名称').fill('Lin');
  await page.getByRole('button',{name:'添加展示模块'}).click();
  await page.getByLabel('亮点').fill('UNSELECTED_SENTINEL');
  await page.getByRole('button',{name:'预览名片'}).click();
  await page.getByRole('button',{name:'生成分享预览'}).click();
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'确认下载名片文件'}).click();
  const bytes=await readFile(await (await download).path());
  expect(bytes.toString('utf8')).not.toContain('UNSELECTED_SENTINEL');
  expect(bytes.toString('utf8')).toContain('Lin');
});

test('image export is PNG and vCard is separately confirmed',async({page})=>{
  await page.goto('/');await page.getByLabel('展示名称').fill('Lin');
  await page.getByRole('button',{name:'预览名片'}).click();
  await page.getByRole('button',{name:'生成分享预览'}).click();
  const imageWait=page.waitForEvent('download');
  await page.getByRole('button',{name:'确认下载图片'}).click();
  const image=await readFile(await (await imageWait).path());
  expect([...image.subarray(0,4)]).toEqual([137,80,78,71]);
  const cardWait=page.waitForEvent('download');
  await page.getByRole('button',{name:'确认下载 vCard'}).click();
  const card=await readFile(await (await cardWait).path());
  expect(card.toString('utf8')).toContain('BEGIN:VCARD');
});

test('AI preparation stays optional and blocks contact details before cloud consent',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:/AI 名片/}).click();
  await expect(page.getByRole('heading',{name:'先整理你想让人记住的特点。'})).toBeVisible();
  const intro=page.getByLabel('介绍你做过什么、擅长什么，或希望建立怎样的联系');
  await intro.fill('I built a demo. Contact me at demo@example.org');
  await expect(page.getByRole('alert')).toContainText('请先移除');
  await expect(page.getByRole('button',{name:'同意发送以上文字，请 AI 提炼'})).toBeDisabled();
  await intro.fill('I built a warehouse robotics demo.');
  await expect(page.getByRole('button',{name:'同意发送以上文字，请 AI 提炼'})).toBeEnabled();
});
