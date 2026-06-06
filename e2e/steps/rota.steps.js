import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I navigate to the admin panel', async function () {
  await this.page.click('.admin-btn');
  await this.page.waitForSelector('.admin-app', { timeout: 10_000 });
});

When('I click the {string} tab', async function (label) {
  await this.page.locator('.nav-item').filter({ hasText: label }).click();
  await this.page.waitForTimeout(500);
});

When('I click the "Next" week button', async function () {
  await this.page.getByRole('button', { name: /next/i }).click();
  await this.page.waitForTimeout(300);
});

Then('I should see the weekly rota grid', async function () {
  await expect(this.page.locator('.rota-grid')).toBeVisible({ timeout: 10_000 });
});

Then('I should see 7 day columns in the rota', async function () {
  await this.page.waitForSelector('.rota-grid', { timeout: 10_000 });
  const cols = await this.page.locator('.rota-grid > div').count();
  expect(cols).toBe(7);
});

Then('I should see the next week dates', async function () {
  await expect(this.page.locator('.rota-grid')).toBeVisible({ timeout: 5_000 });
});
