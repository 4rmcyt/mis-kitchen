import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvTest() {
  try {
    const raw = readFileSync(resolve(__dirname, '../../.env.test'), 'utf-8');
    return Object.fromEntries(
      raw.split('\n')
        .filter(l => l.trim() && !l.startsWith('#'))
        .map(l => l.split('=').map(s => s.trim()))
        .filter(([k]) => k)
    );
  } catch {
    return {};
  }
}

const env = loadEnvTest();
const BASE = 'https://sandbox.api.mailtrap.io/api/sandboxes';
const TOKEN = env.MAILTRAP_API_TOKEN;
const INBOX_ID = env.MAILTRAP_INBOX_ID;

function headers() {
  return { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
}

export async function getLastEmail(toAddress, { timeoutMs = 15_000, pollMs = 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/${INBOX_ID}/messages`, { headers: headers() });
    const messages = await res.json();
    const match = messages.find(m =>
      m.to_email === toAddress || m.to?.some?.(t => t.email === toAddress)
    );
    if (match) return match;
    await new Promise(r => setTimeout(r, pollMs));
  }
  throw new Error(`No email to ${toAddress} found within ${timeoutMs}ms`);
}

export async function getEmailBody(messageId) {
  const res = await fetch(`${BASE}/${INBOX_ID}/messages/${messageId}/body.html`, { headers: headers() });
  return res.text();
}

export async function extractLinkFromEmail(messageId, pattern = /https?:\/\/\S+/g) {
  const html = await getEmailBody(messageId);
  const text = html.replace(/<[^>]+>/g, ' ');
  const links = text.match(pattern) || [];
  return links[0] ?? null;
}

export async function clearInbox() {
  await fetch(`${BASE}/${INBOX_ID}/clean`, { method: 'PATCH', headers: headers() });
}
