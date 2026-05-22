import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Then('the bottom nav should be fully visible', async function () {
  const nav = this.page.locator('nav.bottom-nav');
  await expect(nav).toBeVisible();
  const box = await nav.boundingBox();
  const viewport = this.page.viewportSize();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
});

Then('all nav buttons should be visible and not clipped', async function () {
  const buttons = this.page.locator('nav.bottom-nav button');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  const viewport = this.page.viewportSize();
  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  }
});

Then('the station filter should show all stations', async function () {
  const filter = this.page.locator('.station-filter');
  await expect(filter).toBeVisible();
  const pills = filter.locator('.station-pill');
  const count = await pills.count();
  expect(count).toBeGreaterThanOrEqual(6); // All + 5 stations min
});

Then('no station pill should be clipped', async function () {
  const filter = this.page.locator('.station-filter');
  const filterBox = await filter.boundingBox();
  const pills = filter.locator('.station-pill');
  const count = await pills.count();
  for (let i = 0; i < count; i++) {
    const box = await pills.nth(i).boundingBox();
    expect(box).not.toBeNull();
    // pill should not start before filter container
    expect(box.x).toBeGreaterThanOrEqual(filterBox.x - 1);
  }
});

Then('the logout button should be visible and not clipped', async function () {
  const btn = this.page.locator('.logout-btn');
  await expect(btn).toBeVisible();
  const box = await btn.boundingBox();
  const viewport = this.page.viewportSize();
  expect(box).not.toBeNull();
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
});
