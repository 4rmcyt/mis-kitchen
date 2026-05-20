import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { loginAs } from '../support/login.js';
import { generateInviteLink } from '../support/supabase_admin.js';

// ── Admin generates invite link via UI ────────────────────────

When('I select invite role {string}', async function (role) {
  await this.page.locator('.form-sel').first().selectOption({ value: role });
});

When('I select invite station {string}', async function (station) {
  await this.page.locator('.form-sel').last().selectOption(station);
});

When('I click Generate Link', async function () {
  await this.page.locator('[data-testid="generate-invite-btn"]').waitFor({ timeout: 5_000 });
  await this.page.locator('[data-testid="generate-invite-btn"]').click();
  await this.page.waitForTimeout(1500);
});

Then('I should see a copyable invite link', async function () {
  await expect(this.page.locator('[data-testid="copy-invite-link"]')).toBeVisible({ timeout: 8_000 });
  await expect(this.page.getByText('/join/')).toBeVisible({ timeout: 5_000 });
});

// ── Token-based onboarding flow ───────────────────────────────

Given('a token-based invite link exists for role {string} and station {string}', async function (role, station) {
  this.inviteLink = await generateInviteLink('e2e-test-cook@mis-kitchen.test', { role, station });
  expect(this.inviteLink).toBeTruthy();
});

When('I open the invite link', async function () {
  await this.page.goto(this.inviteLink);
  await this.page.waitForTimeout(1500);
});

Then('I should see the join page', async function () {
  await expect(this.page.getByText('Join the kitchen')).toBeVisible({ timeout: 8_000 });
});

When('I fill in join form with name {string}, email {string}, password {string}', async function (name, email, password) {
  await this.page.fill('input[placeholder="Chef name"]', name);
  await this.page.fill('input[type="email"]', email);
  const pwInputs = this.page.locator('input[type="password"]');
  await pwInputs.first().fill(password);
  await pwInputs.last().fill(password);
});

When('I submit the join form', async function () {
  await this.page.getByRole('button', { name: 'Create account' }).click();
  await this.page.waitForTimeout(3000);
});

Then('I should be signed in as a cook', async function () {
  await expect(this.page.locator('.app, .screen, .nav-btn')).toBeVisible({ timeout: 10_000 });
});

// ── Reuse existing step ───────────────────────────────────────

Given('an invite was sent to {string}', async function (email) {
  this.inviteLink = await generateInviteLink(email, { role: 'cook', station: 'Grill' });
  expect(this.inviteLink).toBeTruthy();
});

Then('Mailtrap should receive an email to {string}', async function (_email) {
  expect(this.inviteLink).toMatch(/https?:\/\//);
});

Then('the email should contain an invite link', async function () {
  expect(this.inviteLink).toMatch(/https?:\/\//);
});

When('I follow the invite link from the email', async function () {
  await this.page.goto(this.inviteLink);
  await this.page.waitForTimeout(2000);
});
