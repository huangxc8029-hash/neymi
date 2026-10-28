import {expect,test} from '@playwright/test';

test('assistant has a stable entry and does not cover the card studio with rotating prompts',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.assistant-prompt')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/AI 名片助理/}).first()).toBeVisible();
  await page.getByRole('button',{name:/AI 名片助理/}).first().click();
  await expect(page.getByRole('dialog',{name:'AI 名片助理'})).toBeVisible();
});

test('assistant modal is keyboard-dismissible and creator route navigation retains draft',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:/AI 名片助理/}).first().click();
  const dialog=page.getByRole('dialog',{name:'AI 名片助理'});await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('告诉 AI 名片助理')).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  await expect(page.locator('.studio-ai-open')).toBeFocused();
});

test('card designer keeps attachment and recording controls beside the chat composer',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:/AI 名片助理/}).click();
  const dialog=page.getByRole('dialog',{name:'AI 名片助理'});
  await expect(dialog.getByRole('button',{name:'添加附件'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:/开始录音/})).toBeVisible();
  await dialog.getByRole('button',{name:/开始录音/}).click();
  await expect(dialog.getByLabel('手工转写 / 语音笔记')).toBeVisible();
  await expect(page).toHaveURL('/');
  await expect(dialog.getByLabel('告诉 AI 名片助理')).toBeVisible();
});

test('assistant is available from the card library and does not cover the studio with prompts',async({page})=>{
  await page.goto('/');await expect(page.locator('.assistant-prompt')).toHaveCount(0);
  await page.goto('/cards');await expect(page.getByRole('button',{name:'打开 AI 名片助理'})).toBeVisible();
});

test('person assistant confirms each payload, never resends history, and requires local fact approval',async({page})=>{
  page.setDefaultTimeout(6000);const requests:unknown[]=[];
  await page.route('**/v1/session',route=>route.fulfill({status:201,json:{expiresAt:'2026-10-26T00:00:00.000Z'}}));
  await page.route('**/v1/coach',async route=>{const body=route.request().postDataJSON();requests.push(body.context.text);await route.fulfill({status:200,json:{reply:'你希望和哪类人交流？',facts:[{id:'fact_assistant_candidate',text:'设计过物流工具',category:'experience',origin:'ai_extracted'}]}});});
  await page.goto('/prepare');await page.getByRole('button',{name:'打开 AI 名片助理'}).click();
  await page.getByRole('dialog').getByRole('button',{name:/关于自己的故事/}).click();
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
  await page.goto('/activity');await page.getByRole('button',{name:'打开 AI 名片助理'}).click();
  await page.getByRole('dialog').getByRole('button',{name:/瞄准关键联系人/}).click();await expect(page).toHaveURL(/\/activity$/);
  await expect(page.locator('.activity-page')).toContainText('单次最多 20 人');
  await expect(page.getByLabel('活动名称')).toBeVisible();
});

test('assistant opens the content editor step from its task menu',async({page})=>{
  await page.goto('/prepare');await page.getByRole('button',{name:'打开 AI 名片助理'}).click();await page.getByRole('dialog').getByRole('button',{name:/创建展示模块/}).click();
  await expect(page).toHaveURL('/');await expect(page.locator('.studio-workspace')).toHaveAttribute('data-active-step','personal');
});

test('assistant opens template selection from its task menu',async({page})=>{
  await page.goto('/prepare');await page.getByRole('button',{name:'打开 AI 名片助理'}).click();await page.getByRole('dialog').getByRole('button',{name:/挑选卡片风格/}).click();
  await expect(page).toHaveURL('/');await expect(page.locator('.studio-workspace')).toHaveAttribute('data-active-step','appearance');
});

test('assistant opens sharing review from its task menu',async({page})=>{
  await page.goto('/prepare');await page.getByRole('button',{name:'打开 AI 名片助理'}).click();await page.getByRole('dialog').getByRole('button',{name:/检查分享内容/}).click();
  await expect(page).toHaveURL('/');await expect(page.locator('.studio-workspace')).toHaveAttribute('data-active-step','visibility');await expect(page.locator('.studio-workspace')).toHaveAttribute('data-mobile-pane','preview');
});

test('assistant opens material import and voice capture on the prepare page',async({page})=>{
  await page.goto('/prepare');await page.getByRole('button',{name:'打开 AI 名片助理'}).click();await page.getByRole('dialog').getByRole('button',{name:/整理文件或语音材料/}).click();
  await expect(page).toHaveURL(/\/prepare$/);await expect(page.getByLabel('选择本地文件')).toBeVisible();
});
