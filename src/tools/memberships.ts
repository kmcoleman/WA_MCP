/**
 * Membership level tools
 */

import type { WildApricotClient } from '../client.js';

export interface MembershipLevel {
  Id: number;
  Name: string;
  Description: string;
  MembershipFee: number;
  IsPublic: boolean;
  Type: string; // 'Individual', 'Family', 'Organization'
  PublicCanApply: boolean;
  RenewalPeriod: {
    Kind: string;
    Length: number;
  };
}

export function registerMembershipTools(
  client: WildApricotClient,
  registerTool: (
    name: string,
    description: string,
    schema: object,
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ) => void
) {
  registerTool(
    'list_membership_levels',
    'List all membership levels configured in the account',
    {
      type: 'object',
      properties: {},
      required: [],
    },
    async () => {
      const levels = await client.get<MembershipLevel[]>('/membershiplevels');
      return {
        count: levels.length,
        levels,
      };
    }
  );
}
