/**
 * Configuration management for Wild Apricot MCP server
 */

export interface Config {
  apiKey: string;
  accountId: string;
  readOnly: boolean;
}

export function loadConfig(): Config {
  const apiKey = process.env.WILDAPRICOT_API_KEY;
  const accountId = process.env.WILDAPRICOT_ACCOUNT_ID;
  const readOnly = process.env.WILDAPRICOT_READ_ONLY?.toLowerCase() === 'true';

  if (!apiKey) {
    throw new Error('WILDAPRICOT_API_KEY environment variable is required');
  }

  if (!accountId) {
    throw new Error('WILDAPRICOT_ACCOUNT_ID environment variable is required');
  }

  return {
    apiKey,
    accountId,
    readOnly,
  };
}
