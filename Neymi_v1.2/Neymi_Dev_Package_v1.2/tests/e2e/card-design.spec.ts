import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

for(const width of [1440,390])test(`six new card themes keep identity and contact details legible at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1100});await page.goto('/');
  const card=page.getByRole('region',{name:'示例名片'});
  for(const name of ['极简白','航天黑','松林','大海','樱花','紫罗兰']){
    await page.getByRole('button',{name:`使用模板：${name}`,exact:true}).click();
    await expect(card.locator('.identity-signature')).toContainText('your secure cyber card manager');
    await expect(card).not.toContainText('Nice to meet you');await expect(card).not.toContainText('A better first impression');
    await expect(card.getByRole('button',{name:'复制 电话',exact:true})).toBeVisible();
    await expect(card.getByRole('button',{name:'复制 微信',exact:true})).toBeVisible();
    await expect(card.getByRole('button',{name:'复制 WhatsApp',exact:true})).toBeVisible();
    const geometry=await card.evaluate(element=>{
      const box=element.getBoundingClientRect(),contacts=element.querySelector('.identity-contacts')!,signature=element.querySelector('.identity-signature')!;
      const name=element.querySelector('h2')!.getBoundingClientRect(),role=element.querySelector('.identity-role')!.getBoundingClientRect();
      return {ratio:box.width/box.height,contactClipped:contacts.scrollHeight>contacts.clientHeight+1,overlap:contacts.getBoundingClientRect().bottom>signature.getBoundingClientRect().top,leftDiff:Math.abs(name.left-role.left)};
    });
    expect(geometry.ratio).toBeCloseTo(5/3,1);expect(geometry.contactClipped).toBe(false);expect(geometry.overlap).toBe(false);expect(geometry.leftDiff).toBeLessThan(1);
    // Screenshot waits for all background image resources before capturing.
    await page.evaluate(async()=>{await Promise.all(Array.from(document.querySelectorAll('.identity-card')).map(async element=>{const src=getComputedStyle(element).backgroundImage.match(/url\("?([^"\)]+)/)?.[1];if(src){const image=new Image();image.src=src;await image.decode();}}));});
    await card.screenshot({path:`test-results/card-themes/${width}-${name}.png`});
  }
  await card.getByRole('button',{name:'我的故事',exact:true}).click();
  await expect(card.getByRole('heading',{name:'我的故事'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(card.getByRole('button',{name:'我的故事',exact:true})).toBeFocused();
});

test('logo and contacts are visible locally but only selected assets enter exports',async({page})=>{
  await page.goto('/');await page.getByLabel('展示名称').fill('黄徐超');await page.getByLabel('公司或团队').fill('Robofoto');await page.getByLabel('角色',{exact:true}).fill('创始人');
  await page.getByRole('button',{name:'设置或解锁卡片图片'}).click();
  await page.getByLabel('为敏感资料设置本地口令').fill('test logo password');await page.getByRole('button',{name:'创建加密区',exact:true}).click();
  const png=Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=160;canvas.height=80;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#14241f';ctx.fillRect(0,0,160,80);ctx.fillStyle='white';ctx.font='bold 48px sans-serif';ctx.fillText('R',18,58);return canvas.toDataURL('image/png').split(',')[1];}),'base64');
  await page.getByLabel('上传 Logo 或图片',{exact:true}).setInputFiles({name:'logo.png',mimeType:'image/png',buffer:png});
  const card=page.getByRole('region',{name:'我的名片'});
  await expect(card.getByRole('img',{name:'用户上传的 Logo 或图片'})).toBeVisible();
  await page.getByLabel('电话',{exact:true}).fill('+86 138 1234 5678');await page.getByLabel('微信',{exact:true}).fill('robo-founder');
  await page.getByRole('button',{name:'加密保存联系方式',exact:true}).click();
  await expect(card.getByRole('button',{name:'复制 电话',exact:true})).toContainText('+86 138 1234 5678');
  await page.getByRole('button',{name:'使用模板：极简白',exact:true}).click();
  await expect(card.getByRole('button',{name:'复制 微信',exact:true})).toContainText('robo-founder');
  await page.getByRole('button',{name:'生成分享预览'}).click();
  let projection=JSON.parse(await page.locator('.share-confirmation pre').innerText());expect(projection.assets).toEqual([]);expect(JSON.stringify(projection)).not.toContain('138 1234');
  await page.getByLabel('公开 Logo 或图片',{exact:true}).check();await page.getByRole('button',{name:'生成分享预览'}).click();
  projection=JSON.parse(await page.locator('.share-confirmation pre').innerText());expect(projection.assets).toHaveLength(1);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'确认下载图片'}).click();
  expect((await readFile(await (await download).path())).subarray(0,4)).toEqual(Buffer.from([137,80,78,71]));
  await page.reload();await expect(card.getByRole('img')).toHaveCount(0);await expect(card.getByRole('button',{name:'复制 电话',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'设置或解锁卡片图片'}).click();await page.getByLabel('解锁本地敏感资料',{exact:true}).fill('test logo password');await page.getByRole('button',{name:'解锁',exact:true}).click();
  await expect(card.getByRole('img')).toHaveCount(1);await expect(card.getByRole('button',{name:'复制 电话',exact:true})).toBeVisible();
});
