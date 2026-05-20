import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { loginAs } from '../support/login.js';

Given('I am logged in as admin', async function () {
  await loginAs(this.page, 'admin');
});

When('I click the ADMIN button', async function () {
  await this.page.click('.admin-btn');
});

Then('I should see the Admin panel', async function () {
  await this.page.waitForSelector('.admin-app', { timeout: 10_000 });
});

Then('I should see the People tab', async function () {
  await expect(this.page.locator('.nav-item').filter({ hasText: 'People' }).first()).toBeVisible();
});

When('I navigate to Admin People tab', async function () {
  await this.page.click('.admin-btn');
  await this.page.waitForSelector('.admin-app', { timeout: 10_000 });
  await this.page.locator('.nav-item').filter({ hasText: 'People' }).first().click();
  await this.page.waitForTimeout(500);
});

Then('I should see a list of users', async function () {
  await this.page.waitForTimeout(1500);
  await expect(this.page.locator('.data-table tr').first()).toBeVisible({ timeout: 10_000 });
});

When('I navigate to Admin Tasks tab', async function () {
  await this.page.click('.admin-btn');
  await this.page.waitForSelector('.admin-app', { timeout: 10_000 });
  await this.page.locator('.nav-item').filter({ hasText: 'Tasks' }).first().click();
  await this.page.waitForTimeout(500);
});

Then('I should see the templates list', async function () {
  await this.page.waitForTimeout(1500);
  // templates render as inline-styled divs — look for stat-card with "Templates" label
  await expect(this.page.locator('.stat-lbl').filter({ hasText: 'Templates' })).toBeVisible({ timeout: 10_000 });
});

When('I navigate to Admin Recipes tab', async function () {
  await this.page.click('.admin-btn');
  await this.page.waitForSelector('.admin-app', { timeout: 10_000 });
  await this.page.locator('.nav-item').filter({ hasText: 'Recipes' }).first().click();
  await this.page.waitForTimeout(500);
});

Then('I should see the recipes list', async function () {
  await this.page.waitForTimeout(1500);
  await expect(this.page.locator('.stat-lbl').filter({ hasText: 'Recipes' })).toBeVisible({ timeout: 10_000 });
});
