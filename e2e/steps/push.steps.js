import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL } from '../support/world.js';

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

Then('the app saves a push subscription to the database for the admin user', { timeout: 20_000 }, async function () {
  // Wait for the app to settle after login and subscribePush() to complete its upsert
  await this.page.waitForSelector('text=Today', { timeout: 15_000 });
  await this.page.waitForTimeout(3_000);

  const supabase = adminClient();
  const { data: users } = await supabase.auth.admin.listUsers();
  const adminUser = users?.users?.find(u => u.email === ADMIN_EMAIL);
  expect(adminUser, `Admin user ${ADMIN_EMAIL} not found in auth`).toBeTruthy();

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint')
    .eq('user_id', adminUser.id);

  expect(error).toBeNull();
  expect(subs?.length, `Expected push subscription in DB for ${ADMIN_EMAIL}, got 0`).toBeGreaterThan(0);
});

