/**
 * Account information tools
 */

import type { WildApricotClient } from '../client.js';

export interface AccountDetails {
  Id: number;
  Name: string;
  PrimaryDomainName: string;
  TimeZone: { Name: string };
  Currency: { Code: string; Symbol: string };
  ContactsCount: number;
  Resources: Array<{ Name: string; Url: string }>;
}

export function registerAccountTools(
  client: WildApricotClient,
  registerTool: (
    name: string,
    description: string,
    schema: object,
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ) => void
) {
  registerTool(
    'get_account',
    'Get Wild Apricot account details including name, timezone, currency, and contact count',
    {
      type: 'object',
      properties: {},
      required: [],
    },
    async () => {
      // The account endpoint is the base without additional path
      const account = await client.get<AccountDetails>('');
      return {
        id: account.Id,
        name: account.Name,
        domain: account.PrimaryDomainName,
        timezone: account.TimeZone?.Name,
        currency: account.Currency,
        contactsCount: account.ContactsCount,
      };
    }
  );
}
