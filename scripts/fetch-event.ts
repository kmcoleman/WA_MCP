/**
 * Quick script to fetch event data from Wild Apricot API
 * Usage: npx tsx scripts/fetch-event.ts <eventId>
 */
import { readFileSync } from 'fs';

// Load .env manually
const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([^#=]+?)\s*=\s*(.+?)\s*$/);
  if (match) env[match[1]] = match[2];
}

const TOKEN_URL = 'https://oauth.wildapricot.org/auth/token';
const API_BASE = 'https://api.wildapricot.org/v2.2';

const apiKey = env.WILDAPRICOT_API_KEY;
const accountId = env.WILDAPRICOT_ACCOUNT_ID;
const eventId = process.argv[2] || '6569423';

async function getToken(): Promise<string> {
  const credentials = Buffer.from(`APIKEY:${apiKey}`).toString('base64');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=auto',
  });
  if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
  const data = await response.json() as { access_token: string };
  return data.access_token;
}

async function main() {
  const token = await getToken();
  const url = `${API_BASE}/accounts/${accountId}/events/${eventId}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    const err = await response.text();
    console.error(`Error ${response.status}: ${err}`);
    process.exit(1);
  }
  const event = await response.json();
  console.log(JSON.stringify(event, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
