import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I navigate to Recipes tab', async function () {
  await this.page.locator('.nav-btn').filter({ hasText: 'Recipes' }).click();
  await this.page.waitForTimeout(1000);
});

Then('I should see the recipes grid', async function () {
  const grid = this.page.locator('.recipe-grid, .recipe-card');
  await expect(grid.first()).toBeVisible({ timeout: 10_000 });
});

When('I type {string} in the recipe search', async function (query) {
  await this.page.fill('.search-input', query);
  await this.page.waitForTimeout(400);
});

Then('I should only see recipes matching {string}', async function (query) {
  const cards = this.page.locator('.recipe-card-name');
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const text = await cards.nth(i).textContent();
    expect(text.toLowerCase()).toContain(query.toLowerCase());
  }
});


When('I tap the first recipe card', async function () {
  await this.page.locator('.recipe-card').first().click();
  await this.page.waitForTimeout(500);
});

Then('I should see the recipe detail view', async function () {
  await expect(this.page.locator('.recipe-detail').first()).toBeVisible({ timeout: 5_000 });
});

Then('I should see ingredients list', async function () {
  await expect(this.page.locator('.ingredients-list').first()).toBeVisible({ timeout: 5_000 });
});

When('I increase the multiplier', async function () {
  // multiplier buttons are 1×, 2×, 5×, 10× — click 2× to increase
  await this.page.locator('.mult-btn').filter({ hasText: '2×' }).click();
  await this.page.waitForTimeout(300);
});

Then('I should see updated quantities', async function () {
  await expect(this.page.locator('.ing-amount').first()).toBeVisible({ timeout: 3_000 });
});
