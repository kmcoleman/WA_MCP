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

  for (const id of [68586076, 76045184]) {
    const url = `${API_BASE}/accounts/${accountId}/contacts/${id}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const c = (await res.json()) as any;
    const addr = getField(c, 'address', 'street');
    const city = getField(c, 'city');
    const state = getField(c, 'state', 'province');
    const zip = getField(c, 'zip', 'postal');
    console.log(`${c.FirstName} ${c.LastName} | ${addr} | ${city} | ${state} | ${zip}`);
  }
}

main().catch(console.error);
