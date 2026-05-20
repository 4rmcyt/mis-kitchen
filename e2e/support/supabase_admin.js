import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../../.env.test'), 'utf-8');
    return Object.fromEntries(
      raw.split('\n')
        .filter(l => l.trim() && !l.startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
        .filter(([k]) => k)
    );
  } catch { return {}; }
}

function adminClient() {
  const env = loadEnv();
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in .env.test');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// handle_new_user trigger requires a valid invite row — seed one before creating the auth user
const RESTAURANT_ID = '84a3f0ed-52a7-447f-bc6c-e409bfe75f60';
const ADMIN_PROFILE_ID = 'b1438004-76f4-4113-b5d8-035268a084e0';

export async function createTestUser({ email, password, role = 'cook', station = 'Grill', name = 'E2E Test Cook' }) {
  const supabase = adminClient();

  // delete any existing user with this email first (idempotent setup)
  await deleteTestUser(email);

  // clean up any stale invite
  await supabase.from('invites').delete().eq('email', email);

  // insert a valid invite so the trigger won't reject the new user
  const { error: inviteErr } = await supabase.from('invites').insert({
    restaurant_id: RESTAURANT_ID,
    invited_by: ADMIN_PROFILE_ID,
    email,
    role,
    station,
    token: `e2e-seed-${Date.now()}`,
    used: false,
    expires_at: new Date(Date.now() + 86400_000).toISOString(),
    source: 'e2e',
  });
  if (inviteErr) throw new Error(`createTestUser (invite seed) failed: ${inviteErr.message}`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, station },
  });
  if (error) throw new Error(`createTestUser failed: ${error.message}`);

  // patch the profile with name + password_set (trigger only sets id/restaurant_id/email/role/station)
  await supabase.from('profiles').update({ name, password_set: true }).eq('id', data.user.id);

  return data.user;
}

export async function deleteTestUser(email) {
  const supabase = adminClient();
  // fetch all pages until we find the user
  let page = 1;
  let userId = null;
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 }).catch(() => ({ data: null }));
    const users = data?.users ?? [];
    const found = users.find(u => u.email === email);
    if (found) { userId = found.id; break; }
    if (users.length < 1000) break;
    page++;
  }
  if (!userId) return;
  await supabase.from('invites').delete().eq('email', email);
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw new Error(`deleteTestUser failed: ${error.message}`);
}

export async function generateInviteLink(_email, { role = 'cook', station = 'Grill' } = {}) {
  const supabase = adminClient();
  const env = loadEnv();
  const appUrl = env.TEST_URL || 'http://localhost:5173';

  const token = `e2e-invite-${Date.now()}`;

  // clean up stale invites for this e2e token prefix
  await supabase.from('invites').delete().like('token', 'e2e-invite-%');

  await supabase.from('invites').insert({
    restaurant_id: RESTAURANT_ID,
    invited_by: ADMIN_PROFILE_ID,
    email: null,
    role,
    station,
    token,
    used: false,
    expires_at: new Date(Date.now() + 86400_000).toISOString(),
    source: 'e2e',
  });

  return `${appUrl}/join/${token}`;
}

export async function wipeE2EData() {
  const supabase = adminClient();
  await supabase.from('recipes').delete().like('name', 'E2E%');
  await supabase.from('day_templates').delete().like('name', 'E2E%');
  await supabase.from('tasks').delete().eq('source', 'e2e');
  await supabase.from('tasks').delete().like('text', 'E2E%');
  await supabase.from('invites').delete().eq('source', 'e2e');
  await supabase.from('invites').delete().like('token', 'e2e-invite-%');
  await deleteTestUser('e2e-test-cook@mis-kitchen.test').catch(() => {});
}

export async function resetUserPassword(email, newPassword) {
  const supabase = adminClient();
  const { data } = await supabase.auth.admin.listUsers();
  const user = data?.users?.find(u => u.email === email);
  if (!user) throw new Error(`User ${email} not found`);
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) throw new Error(`resetUserPassword failed: ${error.message}`);
}
