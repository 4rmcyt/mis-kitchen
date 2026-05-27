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
  // if we're in detail/edit view, go back to list first
  const backBtn = this.page.getByRole('button', { name: /← Back/ });
  if (await backBtn.isVisible()) await backBtn.click();
  await this.page.locator('.stat-lbl').filter({ hasText: 'Recipes' }).waitFor({ timeout: 10_000 });
  await this.page.getByText(name).first().click();
  await this.page.waitForTimeout(400);
});

When('I click edit recipe', async function () {
  await this.page.getByRole('button', { name: 'Edit' }).first().click();
  await this.page.waitForTimeout(300);
});

When('I change the recipe name to {string}', async function (name) {
  const editBtn = this.page.getByRole('button', { name: 'Edit' }).first();
  if (await editBtn.isVisible()) await editBtn.click();
  await this.page.waitForTimeout(300);
  const input = this.page.locator('input[placeholder="Recipe name"]');
  await input.waitFor({ timeout: 5_000 });
  await input.click({ clickCount: 3 });
  await input.fill(name);
});

When('I add ingredient {string} with amount {string} and unit {string}', async function (name, amount, unit) {
  await this.page.fill('input[placeholder="Ingredient"]', name);
  await this.page.fill('input[placeholder="Amt"]', amount);
  await this.page.locator('select.form-sel').selectOption(unit);
  await this.page.getByRole('button', { name: '+' }).first().click();
  await this.page.waitForTimeout(200);
});

When('I change ingredient {int} name to {string}', async function (index, name) {
  const nameInput = this.page.locator('.recipe-ing-name-inp').nth(index - 1);
  await nameInput.click({ clickCount: 3 });
  await nameInput.fill(name);
});

When('I change ingredient {int} amount to {string}', async function (index, amount) {
  const amountInput = this.page.locator('.recipe-ing-amt-inp').nth(index - 1);
  await amountInput.click({ clickCount: 3 });
  await amountInput.fill(amount);
});

When('I move ingredient {int} down', async function (index) {
  const downBtns = this.page.locator('button', { hasText: '▼' });
  await downBtns.nth(index - 1).click();
  await this.page.waitForTimeout(200);
});

Then('I should see ingredient {string} with amount {string}', async function (name, amount) {
  const nameInputs = this.page.locator('.recipe-ing-name-inp');
  const count = await nameInputs.count();
  let found = false;
  for (let i = 0; i < count; i++) {
    const val = await nameInputs.nth(i).inputValue();
    const amt = await this.page.locator('.recipe-ing-amt-inp').nth(i).inputValue();
    if (val === name && amt === amount) { found = true; break; }
  }
  expect(found).toBe(true);
});

Then('ingredient {int} should be {string}', async function (index, name) {
  const val = await this.page.locator('.recipe-ing-name-inp').nth(index - 1).inputValue();
  expect(val).toBe(name);
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
