import { expect, test } from '@playwright/test';

test('the card workspace is visible without sign-in', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '名片工作室' })).toBeVisible();
  await expect(page.getByRole('complementary').getByRole('heading', { name: '你的名片' })).toBeVisible();
  await expect(page.getByRole('complementary').getByText('填写展示名称后，名片会显示在这里。').first()).toBeVisible();
  await expect(page.getByRole('navigation',{name:'名片制作步骤'}).getByRole('button',{name:/基础信息/})).toBeVisible();
  await expect(page.getByRole('button',{name:/AI 名片助理/}).first()).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});
