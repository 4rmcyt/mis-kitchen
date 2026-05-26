import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I navigate to Admin Velocity tab', async function () {
  await this.page.click('.admin-btn');
  await this.page.waitForSelector('.admin-app', { timeout: 10_000 });
  await this.page.locator('.nav-item').filter({ hasText: 'Velocity' }).first().click();
  await this.page.waitForTimeout(500);
});

Then('I should see the velocity tab', async function () {
  await this.page.waitForTimeout(1500);
  // Range selector is always visible
  await expect(this.page.locator('.seg-btn').filter({ hasText: '30d' })).toBeVisible({ timeout: 10_000 });
});

Then('I should see the velocity empty state or heatmap', async function () {
  await this.page.waitForTimeout(2000);
  const hasHeatmap = await this.page.locator('.velocity-heatmap').isVisible().catch(() => false);
  const hasEmpty   = await this.page.getByText('No data yet').isVisible().catch(() => false);
  if (!hasHeatmap && !hasEmpty) {
    throw new Error('Velocity tab: expected either heatmap or empty state to be visible');
  }
});
