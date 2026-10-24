import {expect,test} from '@playwright/test';

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
