import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

for(const width of [1440,390])test(`six free themes keep identity legible and contacts private at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1100});await page.goto('/');await page.locator('#display-name').fill('Theme owner');
  const card=page.getByRole('region',{name:'我的名片'});
  for(const name of ['极简白','航天黑','松林','大海','樱花','紫罗兰']){
    await page.getByRole('button',{name:`使用模板：${name}`,exact:true}).click();
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

test('six new VIP themes have distinct preview and opening effects',async({page})=>{
  test.setTimeout(90_000);
  await page.goto('/vip');
  const card=page.getByRole('region',{name:'我的名片'});
  for(const [id,name,effect] of [
    ['pixel-game','像素游戏','pixel-wake'],['oriental-newwave','东方新潮','ink-unfold'],['y2k','Y2K','chrome-sheen'],
    ['street-graffiti','街头涂鸦','poster-tear'],['scrapbook','剪贴手账','paper-stack'],['cyber-neon','赛博霓虹','light-scan'],
  ]){
    const preview=page.locator(`[data-template-id="${id}"]`);
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute('aria-label',`VIP 模板：${name}`);
    await expect(preview.locator('.template-swatch')).toHaveClass(new RegExp(`template-${id}`));
    for(const width of [360,390,1440]){
      await page.setViewportSize({width,height:1000});
      await preview.getByRole('button',{name:'查看大图'}).click();
      const large=page.getByRole('region',{name:'模板只读预览'});
      await expect(large).toHaveClass(new RegExp(`template-${id}`));
      await expect(large).toHaveAttribute('data-card-layout');
      await expect(large).toHaveAttribute('data-opening-effect',effect);
      const geometry=await large.evaluate(element=>{const box=element.getBoundingClientRect();return {ratio:box.width/box.height,width:box.width};});
      expect(geometry.ratio).toBeCloseTo(5/3,1);expect(geometry.width).toBeLessThanOrEqual(width);
      await preview.getByRole('button',{name:'收起大图'}).click();
    }
  }
  const selected=page.locator('[data-template-id="pixel-game"]');
  await selected.getByRole('button',{name:'预览此模板'}).click();
  await expect(card).toHaveClass(/template-pixel-game/);
  await expect(card).toHaveAttribute('data-opening-effect','pixel-wake');
  await page.screenshot({path:'test-results/card-themes/premium-preview-catalog.png',fullPage:true});
});

test('account page explains configuration state without blocking guest card creation',async({page})=>{
  await page.goto('/auth');
  await expect(page.getByText('账户服务尚未配置')).toBeVisible();
  await expect(page.getByRole('button',{name:/Google|Apple|验证码/})).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByText(/本机保存 · 无需注册/)).toBeVisible();
});

test('encrypted logo stays local unless explicitly selected for the share export',async({page})=>{
  await page.goto('/');await page.locator('#display-name').fill('黄徐超');await page.getByLabel(/公司或团队/).fill('Robofoto');await page.getByLabel('角色（选填）',{exact:true}).fill('创始人');
  await page.getByRole('button',{name:'保存到本机'}).click();await expect(page.locator('.studio-finish .save-status')).toContainText('已保存在此浏览器');
  await page.goto('/vip');await page.getByRole('button',{name:'设置或解锁卡片图片'}).click();
  await page.getByLabel('为敏感资料设置本地口令').fill('test logo password');await page.getByRole('button',{name:'创建加密区',exact:true}).click();
  const png=Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=160;canvas.height=80;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#14241f';ctx.fillRect(0,0,160,80);ctx.fillStyle='white';ctx.font='bold 48px sans-serif';ctx.fillText('R',18,58);return canvas.toDataURL('image/png').split(',')[1];}),'base64');
  await page.getByLabel('上传 Logo 或图片',{exact:true}).setInputFiles({name:'logo.png',mimeType:'image/png',buffer:png});
  const card=page.getByRole('region',{name:'我的名片'});
  await expect(card.getByRole('img',{name:'用户上传的 Logo 或图片'})).toBeVisible();
  const share=page.locator('.vip-share-section');
  await share.getByRole('button',{name:'生成分享预览'}).click();
  let projection=page.locator('.share-confirmation');await expect(projection).toContainText('展示名称 · 黄徐超');await expect(projection).not.toContainText('138 1234');await expect(projection.getByRole('img',{name:'用户上传的 Logo 或图片'})).toHaveCount(0);
  await page.getByLabel('公开 Logo 或图片',{exact:true}).check();await share.getByRole('button',{name:'生成分享预览'}).click();
  projection=page.locator('.share-confirmation');await expect(projection.getByRole('img',{name:'用户上传的 Logo 或图片'})).toBeVisible();
  const download=page.waitForEvent('download');await share.getByRole('button',{name:'确认下载图片'}).click();
  expect((await readFile(await (await download).path())).subarray(0,4)).toEqual(Buffer.from([137,80,78,71]));
  await page.reload();await expect(card.getByRole('img',{name:'用户上传的 Logo 或图片'})).toHaveCount(0);
  await page.getByRole('button',{name:'设置或解锁卡片图片'}).click();await page.getByLabel('解锁本地敏感资料',{exact:true}).fill('test logo password');await page.getByRole('button',{name:'解锁',exact:true}).click();
  await expect(card.getByRole('img',{name:'用户上传的 Logo 或图片'})).toBeVisible();
});
