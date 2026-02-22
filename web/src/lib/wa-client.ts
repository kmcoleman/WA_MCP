const TOKEN_URL = "https://oauth.wildapricot.org/auth/token";
const API_BASE = "https://api.wildapricot.org/v2.2";
const TOKEN_EXPIRY_BUFFER_MS = 60000;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function getConfig() {
  const apiKey = process.env.WILDAPRICOT_API_KEY;
  const accountId = process.env.WILDAPRICOT_ACCOUNT_ID;
  if (!apiKey || !accountId) {
    throw new Error("WILDAPRICOT_API_KEY and WILDAPRICOT_ACCOUNT_ID must be set");
  }
  return { apiKey, accountId };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    return cachedToken;
  }

  const { apiKey } = getConfig();
  const credentials = Buffer.from(`APIKEY:${apiKey}`).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=auto",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WA auth failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken!;
}

export async function waGet<T>(endpoint: string): Promise<T> {
  const { accountId } = getConfig();
  const token = await getAccessToken();
  const url = `${API_BASE}/accounts/${accountId}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WA API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function waPut<T>(endpoint: string, body: unknown): Promise<T> {
  const { accountId } = getConfig();
  const token = await getAccessToken();
  const url = `${API_BASE}/accounts/${accountId}${endpoint}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WA API error: ${response.status} ${errorText}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
