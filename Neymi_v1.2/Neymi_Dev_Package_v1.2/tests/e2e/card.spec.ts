import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function openStep(page:import('@playwright/test').Page,step:'挑选模板'|'选择显示内容'|'其他个人信息'|'联系方式'){
  if(await page.evaluate(()=>innerWidth)<=760){const menu=page.locator('.mobile-studio-steps');if(!(await menu.evaluate(element=>(element as HTMLDetailsElement).open)))await menu.locator('summary').click();await menu.getByRole('navigation',{name:'选择名片制作步骤'}).getByRole('button',{name:new RegExp(step)}).click();const details=page.locator('.mobile-studio-steps');if(await details.evaluate(element=>(element as HTMLDetailsElement).open))await details.locator('summary').click();return;}
  await page.getByRole('navigation',{name:'名片制作步骤'}).getByRole('button',{name:new RegExp(step)}).click();
}
async function showPreview(page:import('@playwright/test').Page){if(await page.evaluate(()=>innerWidth)<=1023)await page.getByRole('button',{name:'预览',exact:true}).click();}

test('contacts are visible in their dedicated step and cancelling encryption does not save contact details',async({page})=>{
  await page.goto('/');
  const steps=page.getByRole('navigation',{name:'名片制作步骤'});
  await steps.getByRole('button',{name:/联系方式/}).click();
  const form=page.locator('.contact-panel');
  for(const label of ['邮箱','电话','微信','WhatsApp'])await expect(form.getByLabel(label,{exact:true})).toBeVisible();
  await form.getByLabel('电话',{exact:true}).fill('+1 415 555 0111');
  await form.getByRole('button',{name:'加密保存联系方式'}).click();
  await expect(form.getByLabel('为敏感资料设置本地口令')).toBeVisible();
  await form.getByRole('button',{name:'取消密码设置'}).click();
  await page.reload();
  await steps.getByRole('button',{name:/联系方式/}).click();
  await expect(form.getByRole('textbox',{name:'电话',exact:true})).toHaveValue('');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});
test('first visit opens a usable five-step studio with an assistant entry',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('region',{name:'名片工作室'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'名片制作步骤'}).getByRole('button')).toHaveCount(5);
  await expect(page.getByRole('complementary').getByRole('heading',{name:'你的名片'})).toBeVisible();
  await expect(page.getByRole('button',{name:/AI 名片助理/}).first()).toBeVisible();
});

test('six free templates work without registration and carry through preview and sharing',async({page})=>{
  await page.goto('/');await page.getByRole('textbox',{name:'展示名称'}).fill('Lin Template');await openStep(page,'挑选模板');
  const templates=page.getByRole('group',{name:'免费模板'});
  await expect(templates.locator('[data-template-id]')).toHaveCount(3);
  await templates.getByRole('button',{name:'更多模板'}).click();
  await expect(templates.locator('[data-template-id]')).toHaveCount(7);
  await templates.getByRole('button',{name:'使用模板：大海'}).click();
  const card=page.getByRole('region',{name:'我的名片'});
  await expect(card).toHaveClass(/template-coast/);
  await openStep(page,'选择显示内容');
  await expect(page.locator('.editor-visibility-step')).toBeVisible();
  await expect(page.getByRole('button',{name:'分享名片'})).toBeVisible();
  await expect(page.getByRole('button',{name:'复制链接'})).toBeVisible();
  await expect(page.getByRole('button',{name:'下载名片'})).toBeVisible();
});

test('card preview updates while the guest edits the display name',async({page})=>{
  await page.goto('/');
  await page.getByRole('textbox',{name:'展示名称'}).fill('Lin');
  await showPreview(page);await expect(page.getByRole('region',{name:'我的名片'})).toContainText('Lin');
});

test('personal information can be reviewed inside the rendered card',async({page})=>{
  await page.goto('/');await page.getByRole('textbox',{name:'展示名称'}).fill('Lin');await openStep(page,'其他个人信息');
  await page.locator('.vip-info-fields label').first().locator('textarea').fill('城市骑行');await showPreview(page);
  const card=page.getByRole('region',{name:'我的名片'});await expect(card.getByRole('button',{name:'查看Hobby · 爱好'})).toBeVisible();
  await card.getByRole('button',{name:'查看Hobby · 爱好'}).click();await expect(card).toContainText('城市骑行');
});

test('composer motion mode is selectable and reduced motion disables tile motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('textbox',{name:'展示名称'}).fill('Lin');
  await openStep(page,'其他个人信息');
  await page.locator('.vip-info-fields label').first().locator('textarea').fill('A modular story');
  await expect(page.locator('.studio-save-status')).toContainText('已自动保存在此浏览器');await openStep(page,'挑选模板');
  await page.getByRole('group',{name:'名片动效'}).getByRole('button',{name:'环绕显现'}).click();
  const card=page.getByRole('region',{name:'我的名片'});
  await expect(card).toHaveClass(/motion-orbit/);
  await expect(card.locator('.card-tile')).toHaveCSS('animation-name','none');
});

test('guest creates, previews and reloads a card without registration',async({page})=>{
  await page.goto('/');
  await page.getByRole('textbox',{name:'展示名称'}).fill('Lin');
  await page.locator('#company').fill('Neymi Lab');
  await expect(page.locator('.studio-save-status')).toContainText('已自动保存在此浏览器');
  await showPreview(page);await expect(page.getByRole('region',{name:'我的名片'})).toContainText('Lin');
  await expect(page.locator('.studio-save-status')).toContainText('已自动保存在此浏览器');
  await page.reload();
  await expect(page.getByRole('textbox',{name:'展示名称'})).toHaveValue('Lin');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

for(const width of [360,390,768,1440]){
  test(`card fits ${width}px viewport`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    await page.getByRole('textbox',{name:'展示名称'}).fill('Lin');
    await expect(page.locator('.studio-save-status')).toContainText('已自动保存在此浏览器');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await showPreview(page);await expect(page.getByRole('region',{name:'我的名片'})).toBeVisible();
  });
}

test('reduced motion removes card animation and details work from the keyboard',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('textbox',{name:'展示名称'}).fill('Lin');
  await openStep(page,'其他个人信息');
  await page.locator('.vip-info-fields label').first().locator('textarea').fill('Warehouse robot');
  await expect(page.locator('.studio-save-status')).toContainText('已自动保存在此浏览器');
  const card=page.getByRole('region',{name:'我的名片'});
  await expect(card).toHaveCSS('animation-name','none');
  await card.getByRole('button',{name:'查看Hobby · 爱好'}).focus();
  await page.keyboard.press('Enter');
  await expect(card).toContainText('Warehouse robot');
});

test('final step offers only the three requested share actions',async({page})=>{
  await page.goto('/');await page.getByRole('textbox',{name:'展示名称'}).fill('Lin');await openStep(page,'选择显示内容');
  const actions=page.locator('.preview-panel .quick-share-actions button');await expect(actions).toHaveCount(3);
  await expect(actions.nth(0)).toHaveAccessibleName('分享名片');await expect(actions.nth(1)).toHaveAccessibleName('复制链接');await expect(actions.nth(2)).toHaveAccessibleName('下载名片');
  await expect(page.locator('.editor-column .quick-share-actions')).toHaveCount(0);
});

test('download action exports a PNG',async({page})=>{
  await page.goto('/');await page.getByRole('textbox',{name:'展示名称'}).fill('Lin');await openStep(page,'选择显示内容');
  const imageWait=page.waitForEvent('download');await page.getByRole('button',{name:'下载名片'}).click();
  const image=await readFile(await (await imageWait).path());expect([...image.subarray(0,4)]).toEqual([137,80,78,71]);
});

test('AI preparation stays optional and blocks contact details before cloud consent',async({page})=>{
  let requests=0;await page.route('**/v1/designer/turn',async route=>{requests++;await route.fulfill({status:503,json:{error:{message:'not expected'}}});});
  await page.goto('/');
  await page.getByRole('button',{name:/AI 名片助理/}).first().click();
  const intro=page.getByLabel('描述你想制作的名片');
  await intro.fill('I built a demo. Contact me at demo@example.org');
  await page.getByRole('button',{name:'发送给 AI'}).click();
  await expect(page.getByText('这段内容包含联系方式或地址，请先移到本地联系方式表单，再发送其余介绍。')).toBeVisible();
  expect(requests).toBe(0);
  await intro.fill('I built a warehouse robotics demo.');
  await expect(page.getByRole('button',{name:'发送给 AI'})).toBeEnabled();
  await expect(page.getByText(/检测到联系方式时会拦截/)).toBeVisible();
});

test('guest encrypts contacts locally and leaves them unselected for public display',async({page})=>{
  await page.goto('/');await page.getByRole('textbox',{name:'展示名称'}).fill('Lin Contact');await openStep(page,'联系方式');
  const form=page.locator('.contact-panel');await form.getByLabel('邮箱',{exact:true}).fill('lin@example.org');
  await form.getByRole('button',{name:'加密保存联系方式'}).click();
  await page.getByLabel('为敏感资料设置本地口令').fill('correct horse battery');await page.getByRole('button',{name:'创建加密区'}).click();
  await expect(form.getByLabel('邮箱',{exact:true})).toHaveValue('lin@example.org');
  await form.getByRole('button',{name:'加密保存联系方式'}).click();
  await expect(form.getByRole('status')).toContainText('联系方式已加密保存');
  await openStep(page,'选择显示内容');
  await expect(page.locator('.editor-visibility-step').getByRole('checkbox',{name:'邮箱'})).not.toBeChecked();
  await expect(page.getByRole('button',{name:'分享名片'})).toBeVisible();
  await page.reload();await openStep(page,'联系方式');
  await expect(page.locator('.contact-panel').getByLabel('邮箱',{exact:true})).toBeDisabled();
});

test('direct prepare entry uses the shared assistant without retransmitting earlier turns',async({page})=>{
  await page.goto('/prepare');
  await page.getByRole('button',{name:/AI 名片助理/}).first().click();
  await page.getByRole('button',{name:/为特定对象准备名片/}).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.studio-workspace')).toHaveAttribute('data-active-step','visibility');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
