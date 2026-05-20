import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { loginAs } from '../support/login.js';
import { clearInbox, getLastEmail, extractLinkFromEmail } from '../support/mailtrap.js';
import { TEST_URL } from '../support/world.js';

const TEST_INVITE_EMAIL = 'e2e-test-cook@mis-kitchen.test';

Before({ tags: '@invite' }, async function () {
  await clearInbox();
});

After({ tags: '@invite' }, async function () {
  await clearInbox();
});

When('I fill in invite email {string}', async function (email) {
  // open invite modal if not already open
  const inviteModal = this.page.locator('input[placeholder="cook@restaurant.io"]');
  if (!await inviteModal.isVisible()) {
    await this.page.getByRole('button', { name: /Invite/ }).first().click();
    await this.page.waitForTimeout(300);
  }
  await this.page.fill('input[placeholder="cook@restaurant.io"]', email);
});

When('I select invite role {string}', async function (role) {
  // first .form-sel in invite modal is the role select
  await this.page.locator('.form-sel').first().selectOption({ value: role });
});

When('I select invite station {string}', async function (station) {
  const selects = this.page.locator('.form-sel');
  await selects.last().selectOption(station);
});

When('I click Send Invite', async function () {
  await this.page.click('button:has-text("Send Invite"), button:has-text("Invite")');
  await this.page.waitForTimeout(2000);
});

Then('I should see invite confirmation for {string}', async function (email) {
  await expect(this.page.locator(`text=${email}`)).toBeVisible({ timeout: 5_000 });
});

Given('an invite was sent to {string}', async function (email) {
  await loginAs(this.page, 'admin');
  await this.page.click('.admin-btn');
  await this.page.waitForSelector('.admin-app', { timeout: 10_000 });
  await this.page.locator('.nav-item').filter({ hasText: 'People' }).first().click();
  await this.page.waitForTimeout(500);
  await this.page.getByRole('button', { name: /Invite/ }).first().click();
  await this.page.waitForTimeout(300);
  await this.page.fill('input[placeholder="cook@restaurant.io"]', email);
  const selects = this.page.locator('.form-sel');
  await selects.first().selectOption('cook');
  await selects.last().selectOption('Grill');
  await this.page.getByRole('button', { name: 'Send Invite' }).click();
  await this.page.waitForTimeout(2000);
});

Then('Mailtrap should receive an email to {string}', async function (email) {
  const msg = await getLastEmail(email, { timeoutMs: 20_000 });
  this.inviteMessage = msg;
  expect(msg).toBeTruthy();
});

Then('the email should contain an invite link', async function () {
  const link = await extractLinkFromEmail(this.inviteMessage.id);
  expect(link).toMatch(/https?:\/\//);
  this.inviteLink = link;
});

When('I follow the invite link from the email', async function () {
  const msg = await getLastEmail(TEST_INVITE_EMAIL, { timeoutMs: 20_000 });
  const link = await extractLinkFromEmail(msg.id);
  expect(link).toBeTruthy();
  this.inviteLink = link;
  await this.page.goto(link);
  await this.page.waitForTimeout(2000);
});

Then('I should see the password setup screen', async function () {
  await expect(this.page.locator('text=Create your password')).toBeVisible({ timeout: 10_000 });
});

When('I set password {string}', async function (password) {
  const inputs = this.page.locator('input[type="password"]');
  await inputs.first().fill(password);
  await inputs.last().fill(password);
  await this.page.click('button:has-text("Set password")');
  await this.page.waitForTimeout(1500);
});

Then('I should see the welcome screen', async function () {
  await expect(this.page.locator('text=Welcome to the kitchen')).toBeVisible({ timeout: 8_000 });
});

When('I proceed through onboarding with name {string} and station {string}', async function (name, station) {
  await this.page.click('button:has-text("Get started")');
  await this.page.waitForTimeout(500);
  await this.page.fill('input[placeholder="Your name"]', name);
  await this.page.click('button:has-text("Next")');
  await this.page.waitForTimeout(500);
  await this.page.click(`button:has-text("${station}")`);
  await this.page.click('button:has-text("Done")');
  await this.page.waitForTimeout(2000);
});
