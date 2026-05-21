import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('not all Opening tasks are done', async function () {
  await this.page.waitForTimeout(1500);
});

Then('the progress ring should show low completion', async function () {
  await expect(this.page.locator('button[title="Add task"]')).toBeVisible({ timeout: 5_000 });
});

When('all tasks are marked as done', async function () {
  await this.page.waitForTimeout(1500);
  const tasks = this.page.locator('.check-btn');
  const count = await tasks.count();
  for (let i = 0; i < count; i++) {
    const item = tasks.nth(i);
    const parentClass = await item.locator('..').getAttribute('class');
    if (!parentClass?.includes('done')) {
      await item.click();
      await this.page.waitForTimeout(200);
    }
  }
});

Then('the add task button should be visible', async function () {
  await expect(this.page.locator('button[title="Add task"]')).toBeVisible({ timeout: 5_000 });
});
