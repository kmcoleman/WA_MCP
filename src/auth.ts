/**
 * Wild Apricot API authentication
 * Uses API key with client_credentials grant
 */

const TOKEN_URL = 'https://oauth.wildapricot.org/auth/token';
const TOKEN_EXPIRY_BUFFER_MS = 60000; // Refresh 1 minute before expiry

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getAccessToken(apiKey: string): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    return cachedToken;
  }

  // Request new token
  const credentials = Buffer.from(`APIKEY:${apiKey}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=auto',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Authentication failed: ${response.status} ${errorText}`);
  }

  const data = await response.json() as TokenResponse;

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);

  return cachedToken;
}

export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}
