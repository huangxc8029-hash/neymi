import {expect,test} from '@playwright/test';

test('global assistant prompt rotates once and pauses while an input is focused',async({page})=>{
  await page.clock.install();await page.goto('/');
  const prompt=page.locator('.assistant-prompt');
  await expect(prompt).toContainText('告诉我你要见谁');
  await page.getByLabel('展示名称').focus();await page.clock.fastForward(21_000);
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
  await dialog.getByRole('button',{name:/为一个人准备/}).click();
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
