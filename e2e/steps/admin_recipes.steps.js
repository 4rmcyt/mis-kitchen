import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I fill in recipe name {string}', async function (name) {
  await this.page.fill('input[placeholder="Recipe name"]', name);
});

When('I select recipe station {string}', async function (station) {
  await this.page.locator('select').first().selectOption(station);
});

When('I save the recipe', async function () {
  await this.page.getByRole('button', { name: /Save|Create/ }).first().click();
  await this.page.waitForTimeout(1200);
});

Then('I should see {string} in the recipes list', async function (name) {
  await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 8_000 });
});

When('I open recipe {string}', async function (name) {
  // wait for recipes to load
  await this.page.locator('.stat-lbl').filter({ hasText: 'Recipes' }).waitFor({ timeout: 10_000 });
  await this.page.getByText(name).first().click();
  await this.page.waitForTimeout(400);
});

When('I change the recipe name to {string}', async function (name) {
  // clicking a recipe shows detail view — click Edit to enter edit mode
  const editBtn = this.page.getByRole('button', { name: 'Edit' }).first();
  if (await editBtn.isVisible()) await editBtn.click();
  await this.page.waitForTimeout(300);
  const input = this.page.locator('input[placeholder="Recipe name"]');
  await input.waitFor({ timeout: 5_000 });
  await input.click({ clickCount: 3 });
  await input.fill(name);
});

When('I click delete recipe', async function () {
  await this.page.locator('.btn-danger').first().click();
  await this.page.locator('[data-testid="confirm-delete"]').waitFor({ state: 'visible', timeout: 5_000 });
  await this.page.locator('[data-testid="confirm-delete"]').click();
  await this.page.waitForTimeout(1000);
});

Then('I should not see {string} in the recipes list', async function (name) {
  await this.page.waitForTimeout(500);
  await expect(this.page.getByText(name, { exact: true })).not.toBeVisible({ timeout: 8_000 });
});
