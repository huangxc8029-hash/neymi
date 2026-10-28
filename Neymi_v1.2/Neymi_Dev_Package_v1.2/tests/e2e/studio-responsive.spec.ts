import {expect,test} from '@playwright/test';

test('preview size control switches the card frame without changing card data',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await page.getByRole('textbox',{name:'展示名称'}).fill('Responsive Designer');
  await page.waitForTimeout(1800);
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await page.screenshot({path:'docs/verification/2026-10-27-purple-ui/studio-desktop.png',fullPage:true});
  const card=page.locator('.preview-panel .identity-card');
  const desktop=page.getByRole('button',{name:'桌面',exact:true});
  const mobile=page.getByRole('button',{name:'手机',exact:true});
  await expect(desktop).toHaveAttribute('aria-pressed','true');
  const desktopWidth=await card.evaluate(element=>element.getBoundingClientRect().width);
  await mobile.click();
  await expect(mobile).toHaveAttribute('aria-pressed','true');
  await expect(desktop).toHaveAttribute('aria-pressed','false');
  const mobileWidth=await card.evaluate(element=>element.getBoundingClientRect().width);
  expect(mobileWidth).toBeLessThan(desktopWidth);
  await expect(card).toContainText('Responsive Designer');
});

test('mobile studio keeps the editor action clear of floating controls and bottom navigation',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.locator('.assistant-float-root')).toHaveCount(0);
  await page.getByRole('textbox',{name:'展示名称'}).fill('Responsive Designer');
  await page.waitForTimeout(1800);
  await page.getByRole('button',{name:'预览'}).click();
  await expect(page.locator('.preview-panel .quick-share-actions button')).toHaveCount(3);
  await page.waitForTimeout(300);
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await page.screenshot({path:'docs/verification/2026-10-27-purple-ui/studio-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'编辑'}).click();
  const action=page.getByRole('button',{name:'下一步：联系方式'});
  await action.scrollIntoViewIfNeeded();
  const geometry=await page.evaluate(()=>{
    const action=document.querySelector<HTMLButtonElement>('.editor-step-actions button');
    const nav=document.querySelector<HTMLElement>('.mobile-work-nav');
    if(!action||!nav)throw new Error('Expected mobile action and navigation');
    const a=action.getBoundingClientRect(),n=nav.getBoundingClientRect();
    return {actionBottom:a.bottom,navTop:n.top,navVisible:getComputedStyle(nav).display!=='none'};
  });
  expect(geometry.navVisible).toBe(true);
  expect(geometry.actionBottom).toBeLessThanOrEqual(geometry.navTop);
});
