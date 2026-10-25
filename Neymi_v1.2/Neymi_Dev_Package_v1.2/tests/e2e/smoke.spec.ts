import { expect, test } from '@playwright/test';

test('the card workspace is visible without sign-in', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /把这次交流/ })).toBeVisible();
  await expect(page.getByRole('region', { name: '示例名片' })).toBeVisible();
  await expect(page.getByRole('group', { name: '联系方式示意' })).toContainText('WhatsApp');
  await expect(page.getByRole('link', { name: 'AI 助手' })).toHaveAttribute('href', '/prepare');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});
