import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Then('I should see the coverage matrix', async function () {
  await this.page.waitForTimeout(1500);
  await expect(this.page.locator('.coverage-matrix')).toBeVisible({ timeout: 10_000 });
});

When('I open the first user in the list', async function () {
  await this.page.waitForTimeout(1500);
  await this.page.locator('.data-table tbody tr').first().click();
  await this.page.waitForTimeout(500);
});

Then('I should see the secondary stations selector', async function () {
  await expect(this.page.getByText('Also trained for')).toBeVisible({ timeout: 5_000 });
});
