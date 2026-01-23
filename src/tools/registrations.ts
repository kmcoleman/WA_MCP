/**
 * Event registration tools
 */

import type { WildApricotClient } from '../client.js';
import { createPendingOperation } from '../pending-operations.js';
import { validateId, validateEmail, validateStringLength } from '../validation.js';
import { objectsToCsv, flattenRegistration } from '../csv-export.js';

export interface Registration {
  Id: number;
  Event: { Id: number; Name: string };
  Contact: { Id: number; Name: string };
  RegistrationType: { Id: number; Name: string };
  RegistrationDate: string;
  Status: string;
  IsCheckedIn: boolean;
  IsPaid: boolean;
  RegistrationFee: number;
  PaidSum: number;
  OnWaitlist: boolean;
  Memo: string;
  RegistrationFields: Array<{ FieldName: string; Value: unknown }>;
}

export interface RegistrationsResponse {
  EventRegistrations?: Registration[];
}

export function registerRegistrationTools(
  client: WildApricotClient,
  readOnly: boolean,
  registerTool: (
    name: string,
    description: string,
    schema: object,
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ) => void
) {
  // List registrations for an event
  registerTool(
    'list_event_registrations',
    'Get all registrations for a specific event',
    {
      type: 'object',
      properties: {
        eventId: {
          type: 'number',
          description: 'The event ID',
        },
        contactId: {
          type: 'number',
          description: 'Filter by contact ID (optional)',
        },
        includeWaitlist: {
          type: 'boolean',
          description: 'Include waitlist registrations (default: true)',
        },
      },
      required: ['eventId'],
    },
    async (args) => {
      const eventId = args.eventId as number;
      validateId(eventId, 'eventId');

      const params: Record<string, string> = {
        eventId: eventId.toString(),
      };

      if (args.contactId) {
        validateId(args.contactId as number, 'contactId');
        params.contactId = (args.contactId as number).toString();
      }

      const response = await client.get<RegistrationsResponse>('/eventregistrations', params);

      let registrations = response.EventRegistrations || [];

      // Filter out waitlist if requested
      if (args.includeWaitlist === false) {
        registrations = registrations.filter(r => !r.OnWaitlist);
      }

      return {
        count: registrations.length,
        registrations,
      };
    }
  );

  // Get single registration
  registerTool(
    'get_registration',
    'Get a single registration by ID',
    {
      type: 'object',
      properties: {
        registrationId: {
          type: 'number',
          description: 'The registration ID',
        },
      },
      required: ['registrationId'],
    },
    async (args) => {
      const registrationId = args.registrationId as number;
      validateId(registrationId, 'registrationId');

      const registration = await client.get<Registration>(`/eventregistrations/${registrationId}`);
      return registration;
    }
  );

  // Quick win: Find registration by email for an event
  registerTool(
    'find_registration_by_email',
    'Find a registration for a specific event by attendee email address.',
    {
      type: 'object',
      properties: {
        eventId: {
          type: 'number',
          description: 'The event ID',
        },
        email: {
          type: 'string',
          description: 'Email address of the registrant',
        },
      },
      required: ['eventId', 'email'],
    },
    async (args) => {
      const eventId = args.eventId as number;
      const email = args.email as string;

      validateId(eventId, 'eventId');
      validateEmail(email);

      // Get all registrations for the event
      const response = await client.get<RegistrationsResponse>('/eventregistrations', {
        eventId: eventId.toString(),
      });

      const registrations = response.EventRegistrations || [];

      // Search for matching email in contact info
      // Note: Registration may have email in RegistrationFields or we need to check Contact
      const matches = registrations.filter(reg => {
        // Check registration fields for email
        const emailField = reg.RegistrationFields?.find(
          f => f.FieldName?.toLowerCase().includes('email')
        );
        if (emailField && String(emailField.Value).toLowerCase() === email.toLowerCase()) {
          return true;
        }

        // Check contact name (may contain email)
        if (reg.Contact?.Name?.toLowerCase().includes(email.toLowerCase())) {
          return true;
        }

        return false;
      });

      if (matches.length === 0) {
        return {
          found: false,
          message: `No registration found for email "${email}" at event ID ${eventId}`,
        };
      }

      return {
        found: true,
        count: matches.length,
        registrations: matches,
      };
    }
  );

  // CSV Export for registrations
  registerTool(
    'export_registrations_csv',
    'Export event registrations to CSV format. Returns CSV string that can be saved to a file.',
    {
      type: 'object',
      properties: {
        eventId: {
          type: 'number',
          description: 'The event ID to export registrations for',
        },
        includeWaitlist: {
          type: 'boolean',
          description: 'Include waitlisted registrations (default: true)',
        },
      },
      required: ['eventId'],
    },
    async (args) => {
      const eventId = args.eventId as number;
      validateId(eventId, 'eventId');

      const response = await client.get<RegistrationsResponse>('/eventregistrations', {
        eventId: eventId.toString(),
      });

      let registrations = response.EventRegistrations || [];

      if (args.includeWaitlist === false) {
        registrations = registrations.filter(r => !r.OnWaitlist);
      }

      if (registrations.length === 0) {
        return {
          count: 0,
          csv: '',
          message: 'No registrations found for this event',
        };
      }

      const flatRegistrations = registrations.map(r => flattenRegistration(r as unknown as Record<string, unknown>));
      const csv = objectsToCsv(flatRegistrations);

      return {
        count: registrations.length,
        csv,
        message: `Exported ${registrations.length} registrations to CSV`,
      };
    }
  );

  // Write operations
  if (!readOnly) {
    registerTool(
      'update_registration',
      'Stage a registration update (e.g., check-in, update memo). Returns a pending operation that MUST be confirmed with confirm_operation before changes are actually saved.',
      {
        type: 'object',
        properties: {
          registrationId: { type: 'number', description: 'The registration ID to update' },
          isCheckedIn: { type: 'boolean', description: 'Check-in status' },
          memo: { type: 'string', description: 'Registration memo/notes' },
          registrationFields: {
            type: 'array',
            description: 'Custom registration field values',
            items: {
              type: 'object',
              properties: {
                fieldName: { type: 'string' },
                value: {},
              },
            },
          },
        },
        required: ['registrationId'],
      },
      async (args) => {
        const registrationId = args.registrationId as number;

        // Validation
        validateId(registrationId, 'registrationId');
        if (args.memo) {
          validateStringLength(args.memo as string, 'memo', 2000);
        }

        const body: Record<string, unknown> = {
          Id: registrationId,
        };

        const changes: string[] = [];

        if (args.isCheckedIn !== undefined) {
          body.IsCheckedIn = args.isCheckedIn;
          changes.push(`IsCheckedIn=${args.isCheckedIn}`);
        }
        if (args.memo !== undefined) {
          body.Memo = args.memo;
          changes.push(`Memo="${args.memo}"`);
        }
        if (args.registrationFields) {
          body.RegistrationFields = (args.registrationFields as Array<{fieldName: string; value: unknown}>).map(rf => ({
            FieldName: rf.fieldName,
            Value: rf.value,
          }));
          changes.push(`RegistrationFields (${(args.registrationFields as Array<unknown>).length} fields)`);
        }

        const operation = createPendingOperation(
          'PUT',
          `/eventregistrations/${registrationId}`,
          body,
          `Update registration ID ${registrationId}: ${changes.join(', ')}`,
          'update_registration'
        );

        return {
          status: 'PENDING_CONFIRMATION',
          operationId: operation.id,
          message: `Registration update staged. To execute, call confirm_operation with operationId: ${operation.id}`,
          preview: {
            action: 'UPDATE REGISTRATION',
            registrationId,
            changes: body,
          },
          expiresIn: '5 minutes',
        };
      }
    );

    // Quick win: Check in by email
    registerTool(
      'check_in_by_email',
      'Find a registration by email and check them in. Common use case at event check-in. Stages the operation for confirmation.',
      {
        type: 'object',
        properties: {
          eventId: {
            type: 'number',
            description: 'The event ID',
          },
          email: {
            type: 'string',
            description: 'Email address of the person to check in',
          },
        },
        required: ['eventId', 'email'],
      },
      async (args) => {
        const eventId = args.eventId as number;
        const email = args.email as string;

        validateId(eventId, 'eventId');
        validateEmail(email);

        // Get all registrations for the event
        const response = await client.get<RegistrationsResponse>('/eventregistrations', {
          eventId: eventId.toString(),
        });

        const registrations = response.EventRegistrations || [];

        // Search for matching email
        const matches = registrations.filter(reg => {
          const emailField = reg.RegistrationFields?.find(
            f => f.FieldName?.toLowerCase().includes('email')
          );
          if (emailField && String(emailField.Value).toLowerCase() === email.toLowerCase()) {
            return true;
          }
          if (reg.Contact?.Name?.toLowerCase().includes(email.toLowerCase())) {
            return true;
          }
          return false;
        });

        if (matches.length === 0) {
          return {
            success: false,
            message: `No registration found for email "${email}" at event ID ${eventId}`,
          };
        }

        if (matches.length > 1) {
          return {
            success: false,
            message: `Multiple registrations found for email "${email}". Please use update_registration with a specific registrationId.`,
            registrations: matches.map(r => ({
              id: r.Id,
              contactName: r.Contact?.Name,
              isCheckedIn: r.IsCheckedIn,
              onWaitlist: r.OnWaitlist,
            })),
          };
        }

        const registration = matches[0];

        if (registration.IsCheckedIn) {
          return {
            success: false,
            message: `${registration.Contact?.Name || email} is already checked in.`,
            registration: {
              id: registration.Id,
              contactName: registration.Contact?.Name,
              isCheckedIn: registration.IsCheckedIn,
            },
          };
        }

        if (registration.OnWaitlist) {
          return {
            success: false,
            message: `${registration.Contact?.Name || email} is on the waitlist and cannot be checked in.`,
            registration: {
              id: registration.Id,
              contactName: registration.Contact?.Name,
              onWaitlist: registration.OnWaitlist,
            },
          };
        }

        // Stage the check-in
        const body = {
          Id: registration.Id,
          IsCheckedIn: true,
        };

        const operation = createPendingOperation(
          'PUT',
          `/eventregistrations/${registration.Id}`,
          body,
          `Check in: ${registration.Contact?.Name || email} (Registration ID ${registration.Id})`,
          'check_in_by_email'
        );

        return {
          status: 'PENDING_CONFIRMATION',
          operationId: operation.id,
          message: `Check-in staged for ${registration.Contact?.Name || email}. To execute, call confirm_operation with operationId: ${operation.id}`,
          preview: {
            action: 'CHECK IN',
            registrationId: registration.Id,
            contactName: registration.Contact?.Name,
            email,
            eventName: registration.Event?.Name,
          },
          expiresIn: '5 minutes',
        };
      }
    );
  }
}
