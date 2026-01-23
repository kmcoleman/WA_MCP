/**
 * Invoice tools
 */

import type { WildApricotClient } from '../client.js';
import { createPendingOperation } from '../pending-operations.js';
import {
  validateId,
  validateDateFormat,
  validateStringLength,
  validatePositiveNumber,
  ValidationError
} from '../validation.js';

export interface Invoice {
  Id: number;
  Contact: { Id: number; Name: string };
  DocumentNumber: string;
  DocumentDate: string;
  DueDate: string;
  Status: string;
  IsPaid: boolean;
  Value: number;
  PaidAmount: number;
  Balance: number;
  CreatedDate: string;
  Memo: string;
  OrderDetails: Array<{
    Description: string;
    Quantity: number;
    Value: number;
  }>;
}

export interface InvoicesResponse {
  Invoices: Invoice[];
}

export function registerInvoiceTools(
  client: WildApricotClient,
  readOnly: boolean,
  registerTool: (
    name: string,
    description: string,
    schema: object,
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ) => void
) {
  // List invoices
  registerTool(
    'list_invoices',
    'List invoices with optional filters',
    {
      type: 'object',
      properties: {
        contactId: {
          type: 'number',
          description: 'Filter by contact ID',
        },
        unpaidOnly: {
          type: 'boolean',
          description: 'Only return unpaid invoices',
        },
        startDate: {
          type: 'string',
          description: 'Filter invoices created on or after this date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Filter invoices created on or before this date (YYYY-MM-DD)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of invoices to return (default: 50)',
        },
      },
      required: [],
    },
    async (args) => {
      // Validation
      if (args.contactId) {
        validateId(args.contactId as number, 'contactId');
      }
      if (args.startDate) {
        validateDateFormat(args.startDate as string, 'startDate');
      }
      if (args.endDate) {
        validateDateFormat(args.endDate as string, 'endDate');
      }

      const params: Record<string, string> = {};
      const filters: string[] = [];

      if (args.contactId) {
        filters.push(`Contact.Id eq ${args.contactId}`);
      }
      if (args.unpaidOnly) {
        filters.push('IsPaid eq false');
      }
      if (args.startDate) {
        filters.push(`DocumentDate ge ${args.startDate}`);
      }
      if (args.endDate) {
        filters.push(`DocumentDate le ${args.endDate}`);
      }

      if (filters.length > 0) {
        params['$filter'] = filters.join(' AND ');
      }

      const limit = (args.limit as number) || 50;
      params['$top'] = Math.min(limit, 200).toString();

      const response = await client.get<InvoicesResponse>('/invoices', params);
      return {
        count: response.Invoices?.length || 0,
        invoices: response.Invoices || [],
      };
    }
  );

  // Get single invoice
  registerTool(
    'get_invoice',
    'Get a single invoice by ID',
    {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'number',
          description: 'The invoice ID',
        },
      },
      required: ['invoiceId'],
    },
    async (args) => {
      const invoiceId = args.invoiceId as number;
      validateId(invoiceId, 'invoiceId');

      const invoice = await client.get<Invoice>(`/invoices/${invoiceId}`);
      return invoice;
    }
  );

  // Write operations
  if (!readOnly) {
    registerTool(
      'create_invoice',
      'Stage a new invoice for creation. Returns a pending operation that MUST be confirmed with confirm_operation before the invoice is actually created.',
      {
        type: 'object',
        properties: {
          contactId: { type: 'number', description: 'The contact ID to invoice' },
          dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
          memo: { type: 'string', description: 'Invoice memo/notes' },
          orderDetails: {
            type: 'array',
            description: 'Line items for the invoice',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                value: { type: 'number' },
              },
              required: ['description', 'value'],
            },
          },
        },
        required: ['contactId', 'orderDetails'],
      },
      async (args) => {
        const contactId = args.contactId as number;
        const orderDetails = args.orderDetails as Array<{description: string; quantity?: number; value: number}>;

        // Validation
        validateId(contactId, 'contactId');
        if (args.dueDate) {
          validateDateFormat(args.dueDate as string, 'dueDate');
        }
        if (args.memo) {
          validateStringLength(args.memo as string, 'memo', 2000);
        }

        if (!orderDetails || orderDetails.length === 0) {
          throw new ValidationError('orderDetails must contain at least one line item');
        }

        // Validate each line item
        for (let i = 0; i < orderDetails.length; i++) {
          const item = orderDetails[i];
          if (!item.description || item.description.trim() === '') {
            throw new ValidationError(`orderDetails[${i}].description is required`);
          }
          validateStringLength(item.description, `orderDetails[${i}].description`, 500);
          if (typeof item.value !== 'number' || isNaN(item.value)) {
            throw new ValidationError(`orderDetails[${i}].value must be a number`);
          }
          if (item.quantity !== undefined) {
            validatePositiveNumber(item.quantity, `orderDetails[${i}].quantity`);
          }
        }

        const body: Record<string, unknown> = {
          Contact: { Id: contactId },
          OrderDetails: orderDetails.map(item => ({
            Description: item.description,
            Quantity: item.quantity || 1,
            Value: item.value,
          })),
        };

        if (args.dueDate) body.DueDate = args.dueDate;
        if (args.memo) body.Memo = args.memo;

        const totalValue = orderDetails.reduce((sum, item) => sum + (item.value * (item.quantity || 1)), 0);

        const operation = createPendingOperation(
          'POST',
          '/invoices',
          body,
          `Create invoice for contact ID ${contactId}: ${orderDetails.length} item(s), total $${totalValue.toFixed(2)}`,
          'create_invoice'
        );

        return {
          status: 'PENDING_CONFIRMATION',
          operationId: operation.id,
          message: `Invoice creation staged. To execute, call confirm_operation with operationId: ${operation.id}`,
          preview: {
            action: 'CREATE INVOICE',
            contactId,
            lineItems: orderDetails,
            totalValue,
            data: body,
          },
          expiresIn: '5 minutes',
        };
      }
    );
  }
}
