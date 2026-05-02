/**
 * Update event by fetching full event, replacing description, and PUTting entire object back
 */
import { readFileSync } from 'fs';

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
  const eventId = parseInt(process.argv[2] || '6569422');
  const htmlFileName = process.argv[3] || 'preview-slowride.html';

  // Read the HTML file and extract just the body content
  const htmlFile = readFileSync(new URL(`./${htmlFileName}`, import.meta.url), 'utf-8');
  const bodyMatch = htmlFile.match(/<body>\s*([\s\S]*?)\s*<\/body>/);
  if (!bodyMatch) throw new Error('Could not extract body content from HTML');
  const descriptionHtml = bodyMatch[1].trim();

  const token = await getToken();
  const url = `${API_BASE}/accounts/${accountId}/events/${eventId}`;

  // Step 1: Fetch the full current event
  console.log(`Fetching event ${eventId}...`);
  const getResponse = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  if (!getResponse.ok) {
    const errText = await getResponse.text();
    console.error(`Fetch error ${getResponse.status}: ${errText}`);
    process.exit(1);
  }
  const event = await getResponse.json() as Record<string, any>;
  console.log(`Fetched: "${event.Name}"`);

  // Step 2: Replace the description in the full event object
  event.Details.DescriptionHtml = descriptionHtml;
  console.log(`Replacing description (${descriptionHtml.length} chars)...`);

  // Step 3: PUT the full event back
  const putResponse = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!putResponse.ok) {
    const errText = await putResponse.text();
    console.error(`PUT error ${putResponse.status}: ${errText}`);
    process.exit(1);
  }

  const result = await putResponse.json() as Record<string, any>;
  console.log('Success! Event updated.');
  console.log(`Event name: ${result.Name}`);
  console.log(`Description length: ${result.Details?.DescriptionHtml?.length || 0}`);
  console.log(`Contains new content: ${result.Details?.DescriptionHtml?.includes('#0066B1') || false}`);
}

main().catch(e => { console.error(e); process.exit(1); });
