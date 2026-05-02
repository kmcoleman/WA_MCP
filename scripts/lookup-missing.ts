const TOKEN_URL = 'https://oauth.wildapricot.org/auth/token';
const API_BASE = 'https://api.wildapricot.org/v2.2';
const accountId = process.env.WILDAPRICOT_ACCOUNT_ID as string;
const apiKey = process.env.WILDAPRICOT_API_KEY as string;

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

async function apiGet(token: string, url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  let data = (await res.json()) as any;
  while (data.State === 'Waiting' || data.State === 'Processing') {
    await new Promise(r => setTimeout(r, 500));
    const pollRes = await fetch(data.ResultUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    data = (await pollRes.json()) as any;
  }
  return data;
}

function getField(contact: any, ...fieldNames: string[]): string {
  for (const name of fieldNames) {
    const fv = contact.FieldValues?.find((f: any) =>
      f.FieldName.toLowerCase().includes(name.toLowerCase()) ||
      (f.SystemCode || '').toLowerCase().includes(name.toLowerCase())
    );
    if (fv?.Value) {
      if (typeof fv.Value === 'object' && fv.Value !== null) {
        return fv.Value.Label || fv.Value.Value || JSON.stringify(fv.Value);
      }
      return String(fv.Value);
    }
  }
  return '';
}

async function main() {
  const token = await getToken();

  const searches = [
    { term: 'Hargrove', type: 'last' },
    { term: 'Selden', type: 'last' },
    { term: 'Seld', type: 'lastSubstring' },
    { term: 'Hargrov', type: 'lastSubstring' },
  ];

  for (const s of searches) {
    await new Promise(r => setTimeout(r, 200));
    let filter: string;
    if (s.type === 'last') {
      filter = `LastName eq '${s.term}'`;
    } else {
      filter = `substringof('${s.term}', LastName)`;
    }
    const url = `${API_BASE}/accounts/${accountId}/contacts?$filter=${encodeURIComponent(filter)}&$top=10`;
    const data = await apiGet(token, url);
    const contacts = data.Contacts || [];
    console.log(`\nSearch "${s.term}" (${s.type}): ${contacts.length} results`);
    for (const c of contacts) {
      const addr = getField(c, 'address', 'street');
      const city = getField(c, 'city');
      const state = getField(c, 'state', 'province');
      const zip = getField(c, 'zip', 'postal');
      console.log(`  ${c.FirstName} ${c.LastName} | ${addr} | ${city} | ${state} | ${zip}`);
    }
  }
}

main().catch(console.error);
