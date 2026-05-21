import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Then('I should see the report button', async function () {
  await expect(this.page.locator('button[title="Send report"]')).toBeVisible({ timeout: 10_000 });
});

When('I click the report button', async function () {
  await this.page.locator('button[title="Send report"]').click();
  await this.page.waitForTimeout(300);
});

Then('I should see the report modal', async function () {
  await expect(this.page.getByText('End of Shift Report')).toBeVisible({ timeout: 5_000 });
});

Then('I should see my completion percentage', async function () {
  await expect(this.page.locator('.report-pct')).toBeVisible({ timeout: 5_000 });
});

When('I click Send Report', async function () {
  await this.page.getByText('Save & Send Report').click();
});

Then('I should see report sent confirmation', async function () {
  await expect(this.page.locator('.report-sent')).toBeVisible({ timeout: 15_000 });
});
