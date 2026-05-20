import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I navigate to Lineup tab', async function () {
  await this.page.locator('.nav-btn').filter({ hasText: 'Lineup' }).click();
  await this.page.waitForTimeout(1500);
});

Then('I should see staff grouped by station', async function () {
  const stations = this.page.locator('.lineup-station');
  await expect(stations.first()).toBeVisible({ timeout: 10_000 });
});

Then('each station should show a staff count', async function () {
  const counts = this.page.locator('.lineup-station-count');
  const n = await counts.count();
  expect(n).toBeGreaterThan(0);
});
