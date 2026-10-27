import {expect,test} from '@playwright/test';

test('global assistant prompt rotates once and pauses while an input is focused',async({page})=>{
  await page.clock.install();await page.goto('/');
  const prompt=page.locator('.assistant-prompt');
  await expect(prompt).toContainText('告诉我你要见谁');
  await page.locator('#display-name').focus();await page.clock.fastForward(21_000);
  await expect(prompt).toContainText('告诉我你要见谁');
  await page.locator('body').click({position:{x:5,y:5}});await page.clock.fastForward(7_000);
  await expect(prompt).toContainText('给我与会者名单');
  await page.clock.fastForward(7_000);await expect(prompt).toContainText('想让对方记住什么');
  await page.clock.fastForward(7_000);await expect(prompt).toHaveCount(0);
});

test('assistant modal is keyboard-dismissible and creator route navigation retains draft',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'打开全局 AI 助手'}).click();
  const dialog=page.getByRole('dialog',{name:'这次想准备什么？'});await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button').first()).toBeFocused();
  await dialog.getByRole('button',{name:/关于自己的故事/}).click();
  await expect(page).toHaveURL(/\/prepare$/);await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button',{name:'打开全局 AI 助手'})).toBeFocused();
});

test('assistant is available only on creator pages and dismisses prompts for this tab',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'关闭提示'}).click();
  await expect(page.locator('.assistant-prompt')).toHaveCount(0);
  await page.goto('/cards');await expect(page.getByRole('button',{name:'打开全局 AI 助手'})).toBeVisible();
  await page.goto('/receive');await expect(page.getByRole('button',{name:'打开全局 AI 助手'})).toHaveCount(0);
  await page.goto('/handoff');await expect(page.getByRole('button',{name:'打开全局 AI 助手'})).toHaveCount(0);
});

test('person assistant confirms each payload, never resends history, and requires local fact approval',async({page})=>{
  page.setDefaultTimeout(6000);const requests:unknown[]=[];
  await page.route('**/v1/session',route=>route.fulfill({status:201,json:{expiresAt:'2026-10-26T00:00:00.000Z'}}));
  await page.route('**/v1/coach',async route=>{const body=route.request().postDataJSON();requests.push(body.context.text);await route.fulfill({status:200,json:{reply:'你希望和哪类人交流？',facts:[{id:'fact_assistant_candidate',text:'设计过物流工具',category:'experience',origin:'ai_extracted'}]}});});
  await page.goto('/');await page.getByRole('button',{name:'打开全局 AI 助手'}).click();
  await page.getByRole('button',{name:/关于自己的故事/}).click();await expect(page).toHaveURL(/\/prepare$/);
  const input=page.getByLabel('告诉助手你的经历或目标');await input.fill('我设计过物流工具。');
  await page.locator('.global-assistant-panel summary').filter({hasText:'核对本次实际发送内容'}).click();
  await expect(page.locator('.global-assistant-panel pre')).toContainText('我设计过物流工具。');
  await expect(page.getByRole('button',{name:'同意发送当前内容'})).toBeDisabled();
  await page.getByLabel('我已核对本次发送内容').check();
  await page.getByRole('button',{name:'同意发送当前内容'}).click();
  await expect(page.getByText('你希望和哪类人交流？')).toBeVisible();
  await expect(page.getByRole('button',{name:'确认并保存到本地'})).toBeVisible();
  await page.getByRole('button',{name:'确认并保存到本地'}).click();
  await expect(page.getByRole('status')).toContainText('已确认并保存在本地');
  await input.fill('希望认识供应链负责人。');
  await page.getByLabel('我已核对本次发送内容').check();
  await page.getByRole('button',{name:'同意发送当前内容'}).click();
  await expect.poll(()=>requests.length).toBe(2);
  expect(requests).toEqual(['我设计过物流工具。','希望认识供应链负责人。']);
});

test('event assistant opens the existing twenty-person activity workflow',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'打开全局 AI 助手'}).click();
  await page.getByRole('button',{name:/瞄准关键联系人/}).click();await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByRole('dialog')).toContainText('最多 20 位嘉宾');
  await page.getByRole('button',{name:'开始活动准备'}).click();
  await expect(page.getByLabel('活动名称')).toBeFocused();
});

test('assistant routes material, module, style, and share tasks to existing card stages',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'打开全局 AI 助手'}).click();await page.getByRole('dialog').getByRole('button',{name:/整理文件或语音材料/}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByLabel('选择本地文件')).toBeVisible();
  await page.getByRole('button',{name:'打开全局 AI 助手'}).click();await page.getByRole('dialog').getByRole('button',{name:/创建展示模块/}).click();await expect(page).toHaveURL(/\/vip$/);await expect(page.locator('#vip-manual-text')).toBeVisible();
  await page.getByRole('button',{name:'打开全局 AI 助手'}).click();await page.getByRole('dialog').getByRole('button',{name:/挑选卡片风格/}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('#vip-template-picker-title')).toBeVisible();
  await page.getByRole('button',{name:'打开全局 AI 助手'}).click();await page.getByRole('dialog').getByRole('button',{name:/检查分享内容/}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.vip-share-section')).toBeInViewport();
});
