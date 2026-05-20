import { TEST_URL, ADMIN_EMAIL, ADMIN_PASSWORD, TEST_COOK_EMAIL, TEST_COOK_PASSWORD } from './world.js';
import { writeFileSync } from 'fs';

export async function loginAs(page, role) {
  const email = role === 'admin' ? ADMIN_EMAIL : TEST_COOK_EMAIL;
  const password = role === 'admin' ? ADMIN_PASSWORD : TEST_COOK_PASSWORD;

  await page.goto(TEST_URL);
  await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForFunction(
    () => !document.querySelector('input[type="email"]'),
    { timeout: 20_000 }
  );

  try {
    await page.waitForSelector('.screen-title, .nav-btn, .bottom-nav', { timeout: 10_000 });
  } catch {
    const html = await page.content();
    writeFileSync('/tmp/e2e-login-debug.html', html);
    throw new Error(`Login failed for ${role} (${email}). URL: ${page.url()}. HTML: /tmp/e2e-login-debug.html`);
  }
}
