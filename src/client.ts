/**
 * Wild Apricot API client wrapper
 */

import { getAccessToken } from './auth.js';
import type { Config } from './config.js';

const API_BASE = 'https://api.wildapricot.org/v2.2';
const RATE_LIMIT_DELAY_MS = 100; // Delay between requests to avoid rate limiting

let lastRequestTime = 0;

export interface WildApricotClient {
  get<T>(endpoint: string, params?: Record<string, string>): Promise<T>;
  post<T>(endpoint: string, body: unknown): Promise<T>;
  put<T>(endpoint: string, body: unknown): Promise<T>;
  delete(endpoint: string): Promise<void>;
}

async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return fetch(url, options);
}

export function createClient(config: Config): WildApricotClient {
  const { apiKey, accountId } = config;

  async function request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    const token = await getAccessToken(apiKey);

    let url = `${API_BASE}/accounts/${accountId}${endpoint}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await rateLimitedFetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wild Apricot API error: ${response.status} ${errorText}`);
    }

    // Handle empty responses (e.g., DELETE)
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  return {
    async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
      return request<T>('GET', endpoint, undefined, params);
    },

    async post<T>(endpoint: string, body: unknown): Promise<T> {
      return request<T>('POST', endpoint, body);
    },

    async put<T>(endpoint: string, body: unknown): Promise<T> {
      return request<T>('PUT', endpoint, body);
    },

    async delete(endpoint: string): Promise<void> {
      await request<void>('DELETE', endpoint);
    },
  };
}

/**
 * Helper to paginate through all results
 */
export async function fetchAllPages<T>(
  client: WildApricotClient,
  endpoint: string,
  params: Record<string, string> = {},
  resultKey: string = 'Contacts'
): Promise<T[]> {
  const allResults: T[] = [];
  let skip = 0;
  const top = 100; // Max page size

  while (true) {
    const pageParams = {
      ...params,
      '$top': top.toString(),
      '$skip': skip.toString(),
    };

    const response = await client.get<Record<string, unknown>>(endpoint, pageParams);
    const results = response[resultKey] as T[] | undefined;

    if (!results || results.length === 0) {
      break;
    }

    allResults.push(...results);

    if (results.length < top) {
      break; // Last page
    }

    skip += top;
  }

  return allResults;
}
