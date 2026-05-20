import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I click {string}', async function (label) {
  await this.page.getByRole('button', { name: label }).first().click();
  await this.page.waitForTimeout(300);
});

When('I fill in template name {string}', async function (name) {
  await this.page.fill('input[placeholder*="Template name"]', name);
});

When('I save the template', async function () {
  await this.page.getByRole('button', { name: 'Create' }).first().click();
  await this.page.waitForTimeout(1000);
});

Then('I should see {string} in the templates list', async function (name) {
  await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 8_000 });
});

When('I open template {string}', async function (name) {
  await this.page.locator('.stat-lbl').filter({ hasText: 'Templates' }).waitFor({ timeout: 20_000 });
  await this.page.waitForTimeout(500);
  const item = this.page.getByText(name, { exact: true }).first();
  await item.waitFor({ timeout: 20_000 });
  await item.click();
  await this.page.waitForTimeout(400);
});

When('I fill in entry text {string}', async function (text) {
  await this.page.fill('input[placeholder="New task…"]', text);
});

When('I select entry station {string}', async function (station) {
  const selects = this.page.locator('select');
  await selects.first().selectOption(station);
});

When('I select entry section {string}', async function (section) {
  const selects = this.page.locator('select');
  const count = await selects.count();
  await selects.nth(count - 1).selectOption(section);
});

When('I click Add entry', async function () {
  await this.page.getByRole('button', { name: 'Add' }).first().click();
  await this.page.waitForTimeout(800);
});

Then('I should see {string} in the template entries', async function (text) {
  await expect(this.page.getByText(text).first()).toBeVisible({ timeout: 5_000 });
});

When('I click delete template', async function () {
  await this.page.locator('.btn-danger').first().click();
  await this.page.locator('[data-testid="confirm-delete"]').click();
  await this.page.waitForTimeout(1000);
});

Then('I should not see {string} in the templates list', async function (name) {
  await this.page.getByRole('button', { name: '← Back' }).waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
  await expect(this.page.getByText(name, { exact: true })).not.toBeVisible({ timeout: 5_000 });
});
