import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('contacts are visible in the basic form and cancelling encryption never persists the draft',async({page})=>{
  await page.goto('/');
  const form=page.getByRole('region',{name:'创建你的名片'});
  for(const label of ['邮箱','电话','微信','WhatsApp'])await expect(form.getByLabel(label,{exact:true})).toBeVisible();
  await form.getByLabel('展示名称').fill('Memory only');
  await form.getByLabel('电话',{exact:true}).fill('+1 415 555 0111');
  await form.getByRole('button',{name:'加密保存联系方式'}).click();
  await expect(form.getByLabel('为敏感资料设置本地口令')).toBeVisible();
  await form.getByRole('button',{name:'取消密码设置'}).click();
  await form.getByRole('button',{name:'保存并更新预览'}).click();
  await expect(page.locator('.save-status')).toContainText('已保存在此浏览器');
  await page.reload();
  await expect(page.getByLabel('电话',{exact:true})).toHaveValue('');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('first visit shows a visual card example, contact channels and an AI assistant path',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('region',{name:'示例名片'})).toBeVisible();
  await expect(page.getByRole('group',{name:'联系方式示意'})).toContainText('邮箱');
  await expect(page.getByRole('group',{name:'联系方式示意'})).toContainText('电话');
  await expect(page.getByRole('group',{name:'联系方式示意'})).toContainText('微信');
  await expect(page.getByRole('group',{name:'联系方式示意'})).toContainText('WhatsApp');
  await expect(page.getByRole('link',{name:'开始 AI 个性化准备'})).toHaveAttribute('href','/prepare');
});

test('six free templates work without registration and carry through preview and sharing',async({page})=>{
  await page.goto('/');
  const templates=page.getByRole('group',{name:'免费模板'});
  await expect(templates.getByRole('button')).toHaveCount(6);
  await expect(page.locator('.template-picker-heading')).toContainText('6 款免费');
  await expect(page.locator('.template-picker-heading')).toContainText('免注册');
  await templates.getByRole('button',{name:'使用模板：海岸'}).click();
  await page.getByLabel('展示名称').fill('Lin Template');
  const card=page.getByRole('region',{name:'我的名片'});
  await expect(card).toHaveClass(/template-coast/);
  await page.getByRole('button',{name:'生成分享预览'}).click();
  await expect(page.locator('.share-confirmation pre')).toContainText('"templateId": "coast"');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('card preview updates while the guest edits the display name',async({page})=>{
  await page.goto('/');
  await page.getByLabel('展示名称').fill('Lin');
  await expect(page.getByRole('region',{name:'我的名片'})).toContainText('Lin');
});

test('v1.2 card uses floating module tiles with in-card detail, copy, and back',async({page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.goto('/');
  await page.getByLabel('展示名称').fill('Lin');
  await page.getByRole('button',{name:'添加展示模块'}).click();
  await page.getByLabel('亮点').fill('Built a logistics product');
  await page.getByRole('button',{name:'保存并更新预览'}).click();
  const card=page.getByRole('region',{name:'我的名片'});
  const tile=card.getByRole('button',{name:'我想介绍'});
  await expect(tile).toBeVisible();
  await expect(tile).toHaveAttribute('data-tile-size');
  await tile.click();
  await expect(card.getByRole('heading',{name:'我想介绍'})).toBeVisible();
  await expect(card).toContainText('Built a logistics product');
  await card.getByRole('button',{name:'复制 亮点'}).click();
  await expect(card.getByRole('status')).toContainText('已复制');
  await expect(card.getByRole('button',{name:'返回名片模块'})).toBeVisible();
  await card.getByRole('button',{name:'返回名片模块'}).click();
  await expect(tile).toBeVisible();
});

test('composer motion mode is selectable and reduced motion disables tile motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByLabel('展示名称').fill('Lin');
  await page.getByRole('button',{name:'添加展示模块'}).click();
  await page.getByLabel('亮点').fill('A modular story');
  await page.getByRole('button',{name:'保存并更新预览'}).click();
  await page.getByRole('group',{name:'名片动效'}).getByRole('button',{name:'Orbit Reveal'}).click();
  const card=page.getByRole('region',{name:'我的名片'});
  await expect(card).toHaveClass(/motion-orbit/);
  await expect(card.locator('.card-tile')).toHaveCSS('animation-name','none');
});

test('guest creates, previews and reloads a card without registration',async({page})=>{
  await page.goto('/');
  await page.getByLabel('展示名称').fill('Lin');
  await page.getByLabel('公司或团队').fill('Neymi Lab');
  await page.getByRole('button',{name:'保存并更新预览'}).click();
  await expect(page.getByRole('region',{name:'我的名片'})).toContainText('Lin');
  await expect(page.locator('.save-status')).toContainText('已保存在此浏览器');
  await page.reload();
  await expect(page.getByRole('textbox',{name:'展示名称'})).toHaveValue('Lin');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

for(const width of [360,390,768,1440]){
  test(`card fits ${width}px viewport`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    await page.getByLabel('展示名称').fill('Lin');
    await page.getByRole('button',{name:'保存并更新预览'}).click();
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
  await page.getByRole('button',{name:'保存并更新预览'}).click();
  const card=page.getByRole('region',{name:'我的名片'});
  await expect(card).toHaveCSS('animation-name','none');
  await card.getByRole('button',{name:'我想介绍'}).focus();
  await page.keyboard.press('Enter');
  await expect(card).toContainText('Warehouse robot');
});

test('download contains only the fields selected in the final preview',async({page})=>{
  await page.goto('/');
  await page.getByLabel('展示名称').fill('Lin');
  await page.getByRole('button',{name:'添加展示模块'}).click();
  await page.getByLabel('亮点').fill('UNSELECTED_SENTINEL');
  await page.getByRole('button',{name:'保存并更新预览'}).click();
  await page.getByRole('button',{name:'生成分享预览'}).click();
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'确认下载名片文件'}).click();
  const bytes=await readFile(await (await download).path());
  expect(bytes.toString('utf8')).not.toContain('UNSELECTED_SENTINEL');
  expect(bytes.toString('utf8')).toContain('Lin');
});

test('image export is PNG and vCard is separately confirmed',async({page})=>{
  await page.goto('/');await page.getByLabel('展示名称').fill('Lin');
  await page.getByRole('button',{name:'保存并更新预览'}).click();
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
  await page.getByRole('link',{name:'AI 助手'}).click();
  await expect(page.getByRole('heading',{name:'先整理你想让人记住的特点。'})).toBeVisible();
  const intro=page.getByLabel('介绍你做过什么、擅长什么，或回答上一个问题');
  await intro.fill('I built a demo. Contact me at demo@example.org');
  await expect(page.getByText('检测到联系方式或地址。请先移除再发送。检测不是完整的隐私保护。')).toBeVisible();
  await expect(page.getByRole('button',{name:'同意发送当前文字，请 AI 继续提问'})).toBeDisabled();
  await intro.fill('I built a warehouse robotics demo.');
  await expect(page.getByRole('button',{name:'同意发送当前文字，请 AI 继续提问'})).toBeEnabled();
});

test('guest encrypts contact methods and shares only the chosen one',async({page})=>{
  await page.goto('/');
  await page.getByLabel('展示名称').fill('Lin Contact');
  await page.getByLabel('邮箱',{exact:true}).fill('lin@example.org');
  await page.getByRole('button',{name:'加密保存联系方式'}).click();
  await page.getByLabel('为敏感资料设置本地口令').fill('correct horse battery');
  await page.getByRole('button',{name:'创建加密区'}).click();
  await page.getByLabel('邮箱').fill('lin@example.org');
  await page.getByLabel('电话').fill('+1 415 555 0100');
  await page.getByLabel('微信').fill('lin_wechat');
  await page.getByLabel('WhatsApp').fill('+44 7700 900123');
  await page.getByRole('button',{name:'加密保存联系方式'}).click();
  await page.getByRole('button',{name:'保存并更新预览'}).click();
  const card=page.getByRole('region',{name:'我的名片'});
  await card.getByRole('button',{name:'联系方式'}).click();
  await expect(card).toContainText('lin@example.org');
  await page.getByRole('checkbox',{name:/联系方式 · 邮箱/}).check();
  await page.getByRole('button',{name:'生成分享预览'}).click();
  const preview=page.locator('.share-confirmation pre');
  await expect(preview).toContainText('lin@example.org');
  for(const value of ['+1 415 555 0100','lin_wechat','+44 7700 900123'])await expect(preview).not.toContainText(value);
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'确认下载名片文件'}).click();
  const bytes=await readFile(await(await download).path()),text=bytes.toString('utf8');
  expect(text).toContain('lin@example.org');
  expect(text).not.toContain('+1 415 555 0100');expect(text).not.toContain('lin_wechat');expect(text).not.toContain('+44 7700 900123');
  await page.reload();
  await expect(page.getByRole('textbox',{name:'展示名称'})).toHaveValue('Lin Contact');
  await expect(page.getByLabel('邮箱',{exact:true})).toBeDisabled();
  await page.getByRole('textbox',{name:'展示名称',exact:true}).fill('Renamed while locked');
  await page.getByRole('button',{name:'保存并更新预览'}).click();
  await expect(page.locator('.save-status')).toContainText('已保存在此浏览器');
  await page.getByRole('button',{name:'解锁联系方式'}).click();
  await page.getByLabel('解锁本地敏感资料').fill('wrong password');
  await page.getByRole('button',{name:'解锁',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('邮箱',{exact:true})).toBeDisabled();
  await page.getByLabel('解锁本地敏感资料').fill('correct horse battery');
  await page.getByRole('button',{name:'解锁',exact:true}).click();
  await expect(page.getByLabel('邮箱',{exact:true})).toHaveValue('lin@example.org');
  await expect(page.getByLabel('微信',{exact:true})).toHaveValue('lin_wechat');
  await page.getByLabel('邮箱',{exact:true}).fill('bad-email');
  await page.getByRole('button',{name:'加密保存联系方式'}).click();
  await expect(page.locator('.contact-panel [role="status"]')).toContainText('基础信息已保存；联系方式未保存');
});

test('assistant asks follow-up without retransmitting earlier turns',async({page})=>{
  const sent:string[]=[];
  await page.route('**/v1/session',route=>route.fulfill({status:201,json:{expiresAt:'2026-10-26T00:00:00.000Z'}}));
  await page.route('**/v1/coach',async route=>{
    const body=route.request().postDataJSON();sent.push(body.context.text);
    await route.fulfill({status:200,json:{reply:'你希望和哪类人交流？',facts:sent.length===1?[{id:'fact_e2e_coach',text:'设计过物流工具',category:'experience',origin:'ai_extracted'}]:[]}});
  });
  await page.goto('/prepare');
  const intro=page.getByLabel('介绍你做过什么、擅长什么，或回答上一个问题');
  await intro.fill('我设计过物流工具。');
  await page.getByRole('button',{name:'同意发送当前文字，请 AI 继续提问'}).click();
  await expect(page.getByText('你希望和哪类人交流？')).toBeVisible();
  await page.getByRole('button',{name:'确认并保存到本地'}).click();
  await expect(page.getByText('设计过物流工具',{exact:true})).toBeVisible();
  await intro.fill('我希望认识供应链负责人。');
  await page.getByRole('button',{name:'同意发送当前文字，请 AI 继续提问'}).click();
  await expect.poll(()=>sent.length).toBe(2);
  expect(sent).toEqual(['我设计过物流工具。','我希望认识供应链负责人。']);
});

test('free module slots and keyboard-accessible planned previews never insert examples',async({page})=>{
  await page.goto('/');await page.getByLabel('展示名称').fill('Module owner');
  await page.getByText('Story · 我的故事 免费',{exact:true}).click();
  await page.getByRole('button',{name:'添加Story · 我的故事',exact:true}).click();
  await page.getByLabel('亮点',{exact:true}).fill('My real story');
  await expect(page.getByRole('button',{name:'添加展示模块',exact:true})).toBeDisabled();
  const planned=page.locator('summary').filter({hasText:'Services · 服务'});
  await planned.focus();await page.keyboard.press('Enter');
  await expect(page.getByText('静态示例（不会写入你的名片）：示例：介绍你实际提供的服务、作品或合作条件。请填写真实内容。').first()).toBeVisible();
  await page.getByRole('button',{name:'保存并更新预览'}).click();
  await expect(page.locator('.save-status')).toContainText('已保存在此浏览器');
  await page.reload();
  await expect(page.getByLabel('亮点',{exact:true})).toHaveValue('My real story');
  await expect(page.getByRole('region',{name:'我的名片'})).not.toContainText('Services');
});
