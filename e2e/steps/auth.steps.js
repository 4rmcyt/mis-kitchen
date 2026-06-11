import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { TEST_URL, ADMIN_EMAIL, ADMIN_PASSWORD, TEST_COOK_EMAIL, TEST_COOK_PASSWORD } from '../support/world.js';

Given('I am on the login page', async function () {
  await this.page.goto(TEST_URL);
  await this.page.waitForSelector('input[type="email"]', { timeout: 15_000 });
});

When('I log in as admin', async function () {
  await this.page.fill('input[type="email"]', ADMIN_EMAIL);
  await this.page.fill('input[type="password"]', ADMIN_PASSWORD);
  await this.page.click('button[type="submit"]');
});

When('I log in as cook', async function () {
  await this.page.fill('input[type="email"]', TEST_COOK_EMAIL);
  await this.page.fill('input[type="password"]', TEST_COOK_PASSWORD);
  await this.page.click('button[type="submit"]');
});

When('I enter email {string} and password {string}', async function (email, password) {
  await this.page.fill('input[type="email"]', email);
  await this.page.fill('input[type="password"]', password);
});

When('I click Sign In', async function () {
  await this.page.click('button[type="submit"]');
});

Then('I should see the Today screen', async function () {
  await this.page.waitForSelector('.screen-title:has-text("Today")', { timeout: 15_000 });
});

Then('I should see the ADMIN button', async function () {
  await expect(this.page.locator('text=ADMIN')).toBeVisible();
});

Then('I should not see the ADMIN button', async function () {
  await expect(this.page.locator('text=ADMIN')).not.toBeVisible();
});

Then('I should see a login error', async function () {
  await this.page.waitForTimeout(3000);
  // Login.jsx renders error in inline-styled div with no class — match by text content
  const error = this.page.getByText(/invalid|incorrect|wrong|error/i).first();
  await expect(error).toBeVisible();
});
