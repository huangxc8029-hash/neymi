import {expect,test} from '@playwright/test';

for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]){
  test(`capture real product routes at ${viewport.name} size`,async({page})=>{
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    const openStudioStep=async(label:RegExp)=>{
      if(viewport.width<=760){const details=page.locator('.mobile-studio-steps');if(!(await details.evaluate(element=>(element as HTMLDetailsElement).open)))await details.locator('summary').click();}
      const nav=page.getByRole('navigation',{name:viewport.width<=760?'选择名片制作步骤':'名片制作步骤'});
      await nav.getByRole('button',{name:label}).click();
      if(viewport.width<=760){const details=page.locator('.mobile-studio-steps');if(await details.evaluate(element=>(element as HTMLDetailsElement).open))await details.locator('summary').click();}
    };
    await page.addStyleTag({content:'nextjs-portal{display:none!important}'}).catch(()=>{});
    for(const [route,file] of [
      ['/beyond','beyond'],
      ['/activity','activity'],
      ['/prepare','prepare'],
      ['/cards','library'],
    ] as const){
      await page.goto(route);await expect(page.locator('h1').first()).toBeVisible();
      await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
      await page.screenshot({path:`docs/verification/2026-10-27-purple-ui/${file}-${viewport.name}.png`,fullPage:viewport.width>760});
    }
    await page.goto('/');
    await page.locator('#display-name').fill('林予安');
    await page.locator('#role').fill('产品设计师');
    await page.locator('#company').fill('Neymi 设计工作室');
    await openStudioStep(/挑选模板/);
    await expect(page.locator('.template-picker')).toHaveCount(2);
    await page.screenshot({path:`docs/verification/2026-10-27-purple-ui/templates-${viewport.name}.png`,fullPage:viewport.width>760});
    if(viewport.width<=760){await page.locator('.pro-template-area').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/verification/2026-10-27-purple-ui/vip-templates-mobile.png'});}
    await openStudioStep(/选择显示内容/);
    await expect(page.locator('.editor-visibility-step')).toBeVisible();
    await page.screenshot({path:`docs/verification/2026-10-27-purple-ui/visibility-${viewport.name}.png`,fullPage:viewport.width>760});
    if(viewport.width<=760)await page.getByRole('button',{name:'预览'}).click();
    await page.locator('.studio-preview-share .quick-share-actions').scrollIntoViewIfNeeded();
    await page.screenshot({path:`docs/verification/2026-10-27-purple-ui/share-${viewport.name}.png`,fullPage:true});
  });
}
