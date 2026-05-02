const TOKEN_URL = 'https://oauth.wildapricot.org/auth/token';
const API_BASE = 'https://api.wildapricot.org/v2.2';
const accountId = process.env.WILDAPRICOT_ACCOUNT_ID!;
const apiKey = process.env.WILDAPRICOT_API_KEY!;

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
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  let data = await res.json() as any;

  // Handle async results - poll until complete
  while (data.State === 'Waiting' || data.State === 'Processing') {
    await new Promise(r => setTimeout(r, 500));
    const pollRes = await fetch(data.ResultUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    data = await pollRes.json() as any;
  }

  return data;
}

interface Contact {
  Id: number;
  FirstName: string;
  LastName: string;
  FieldValues: Array<{ FieldName: string; Value: any; SystemCode: string }>;
}

const names = [
  { firstName: 'Benjamin', lastName: 'Hargrove' },
  { firstName: 'Bill', lastName: 'Goodwin' },
  { firstName: 'Brian', lastName: 'Krautler' },
  { firstName: 'Christian', lastName: 'Thomas' },
  { firstName: 'Dan', lastName: 'Sakols' },
  { firstName: 'Jerry', lastName: 'Hanson' },
  { firstName: 'John', lastName: 'Parodi' },
  { firstName: 'Keith', lastName: 'Grandt' },
  { firstName: 'Klaus', lastName: 'Heine' },
  { firstName: 'Marc', lastName: 'Dubresson' },
  { firstName: 'Mark', lastName: 'Miller' },
  { firstName: 'Melinda', lastName: 'Irhazy' },
  { firstName: 'Michael', lastName: 'Murphy' },
  { firstName: 'Michelle', lastName: 'Lodwick' },
  { firstName: 'Nick', lastName: 'Rountree' },
  { firstName: 'Nicolas', lastName: 'Solberg' },
  { firstName: 'Richard', lastName: 'Martin' },
  { firstName: 'Richard', lastName: 'Wynter' },
  { firstName: 'Roger', lastName: 'Williams' },
  { firstName: 'Steve', lastName: 'Brakebill' },
  { firstName: 'Steve', lastName: 'Stein' },
  { firstName: 'William', lastName: 'Selden' },
];

function getField(contact: Contact, ...fieldNames: string[]): string {
  for (const name of fieldNames) {
    const fv = contact.FieldValues?.find(f =>
      f.FieldName.toLowerCase().includes(name.toLowerCase()) ||
      f.SystemCode?.toLowerCase().includes(name.toLowerCase())
    );
    if (fv?.Value) {
      if (typeof fv.Value === 'object' && fv.Value !== null) {
        // Could be { Id, Label } or { Value } or complex
        return (fv.Value as any).Label || (fv.Value as any).Value || JSON.stringify(fv.Value);
      }
      return String(fv.Value);
    }
  }
  return '';
}

async function main() {
  const token = await getToken();

  // First, let's check what address fields look like on one contact
  const testFilter = `LastName eq 'Hargrove'`;
  const testUrl = `${API_BASE}/accounts/${accountId}/contacts?$filter=${encodeURIComponent(testFilter)}&$top=1`;
  const testData = await apiGet(token, testUrl);
  const testContact = testData.Contacts?.[0];
  if (testContact) {
    const addrFields = testContact.FieldValues?.filter((f: any) =>
      /address|city|state|zip|postal|street|country/i.test(f.FieldName + ' ' + (f.SystemCode || ''))
    );
    console.error('Address-related fields for reference:', JSON.stringify(addrFields, null, 2));
  }

  // Now search all contacts
  const results: Array<{ name: string; address: string; city: string; state: string; zip: string }> = [];

  for (const { firstName, lastName } of names) {
    await new Promise(r => setTimeout(r, 200));
    const filter = `LastName eq '${lastName}'`;
    const url = `${API_BASE}/accounts/${accountId}/contacts?$filter=${encodeURIComponent(filter)}&$top=10`;

    try {
      const data = await apiGet(token, url);
      const contacts: Contact[] = data.Contacts || [];

      // Find best match by first name
      let match = contacts.find(c =>
        c.FirstName?.toLowerCase().startsWith(firstName.toLowerCase())
      ) || contacts.find(c =>
        c.FirstName?.toLowerCase().includes(firstName.toLowerCase())
      );

      if (!match && contacts.length === 1) {
        match = contacts[0];
      }

      if (!match) {
        results.push({ name: `${firstName} ${lastName}`, address: 'NOT FOUND', city: '', state: '', zip: '' });
        continue;
      }

      const address = getField(match, 'address', 'street');
      const city = getField(match, 'city');
      const state = getField(match, 'state', 'province');
      const zip = getField(match, 'zip', 'postal');

      results.push({
        name: `${match.FirstName} ${match.LastName}`,
        address,
        city,
        state,
        zip,
      });
    } catch (err) {
      results.push({ name: `${firstName} ${lastName}`, address: `ERROR: ${err}`, city: '', state: '', zip: '' });
    }
  }

  // Print table
  console.log('| # | Name | Address | City | State | Zip |');
  console.log('|---|------|---------|------|-------|-----|');
  results.forEach((r, i) => {
    console.log(`| ${i + 1} | ${r.name} | ${r.address} | ${r.city} | ${r.state} | ${r.zip} |`);
  });
}

main().catch(console.error);
