/**
 * Contact/member tools
 */

import type { WildApricotClient } from '../client.js';
import { createPendingOperation, createDoubleConfirmOperation } from '../pending-operations.js';
import {
  validateEmail,
  validateId,
  validateContactStatus,
  validateStringLength,
  ValidationError
} from '../validation.js';
import { objectsToCsv, flattenContact } from '../csv-export.js';

export interface Contact {
  Id: number;
  FirstName: string;
  LastName: string;
  Email: string;
  DisplayName: string;
  Organization: string;
  Status: string;
  MembershipLevel?: { Id: number; Name: string };
  MembershipEnabled: boolean;
  IsArchived: boolean;
  FieldValues: Array<{ FieldName: string; Value: unknown }>;
}

export interface ContactsResponse {
  Contacts: Contact[];
  ResultId?: string;
}

export function registerContactTools(
  client: WildApricotClient,
  readOnly: boolean,
  registerTool: (
    name: string,
    description: string,
    schema: object,
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ) => void
) {
  // List contacts
  registerTool(
    'list_contacts',
    'List or search contacts/members. Supports filtering by status, membership level, and text search.',
    {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Filter expression (e.g., "Status eq Active", "substringof(\'john\', Email)")',
        },
        select: {
          type: 'string',
          description: 'Comma-separated fields to return (e.g., "Id,FirstName,LastName,Email")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of contacts to return (default: 100)',
        },
      },
      required: [],
    },
    async (args) => {
      const params: Record<string, string> = {};

      if (args.filter) {
        params['$filter'] = args.filter as string;
      }
      if (args.select) {
        params['$select'] = args.select as string;
      }

      const limit = (args.limit as number) || 100;
      params['$top'] = Math.min(limit, 500).toString();

      const response = await client.get<ContactsResponse>('/contacts', params);
      return {
        count: response.Contacts?.length || 0,
        contacts: response.Contacts || [],
      };
    }
  );

  // Quick win: Search contacts by name
  registerTool(
    'search_contacts_by_name',
    'Search contacts by first name, last name, or both. Simpler than building filter expressions.',
    {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          description: 'First name to search (partial match)',
        },
        lastName: {
          type: 'string',
          description: 'Last name to search (partial match)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of contacts to return (default: 50)',
        },
      },
      required: [],
    },
    async (args) => {
      const filters: string[] = [];

      if (args.firstName) {
        filters.push(`substringof('${args.firstName}', FirstName)`);
      }
      if (args.lastName) {
        filters.push(`substringof('${args.lastName}', LastName)`);
      }

      if (filters.length === 0) {
        throw new ValidationError('At least one of firstName or lastName is required');
      }

      const params: Record<string, string> = {
        '$filter': filters.join(' AND '),
      };

      const limit = (args.limit as number) || 50;
      params['$top'] = Math.min(limit, 200).toString();

      const response = await client.get<ContactsResponse>('/contacts', params);
      return {
        count: response.Contacts?.length || 0,
        contacts: response.Contacts || [],
      };
    }
  );

  // Quick win: Get contact by email
  registerTool(
    'get_contact_by_email',
    'Find a contact by their exact email address.',
    {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Email address to search for',
        },
      },
      required: ['email'],
    },
    async (args) => {
      const email = args.email as string;
      validateEmail(email);

      const params: Record<string, string> = {
        '$filter': `Email eq '${email}'`,
      };

      const response = await client.get<ContactsResponse>('/contacts', params);

      if (!response.Contacts || response.Contacts.length === 0) {
        return {
          found: false,
          message: `No contact found with email: ${email}`,
        };
      }

      return {
        found: true,
        contact: response.Contacts[0],
      };
    }
  );

  // Get single contact
  registerTool(
    'get_contact',
    'Get a single contact by ID with all details',
    {
      type: 'object',
      properties: {
        contactId: {
          type: 'number',
          description: 'The contact ID',
        },
      },
      required: ['contactId'],
    },
    async (args) => {
      const contactId = args.contactId as number;
      validateId(contactId, 'contactId');

      const contact = await client.get<Contact>(`/contacts/${contactId}`);
      return contact;
    }
  );

  // CSV Export
  registerTool(
    'export_contacts_csv',
    'Export contacts to CSV format. Returns CSV string that can be saved to a file.',
    {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Filter expression (same as list_contacts)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of contacts to export (default: 500)',
        },
      },
      required: [],
    },
    async (args) => {
      const params: Record<string, string> = {};

      if (args.filter) {
        params['$filter'] = args.filter as string;
      }

      const limit = (args.limit as number) || 500;
      params['$top'] = Math.min(limit, 1000).toString();

      const response = await client.get<ContactsResponse>('/contacts', params);
      const contacts = response.Contacts || [];

      if (contacts.length === 0) {
        return {
          count: 0,
          csv: '',
          message: 'No contacts found matching the filter',
        };
      }

      // Flatten contacts for CSV
      const flatContacts = contacts.map(c => flattenContact(c as unknown as Record<string, unknown>));
      const csv = objectsToCsv(flatContacts);

      return {
        count: contacts.length,
        csv,
        message: `Exported ${contacts.length} contacts to CSV`,
      };
    }
  );

  // Write operations (only if not read-only)
  if (!readOnly) {
    registerTool(
      'create_contact',
      'Stage a new contact for creation. Returns a pending operation that MUST be confirmed with confirm_operation before the contact is actually created.',
      {
        type: 'object',
        properties: {
          firstName: { type: 'string', description: 'First name' },
          lastName: { type: 'string', description: 'Last name' },
          email: { type: 'string', description: 'Email address' },
          organization: { type: 'string', description: 'Organization name' },
          membershipLevelId: { type: 'number', description: 'Membership level ID (optional)' },
          status: {
            type: 'string',
            description: 'Contact status (Active, Lapsed, PendingNew, etc.)',
            enum: ['Active', 'Lapsed', 'PendingNew', 'PendingRenewal', 'PendingUpgrade'],
          },
          fieldValues: {
            type: 'array',
            description: 'Custom field values as array of {fieldName, value} objects',
            items: {
              type: 'object',
              properties: {
                fieldName: { type: 'string' },
                value: {},
              },
            },
          },
        },
        required: ['email'],
      },
      async (args) => {
        // Validation
        const email = args.email as string;
        validateEmail(email);

        if (args.firstName) {
          validateStringLength(args.firstName as string, 'firstName', 100);
        }
        if (args.lastName) {
          validateStringLength(args.lastName as string, 'lastName', 100);
        }
        if (args.status) {
          validateContactStatus(args.status as string);
        }
        if (args.membershipLevelId) {
          validateId(args.membershipLevelId as number, 'membershipLevelId');
        }

        const body: Record<string, unknown> = {
          Email: email,
        };

        if (args.firstName) body.FirstName = args.firstName;
        if (args.lastName) body.LastName = args.lastName;
        if (args.organization) body.Organization = args.organization;
        if (args.status) body.Status = args.status;
        if (args.membershipLevelId) {
          body.MembershipLevel = { Id: args.membershipLevelId };
        }
        if (args.fieldValues) {
          body.FieldValues = (args.fieldValues as Array<{fieldName: string; value: unknown}>).map(fv => ({
            FieldName: fv.fieldName,
            Value: fv.value,
          }));
        }

        const displayName = [args.firstName, args.lastName].filter(Boolean).join(' ') || email;
        const operation = createPendingOperation(
          'POST',
          '/contacts',
          body,
          `Create contact: ${displayName} (${email})`,
          'create_contact'
        );

        return {
          status: 'PENDING_CONFIRMATION',
          operationId: operation.id,
          message: `Contact creation staged. To execute, call confirm_operation with operationId: ${operation.id}`,
          preview: {
            action: 'CREATE CONTACT',
            data: body,
          },
          expiresIn: '5 minutes',
        };
      }
    );

    registerTool(
      'update_contact',
      'Stage a contact update. Returns a pending operation that MUST be confirmed with confirm_operation before changes are actually saved.',
      {
        type: 'object',
        properties: {
          contactId: { type: 'number', description: 'The contact ID to update' },
          firstName: { type: 'string', description: 'First name' },
          lastName: { type: 'string', description: 'Last name' },
          email: { type: 'string', description: 'Email address' },
          organization: { type: 'string', description: 'Organization name' },
          membershipLevelId: { type: 'number', description: 'Membership level ID' },
          status: {
            type: 'string',
            description: 'Contact status',
            enum: ['Active', 'Lapsed', 'PendingNew', 'PendingRenewal', 'PendingUpgrade'],
          },
          fieldValues: {
            type: 'array',
            description: 'Custom field values as array of {fieldName, value} objects',
            items: {
              type: 'object',
              properties: {
                fieldName: { type: 'string' },
                value: {},
              },
            },
          },
        },
        required: ['contactId'],
      },
      async (args) => {
        const contactId = args.contactId as number;

        // Validation
        validateId(contactId, 'contactId');
        if (args.email) {
          validateEmail(args.email as string);
        }
        if (args.firstName) {
          validateStringLength(args.firstName as string, 'firstName', 100);
        }
        if (args.lastName) {
          validateStringLength(args.lastName as string, 'lastName', 100);
        }
        if (args.status) {
          validateContactStatus(args.status as string);
        }
        if (args.membershipLevelId) {
          validateId(args.membershipLevelId as number, 'membershipLevelId');
        }

        const body: Record<string, unknown> = {
          Id: contactId,
        };

        const changes: string[] = [];

        if (args.firstName !== undefined) {
          body.FirstName = args.firstName;
          changes.push(`FirstName=${args.firstName}`);
        }
        if (args.lastName !== undefined) {
          body.LastName = args.lastName;
          changes.push(`LastName=${args.lastName}`);
        }
        if (args.email !== undefined) {
          body.Email = args.email;
          changes.push(`Email=${args.email}`);
        }
        if (args.organization !== undefined) {
          body.Organization = args.organization;
          changes.push(`Organization=${args.organization}`);
        }
        if (args.status !== undefined) {
          body.Status = args.status;
          changes.push(`Status=${args.status}`);
        }
        if (args.membershipLevelId !== undefined) {
          body.MembershipLevel = { Id: args.membershipLevelId };
          changes.push(`MembershipLevelId=${args.membershipLevelId}`);
        }
        if (args.fieldValues) {
          body.FieldValues = (args.fieldValues as Array<{fieldName: string; value: unknown}>).map(fv => ({
            FieldName: fv.fieldName,
            Value: fv.value,
          }));
          changes.push(`FieldValues (${(args.fieldValues as Array<unknown>).length} fields)`);
        }

        const operation = createPendingOperation(
          'PUT',
          `/contacts/${contactId}`,
          body,
          `Update contact ID ${contactId}: ${changes.join(', ')}`,
          'update_contact'
        );

        return {
          status: 'PENDING_CONFIRMATION',
          operationId: operation.id,
          message: `Contact update staged. To execute, call confirm_operation with operationId: ${operation.id}`,
          preview: {
            action: 'UPDATE CONTACT',
            contactId,
            changes: body,
          },
          expiresIn: '5 minutes',
        };
      }
    );

    // Delete contact - requires double confirmation
    registerTool(
      'delete_contact',
      'Stage a contact for DELETION. This is a DESTRUCTIVE operation that requires DOUBLE CONFIRMATION. The contact will be permanently removed.',
      {
        type: 'object',
        properties: {
          contactId: { type: 'number', description: 'The contact ID to delete' },
          confirmContactId: {
            type: 'number',
            description: 'Must match contactId to confirm you want to delete the correct contact'
          },
        },
        required: ['contactId', 'confirmContactId'],
      },
      async (args) => {
        const contactId = args.contactId as number;
        const confirmContactId = args.confirmContactId as number;

        // Validation
        validateId(contactId, 'contactId');
        validateId(confirmContactId, 'confirmContactId');

        // First confirmation: IDs must match
        if (contactId !== confirmContactId) {
          throw new ValidationError(
            `contactId (${contactId}) and confirmContactId (${confirmContactId}) must match. ` +
            `This is a safety check to prevent accidental deletions.`
          );
        }

        // Fetch contact to show what will be deleted
        const contact = await client.get<Contact>(`/contacts/${contactId}`);
        const displayName = contact.DisplayName || `${contact.FirstName} ${contact.LastName}`.trim() || contact.Email;

        const operation = createDoubleConfirmOperation(
          'DELETE',
          `/contacts/${contactId}`,
          null,
          `DELETE contact: ${displayName} (ID: ${contactId}, Email: ${contact.Email})`,
          'delete_contact'
        );

        return {
          status: 'PENDING_DOUBLE_CONFIRMATION',
          operationId: operation.id,
          message: `⚠️ DESTRUCTIVE OPERATION: Contact deletion staged. This PERMANENTLY DELETES the contact. ` +
            `To execute, call confirm_delete with operationId: ${operation.id}`,
          warning: 'THIS CANNOT BE UNDONE',
          preview: {
            action: 'DELETE CONTACT',
            contactId,
            contactName: displayName,
            contactEmail: contact.Email,
            contactStatus: contact.Status,
            membershipLevel: contact.MembershipLevel?.Name,
          },
          expiresIn: '5 minutes',
        };
      }
    );
  }
}
