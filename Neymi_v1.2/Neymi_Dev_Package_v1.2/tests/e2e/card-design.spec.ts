import {expect,test} from '@playwright/test';

for(const width of [1440])test(`six free themes keep identity legible and contacts private at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1100});await page.goto('/');await page.locator('#display-name').fill('Theme owner');await page.getByRole('navigation',{name:'名片制作步骤'}).getByRole('button',{name:/挑选模板/}).click();
  const card=page.getByRole('region',{name:'我的名片'}),freeGroup=page.getByRole('group',{name:'免费模板'});await freeGroup.getByRole('button',{name:'更多模板'}).click();
  for(const name of ['极简白','航天黑','松林','大海','樱花','紫罗兰']){
    await freeGroup.getByRole('button',{name:`使用模板：${name}`,exact:true}).click();
    await expect(card.locator('.identity-signature')).toContainText('your secure cyber card manager');
    await expect(card).not.toContainText('Nice to meet you');await expect(card).not.toContainText('A better first impression');
    await expect(card.getByRole('button',{name:/^复制 (电话|微信|WhatsApp)$/})).toHaveCount(0);
    const geometry=await card.evaluate(element=>{
      const box=element.getBoundingClientRect(),contacts=element.querySelector('.identity-contacts'),signature=element.querySelector('.identity-signature')!;
      const name=element.querySelector('h2')!.getBoundingClientRect(),role=element.querySelector('.identity-role')!.getBoundingClientRect();
      return {ratio:box.width/box.height,contactClipped:contacts?contacts.scrollHeight>contacts.clientHeight+1:false,contactScrollHeight:contacts?.scrollHeight??0,contactClientHeight:contacts?.clientHeight??0,overlap:contacts?contacts.getBoundingClientRect().bottom>signature.getBoundingClientRect().top:false,leftDiff:Math.abs(name.left-role.left)};
    });
    expect(geometry.ratio).toBeCloseTo(5/3,1);expect(geometry.contactClipped,`${name} contact geometry: ${JSON.stringify(geometry)}`).toBe(false);expect(geometry.overlap,`${name} contact geometry: ${JSON.stringify(geometry)}`).toBe(false);expect(geometry.leftDiff).toBeLessThan(1);
    // Screenshot waits for all background image resources before capturing.
    await page.evaluate(async()=>{await Promise.all(Array.from(document.querySelectorAll('.identity-card')).map(async element=>{const src=getComputedStyle(element).backgroundImage.match(/url\("?([^"\)]+)/)?.[1];if(src){const image=new Image();image.src=src;await image.decode();}}));});
    await card.screenshot({path:`test-results/card-themes/${width}-${name}.png`});
  }
});

test('six VIP themes can be selected from the shared five-step studio',async({page})=>{
  await page.setViewportSize({width:1280,height:900});
  await page.goto('/');await page.locator('#display-name').fill('Template owner');
  await page.getByRole('navigation',{name:'名片制作步骤'}).getByRole('button',{name:/挑选模板/}).click();
  const vipGroup=page.getByRole('group',{name:'VIP 模板'});
  await expect(vipGroup.locator('[data-template-id]')).toHaveCount(3);
  await vipGroup.getByRole('button',{name:'更多模板'}).click();
  for(const [id,effect] of [
    ['pixel-game','pixel-wake'],['oriental-newwave','ink-unfold'],['y2k','chrome-sheen'],
    ['street-graffiti','poster-tear'],['scrapbook','paper-stack'],['cyber-neon','light-scan'],
  ]){
    const template=vipGroup.locator(`[data-template-id="${id}"]`);
    await expect(template).toBeVisible();
    await template.click();
    await expect(template).toHaveAttribute('aria-pressed','true');
    const card=page.getByRole('region',{name:'我的名片'});
    await expect(card).toHaveClass(new RegExp(`template-${id}`));
    await expect(card).toHaveAttribute('data-opening-effect',effect);
  }
  await expect(vipGroup.locator('[data-template-id]')).toHaveCount(6);
});
test('account page explains configuration state without blocking guest card creation',async({page})=>{
  await page.goto('/auth');
  await expect(page.getByRole('heading',{name:'登录或创建账户'})).toBeVisible();
  const status=page.getByRole('status');
  if(await status.count())await expect(status).toContainText('账户服务尚未配置');
  else await expect(page.getByRole('textbox',{name:'邮箱地址'})).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('免注册 · 本地优先 · 分享由你决定')).toBeVisible();
});

test('encrypted logo stays local until explicitly selected for sharing',async({page})=>{
  await page.goto('/');
  await page.locator('#display-name').fill('黄徐超');
  await page.locator('#company').fill('Robofoto');
  await page.getByLabel('角色（选填）',{exact:true}).fill('创始人');
  const logo=page.getByRole('region',{name:'公司或团队 Logo'});
  await logo.getByRole('button',{name:'设置或解锁卡片图片'}).click();
  await page.getByLabel('为敏感资料设置本地口令').fill('test logo password');
  await page.getByRole('button',{name:'创建加密区',exact:true}).click();
  const png=Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=160;canvas.height=80;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#14241f';ctx.fillRect(0,0,160,80);ctx.fillStyle='white';ctx.font='bold 48px sans-serif';ctx.fillText('R',18,58);return canvas.toDataURL('image/png').split(',')[1];}),'base64');
  await logo.getByLabel('上传 Logo 或图片',{exact:true}).setInputFiles({name:'logo.png',mimeType:'image/png',buffer:png});
  const card=page.getByRole('region',{name:'我的名片'});
  await expect(card.getByRole('img',{name:'用户上传的 Logo 或图片'})).toBeVisible();
  await page.getByRole('navigation',{name:'名片制作步骤'}).getByRole('button',{name:/选择显示内容/}).click();
  const visibility=page.locator('.editor-visibility-step');
  await expect(visibility.getByLabel('卡片 Logo / 图片')).toBeChecked();
  await visibility.getByLabel('卡片 Logo / 图片').uncheck();
  await expect(card.getByRole('img',{name:'用户上传的 Logo 或图片'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'下载名片'})).toBeVisible();
  await visibility.getByLabel('卡片 Logo / 图片').check();
  await expect(card.getByRole('img',{name:'用户上传的 Logo 或图片'})).toBeVisible();
  await page.reload();
  const reloadedCard=page.getByRole('region',{name:'我的名片'});
  await expect(reloadedCard.getByRole('img',{name:'用户上传的 Logo 或图片'})).toHaveCount(0);
  await logo.getByRole('button',{name:'设置或解锁卡片图片'}).click();
  await page.getByLabel('解锁本地敏感资料',{exact:true}).fill('test logo password');
  await page.getByRole('button',{name:'解锁',exact:true}).click();
  await expect(reloadedCard.getByRole('img',{name:'用户上传的 Logo 或图片'})).toBeVisible();
});
