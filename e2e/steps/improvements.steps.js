import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I navigate to Admin Wins tab', async function () {
  await this.page.click('.admin-btn');
  await this.page.waitForSelector('.admin-app', { timeout: 10_000 });
  await this.page.locator('.nav-item').filter({ hasText: 'Wins' }).first().click();
  await this.page.waitForTimeout(500);
});

Then('I should see the improvements tab', async function () {
  await expect(this.page.locator('.improvement-log-list')).toBeVisible({ timeout: 10_000 });
});

When('I post an improvement {string}', async function (text) {
  await this.page.locator('input[placeholder*="improve"]').fill(text);
  await this.page.getByRole('button', { name: 'Post' }).click();
  await this.page.waitForTimeout(1000);
});

Then('I should see the improvement in the list', async function () {
  await expect(
    this.page.locator('.improvement-log-list').getByText('Reduced opening checklist time by 5 minutes')
  ).toBeVisible({ timeout: 10_000 });
});
