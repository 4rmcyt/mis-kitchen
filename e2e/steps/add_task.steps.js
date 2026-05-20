import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I tap the add task button', async function () {
  await this.page.click('.report-trigger, button[title="Add task"], button:has-text("＋")');
  await this.page.waitForTimeout(300);
});

Then('I should see the add task modal', async function () {
  await expect(this.page.locator('.modal').first()).toBeVisible({ timeout: 5_000 });
});

When('I fill in task text {string}', async function (text) {
  const input = this.page.locator('.modal input[type="text"], .modal textarea, .modal .form-input').first();
  await input.fill(text);
});

When('I submit the task form', async function () {
  await this.page.click('.modal button:has-text("Add"), .modal button[type="submit"], .modal .add-confirm');
  await this.page.waitForTimeout(1000);
});

Then('I should see {string} in the task list', async function (text) {
  await expect(this.page.locator(`.item-text:has-text("${text}")`)).toBeVisible({ timeout: 5_000 });
});

Then('I should see the add task button', async function () {
  await expect(this.page.locator('.report-trigger, button[title="Add task"]')).toBeVisible();
});
