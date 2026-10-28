import {expect,test} from '@playwright/test';

const routes=['/','/beyond','/activity','/cards','/prepare','/p/test-public-id','/receive','/handoff','/account','/auth'];

for(const viewport of [{name:'large desktop',width:1440,height:1000},{name:'laptop',width:1024,height:900},{name:'tablet',width:768,height:1024},{name:'phone',width:390,height:844},{name:'narrow phone',width:320,height:740}]){
  test(`core site routes render without runtime errors or horizontal overflow on ${viewport.name}`,async({page})=>{
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    for(const route of routes){
      await page.goto(route,{waitUntil:'domcontentloaded'});
      await expect(page.locator('body')).not.toBeEmpty();
      const width=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:window.innerWidth}));
      expect(width.document,`${route} overflows at ${viewport.width}px`).toBeLessThanOrEqual(width.viewport+1);
    }
    expect(errors,`${viewport.name} route runtime errors`).toEqual([]);
  });
}
