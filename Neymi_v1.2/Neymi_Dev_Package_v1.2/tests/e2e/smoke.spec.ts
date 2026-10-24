import { expect, test } from '@playwright/test';

test('the foundation preview is readable without sign-in', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /让对方，\s*记住你的不同。/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '工程基础正在搭建' })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});
