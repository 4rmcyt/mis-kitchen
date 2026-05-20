import { setWorldConstructor, setDefaultTimeout, Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createTestUser, deleteTestUser } from './supabase_admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvTest() {
  try {
    const raw = readFileSync(resolve(__dirname, '../../.env.test'), 'utf-8');
    return Object.fromEntries(
      raw.split('\n')
        .filter(l => l.trim() && !l.startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
        .filter(([k]) => k)
    );
  } catch {
    return {};
  }
}

const env = loadEnvTest();
Object.entries(env).forEach(([k, v]) => { if (!process.env[k]) process.env[k] = v; });

export const TEST_URL = env.TEST_URL || 'http://localhost:5173';
export const ADMIN_EMAIL = env.TEST_ADMIN_EMAIL;
export const ADMIN_PASSWORD = env.TEST_ADMIN_PASSWORD;
export const TEST_COOK_EMAIL = 'e2e-cook@gmail.com';
export const TEST_COOK_PASSWORD = 'E2eTestPass@2026';

setDefaultTimeout(30_000);

class KitchenWorld {
  browser = null;
  context = null;
  page = null;

  async init() {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      || process.env.CHROME_PATH
      || undefined;
    const headless = process.env.E2E_HEADLESS !== 'false';
    this.browser = await chromium.launch({
      headless,
      slowMo: headless ? 0 : 100,
      ...(executablePath ? { executablePath } : {}),
    });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    this.page.on('dialog', d => d.accept());
  }

  async close() {
    await this.browser?.close();
  }
}

setWorldConstructor(KitchenWorld);

BeforeAll(async function () {
  await deleteTestUser(TEST_COOK_EMAIL).catch(() => {});
  await createTestUser({ email: TEST_COOK_EMAIL, password: TEST_COOK_PASSWORD });
});

AfterAll(async function () {
  await deleteTestUser(TEST_COOK_EMAIL).catch(() => {});
});

Before(async function () {
  await this.init();
});

After(async function () {
  await this.close();
});
