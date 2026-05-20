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
const RESTAURANT_ID = '046be746-9d16-4488-9cb3-31c67d4d965e';
const ADMIN_PROFILE_ID = 'b1438004-76f4-4113-b5d8-035268a084e0';

export async function createTestUser({ email, password, role = 'cook', station = 'Grill', name = 'E2E Test Cook' }) {
  const supabase = adminClient();

  // clean up any stale invite first
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
  const { data } = await supabase.auth.admin.listUsers();
  const user = data?.users?.find(u => u.email === email);
  if (!user) return;
  await supabase.auth.admin.deleteUser(user.id);
  await supabase.from('invites').delete().eq('email', email);
}

export async function resetUserPassword(email, newPassword) {
  const supabase = adminClient();
  const { data } = await supabase.auth.admin.listUsers();
  const user = data?.users?.find(u => u.email === email);
  if (!user) throw new Error(`User ${email} not found`);
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) throw new Error(`resetUserPassword failed: ${error.message}`);
}
