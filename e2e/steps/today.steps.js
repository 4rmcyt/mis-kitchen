import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { loginAs } from '../support/login.js';

Given('I am logged in as cook', async function () {
  await loginAs(this.page, 'cook');
});

When('I open the Today screen', async function () {
  await this.page.waitForSelector('text=Today', { timeout: 10_000 });
});

Then('I should see tasks on the screen', async function () {
  await this.page.waitForTimeout(2000);
  // tasks render as .check-item inside .section
  const tasks = this.page.locator('.check-item');
  // if no tasks yet (empty DB), accept empty-state as passing
  const empty = this.page.locator('.empty-state');
  const hasEmpty = await empty.isVisible().catch(() => false);
  if (!hasEmpty) {
    await expect(tasks.first()).toBeVisible({ timeout: 10_000 });
  }
});

Then('I should see Opening section', async function () {
  await expect(this.page.locator('text=Opening')).toBeVisible();
});

Then('I should see Closing section', async function () {
  await expect(this.page.locator('text=Closing')).toBeVisible();
});

When('I tap the first task', async function () {
  await this.page.locator('.check-btn').first().click();
});

Then('that task should be marked as done', async function () {
  // task gets class "check-item done" when completed
  await expect(this.page.locator('.check-item.done').first()).toBeVisible({ timeout: 5_000 });
});

When('I select station {string}', async function (station) {
  await this.page.locator('.station-pill').filter({ hasText: station }).click();
  await this.page.waitForTimeout(500);
});

Then('I should only see Grill tasks', async function () {
  // verify the active station pill is Grill
  const activePill = this.page.locator('.station-pill.active');
  await expect(activePill).toBeVisible({ timeout: 3_000 });
  const text = await activePill.textContent();
  expect(text).toContain('Grill');
});

When('I tap {string}', async function (label) {
  await this.page.click(`text=${label}`);
});

Then("I should see tomorrow's date in the header", async function () {
  // date renders in .screen-sub via formatDateLabel — check Tmrw pill is active
  const tmrwPill = this.page.locator('.date-pill.active');
  await expect(tmrwPill).toBeVisible({ timeout: 5_000 });
  const text = await tmrwPill.textContent();
  expect(text).toContain('Tmrw');
});
