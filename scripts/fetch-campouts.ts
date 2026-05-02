import { writeFileSync, existsSync, readFileSync } from 'fs';

const TOKEN_URL = 'https://oauth.wildapricot.org/auth/token';
const API_BASE = 'https://api.wildapricot.org/v2.2';
const accountId = process.env.WILDAPRICOT_ACCOUNT_ID as string;
const apiKey = process.env.WILDAPRICOT_API_KEY as string;
const CACHE_FILE = 'scripts/campouts-raw.json';

async function getToken(): Promise<string> {
  const creds = Buffer.from(`APIKEY:${apiKey}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=auto',
  });
  const d = (await res.json()) as { access_token: string };
  return d.access_token;
}

async function apiGet(token: string, url: string, retries = 5): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (res.status === 429) {
      const wait = Math.pow(2, attempt + 1) * 2000;
      console.error(`  Rate limited, waiting ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`API error: ${res.status} ${await res.text()}`);
    let data = (await res.json()) as any;
    while (data.State === 'Waiting' || data.State === 'Processing') {
      await new Promise(r => setTimeout(r, 1000));
      const pollRes = await fetch(data.ResultUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      data = (await pollRes.json()) as any;
    }
    return data;
  }
  throw new Error('Max retries exceeded');
}

// STEP 1: Fetch all events with pagination
async function fetchAllEvents(token: string): Promise<any[]> {
  const allEvents: any[] = [];
  let skip = 0;
  const top = 100;

  while (true) {
    const params = new URLSearchParams({
      '$filter': 'StartDate ge 2016-01-01',
      '$top': top.toString(),
      '$skip': skip.toString(),
    });
    const url = `${API_BASE}/accounts/${accountId}/events?${params}`;
    console.error(`Fetching events skip=${skip}...`);
    const data = await apiGet(token, url);
    const events = data.Events || [];
    allEvents.push(...events);
    console.error(`  Got ${events.length} events (total: ${allEvents.length})`);
    if (events.length < top) break;
    skip += top;
    await new Promise(r => setTimeout(r, 1000));
  }

  return allEvents;
}

// STEP 2: Filter campouts
function filterCampouts(events: any[]): any[] {
  return events
    .filter((e: any) => (e.Tags || []).some((t: string) => /campout/i.test(t)))
    .sort((a: any, b: any) => a.StartDate.localeCompare(b.StartDate));
}

// STEP 3: Fetch details one by one with delay
async function fetchCampoutDetails(token: string, campouts: any[]): Promise<any[]> {
  const detailed: any[] = [];

  for (let i = 0; i < campouts.length; i++) {
    const e = campouts[i];
    console.error(`Fetching detail ${i + 1}/${campouts.length}: ${e.Name} (ID: ${e.Id})...`);

    // Wait 2 seconds between each detail request
    await new Promise(r => setTimeout(r, 2000));

    const detailUrl = `${API_BASE}/accounts/${accountId}/events/${e.Id}`;
    const detail = await apiGet(token, detailUrl);

    detailed.push({
      id: detail.Id,
      name: detail.Name,
      startDate: detail.StartDate,
      endDate: detail.EndDate,
      location: detail.Location || '',
      tags: detail.Tags || [],
      descriptionHtml: detail.Details?.DescriptionHtml || detail.DescriptionHtml || '',
    });
  }

  return detailed;
}

async function main() {
  const token = await getToken();

  // Check if we have cached data already
  if (existsSync(CACHE_FILE)) {
    console.error(`Cache file ${CACHE_FILE} exists. Delete it to re-fetch.`);
    const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    console.log(`Loaded ${cached.length} campouts from cache.`);
    for (const c of cached) {
      console.log(`  ${c.startDate?.substring(0, 10)} | ${c.name} | ${c.location}`);
    }
    return;
  }

  // Step 1: Get all events
  const allEvents = await fetchAllEvents(token);
  console.error(`\nTotal events since 2016: ${allEvents.length}`);

  // Step 2: Filter campouts
  const campouts = filterCampouts(allEvents);
  console.error(`Campout events: ${campouts.length}\n`);

  // List them first
  for (const c of campouts) {
    console.log(`  ${c.StartDate?.substring(0, 10)} | ${c.Name} | ${c.Location || '(no location)'}`);
  }

  // Step 3: Fetch details one by one
  console.error('\nFetching individual event details...');
  const detailed = await fetchCampoutDetails(token, campouts);

  // Save to cache
  writeFileSync(CACHE_FILE, JSON.stringify(detailed, null, 2));
  console.error(`\nSaved ${detailed.length} campout details to ${CACHE_FILE}`);
}

main().catch(console.error);
