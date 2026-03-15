/**
 * Email tools
 */

import type { WildApricotClient } from '../client.js';
import { createRpcPendingOperation } from '../pending-operations.js';

export function registerEmailTools(
  client: WildApricotClient,
  readOnly: boolean,
  registerTool: (
    name: string,
    description: string,
    schema: object,
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ) => void
) {
  if (readOnly) return;

  registerTool(
    'send_email',
    'Send an email to one or more Wild Apricot contacts. The email is sent from the organization\'s domain. Requires confirmation via confirm_operation before the email is actually sent.',
    {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'HTML body content of the email',
        },
        contactIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of Wild Apricot contact IDs to send the email to',
        },
        replyToAddress: {
          type: 'string',
          description: 'Optional reply-to email address',
        },
        replyToName: {
          type: 'string',
          description: 'Optional reply-to display name',
        },
      },
      required: ['subject', 'body', 'contactIds'],
    },
    async (args) => {
      const subject = args.subject as string;
      const body = args.body as string;
      const contactIds = args.contactIds as number[];
      const replyToAddress = args.replyToAddress as string | undefined;
      const replyToName = args.replyToName as string | undefined;

      if (!subject.trim()) {
        throw new Error('Subject cannot be empty');
      }
      if (!body.trim()) {
        throw new Error('Body cannot be empty');
      }
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        throw new Error('contactIds must be a non-empty array of contact IDs');
      }

      const rpcBody: Record<string, unknown> = {
        Subject: subject,
        Body: body,
        Recipients: contactIds.map(id => ({
          Id: id,
          Type: 'IndividualContactRecipient',
        })),
      };

      if (replyToAddress) {
        rpcBody.ReplyToAddress = replyToAddress;
      }
      if (replyToName) {
        rpcBody.ReplyToName = replyToName;
      }

      const bodySnippet = body.length > 100 ? body.substring(0, 100) + '...' : body;

      const operation = createRpcPendingOperation(
        'email/SendEmail',
        rpcBody,
        `Send email "${subject}" to ${contactIds.length} recipient(s)`,
        'send_email'
      );

      return {
        pendingOperationId: operation.id,
        message: `Email staged for sending. Use confirm_operation with operationId "${operation.id}" to send.`,
        preview: {
          subject,
          recipientCount: contactIds.length,
          contactIds,
          bodySnippet,
          replyToAddress,
        },
      };
    }
  );
}
