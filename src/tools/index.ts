/**
 * Tool registration index
 */

import type { WildApricotClient } from '../client.js';
import { registerConfirmationTools } from '../pending-operations.js';
import { registerAccountTools } from './account.js';
import { registerContactTools } from './contacts.js';
import { registerEventTools } from './events.js';
import { registerRegistrationTools } from './registrations.js';
import { registerMembershipTools } from './memberships.js';
import { registerInvoiceTools } from './invoices.js';
import { registerEmailTools } from './email.js';

export function registerAllTools(
  client: WildApricotClient,
  readOnly: boolean,
  registerTool: (
    name: string,
    description: string,
    schema: object,
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ) => void
) {
  registerAccountTools(client, registerTool);
  registerContactTools(client, readOnly, registerTool);
  registerEventTools(client, readOnly, registerTool);
  registerRegistrationTools(client, readOnly, registerTool);
  registerMembershipTools(client, registerTool);
  registerInvoiceTools(client, readOnly, registerTool);
  registerEmailTools(client, readOnly, registerTool);

  // Register confirmation tools only if not in read-only mode
  if (!readOnly) {
    registerConfirmationTools(client, registerTool);
  }
}
