/**
 * Event tools
 */

import type { WildApricotClient } from '../client.js';
import { createPendingOperation, createDoubleConfirmOperation } from '../pending-operations.js';
import {
  validateId,
  validateDateTimeFormat,
  validateAccessLevel,
  validateStringLength,
  validatePositiveNumber,
  ValidationError
} from '../validation.js';
import { objectsToCsv, flattenEvent } from '../csv-export.js';

export interface Event {
  Id: number;
  Name: string;
  StartDate: string;
  EndDate: string;
  Location: string;
  DescriptionHtml?: string;
  RegistrationEnabled: boolean;
  RegistrationsLimit?: number;
  ConfirmedRegistrationsCount: number;
  CheckedInAttendeesNumber: number;
  PendingRegistrationsCount: number;
  Tags: string[];
  AccessLevel: string;
  EventType: string;
  StartTimeSpecified: boolean;
  EndTimeSpecified: boolean;
}

export interface EventsResponse {
  Events: Event[];
}

export function registerEventTools(
  client: WildApricotClient,
  readOnly: boolean,
  registerTool: (
    name: string,
    description: string,
    schema: object,
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ) => void
) {
  // List events
  registerTool(
    'list_events',
    'List events with optional date filters. Returns upcoming events by default.',
    {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Filter events starting on or after this date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Filter events ending on or before this date (YYYY-MM-DD)',
        },
        includeDetails: {
          type: 'boolean',
          description: 'Include full event details including description HTML (default: false)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of events to return (default: 50)',
        },
      },
      required: [],
    },
    async (args) => {
      const params: Record<string, string> = {};

      if (args.startDate) {
        params['$filter'] = `StartDate ge ${args.startDate}`;
      }
      if (args.endDate) {
        if (params['$filter']) {
          params['$filter'] += ` AND EndDate le ${args.endDate}`;
        } else {
          params['$filter'] = `EndDate le ${args.endDate}`;
        }
      }
      if (args.includeDetails) {
        params['includeEventDetails'] = 'true';
      }

      const limit = (args.limit as number) || 50;
      params['$top'] = Math.min(limit, 200).toString();

      const response = await client.get<EventsResponse>('/events', params);
      return {
        count: response.Events?.length || 0,
        events: response.Events || [],
      };
    }
  );

  // Quick win: Get upcoming events
  registerTool(
    'get_upcoming_events',
    'Get events starting in the next N days (default: 30 days). Simpler than building date filters.',
    {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look ahead (default: 30)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of events to return (default: 50)',
        },
      },
      required: [],
    },
    async (args) => {
      const days = (args.days as number) || 30;
      const limit = (args.limit as number) || 50;

      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);

      const startDate = today.toISOString().split('T')[0];
      const endDate = futureDate.toISOString().split('T')[0];

      const params: Record<string, string> = {
        '$filter': `StartDate ge ${startDate} AND StartDate le ${endDate}`,
        '$top': Math.min(limit, 200).toString(),
      };

      const response = await client.get<EventsResponse>('/events', params);
      return {
        count: response.Events?.length || 0,
        dateRange: { from: startDate, to: endDate },
        events: response.Events || [],
      };
    }
  );

  // Quick win: Get event with attendees
  registerTool(
    'get_event_attendees',
    'Get an event along with all its registrations in a single call. Combines get_event and list_event_registrations.',
    {
      type: 'object',
      properties: {
        eventId: {
          type: 'number',
          description: 'The event ID',
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

      // Fetch both event and registrations in parallel
      const [event, registrationsResponse] = await Promise.all([
        client.get<Event>(`/events/${eventId}`),
        client.get<{ EventRegistrations?: Array<Record<string, unknown>> }>('/eventregistrations', { eventId: eventId.toString() }),
      ]);

      let registrations = registrationsResponse.EventRegistrations || [];

      // Filter out waitlist if requested
      if (args.includeWaitlist === false) {
        registrations = registrations.filter(r => !r.OnWaitlist);
      }

      // Summarize attendance
      const confirmed = registrations.filter(r => !r.OnWaitlist);
      const checkedIn = registrations.filter(r => r.IsCheckedIn);
      const waitlist = registrations.filter(r => r.OnWaitlist);

      return {
        event,
        summary: {
          totalRegistrations: registrations.length,
          confirmedCount: confirmed.length,
          checkedInCount: checkedIn.length,
          waitlistCount: waitlist.length,
        },
        registrations,
      };
    }
  );

  // Get single event
  registerTool(
    'get_event',
    'Get a single event by ID with full details',
    {
      type: 'object',
      properties: {
        eventId: {
          type: 'number',
          description: 'The event ID',
        },
      },
      required: ['eventId'],
    },
    async (args) => {
      const eventId = args.eventId as number;
      validateId(eventId, 'eventId');

      const event = await client.get<Event>(`/events/${eventId}`);
      return event;
    }
  );

  // CSV Export
  registerTool(
    'export_events_csv',
    'Export events to CSV format. Returns CSV string that can be saved to a file.',
    {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Filter events starting on or after this date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Filter events ending on or before this date (YYYY-MM-DD)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of events to export (default: 200)',
        },
      },
      required: [],
    },
    async (args) => {
      const params: Record<string, string> = {};

      if (args.startDate) {
        params['$filter'] = `StartDate ge ${args.startDate}`;
      }
      if (args.endDate) {
        if (params['$filter']) {
          params['$filter'] += ` AND EndDate le ${args.endDate}`;
        } else {
          params['$filter'] = `EndDate le ${args.endDate}`;
        }
      }

      const limit = (args.limit as number) || 200;
      params['$top'] = Math.min(limit, 500).toString();

      const response = await client.get<EventsResponse>('/events', params);
      const events = response.Events || [];

      if (events.length === 0) {
        return {
          count: 0,
          csv: '',
          message: 'No events found matching the filter',
        };
      }

      const flatEvents = events.map(e => flattenEvent(e as unknown as Record<string, unknown>));
      const csv = objectsToCsv(flatEvents);

      return {
        count: events.length,
        csv,
        message: `Exported ${events.length} events to CSV`,
      };
    }
  );

  // Write operations
  if (!readOnly) {
    registerTool(
      'create_event',
      'Stage a new event for creation. Returns a pending operation that MUST be confirmed with confirm_operation before the event is actually created.',
      {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Event name' },
          startDate: { type: 'string', description: 'Start date/time (ISO 8601 format)' },
          endDate: { type: 'string', description: 'End date/time (ISO 8601 format)' },
          location: { type: 'string', description: 'Event location' },
          descriptionHtml: { type: 'string', description: 'Event description as HTML' },
          registrationEnabled: { type: 'boolean', description: 'Enable registration (default: true)' },
          registrationsLimit: { type: 'number', description: 'Maximum registrations (optional)' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Event tags',
          },
          accessLevel: {
            type: 'string',
            description: 'Who can view the event',
            enum: ['Public', 'AdminOnly', 'Restricted'],
          },
        },
        required: ['name', 'startDate'],
      },
      async (args) => {
        // Validation
        const name = args.name as string;
        const startDate = args.startDate as string;

        validateStringLength(name, 'name', 255);
        validateDateTimeFormat(startDate, 'startDate');

        if (args.endDate) {
          validateDateTimeFormat(args.endDate as string, 'endDate');
        }
        if (args.accessLevel) {
          validateAccessLevel(args.accessLevel as string);
        }
        if (args.registrationsLimit) {
          validatePositiveNumber(args.registrationsLimit as number, 'registrationsLimit');
        }

        const body: Record<string, unknown> = {
          Name: name,
          StartDate: startDate,
        };

        if (args.endDate) body.EndDate = args.endDate;
        if (args.location) body.Location = args.location;
        if (args.descriptionHtml) body.DescriptionHtml = args.descriptionHtml;
        if (args.registrationEnabled !== undefined) body.RegistrationEnabled = args.registrationEnabled;
        if (args.registrationsLimit) body.RegistrationsLimit = args.registrationsLimit;
        if (args.tags) body.Tags = args.tags;
        if (args.accessLevel) body.AccessLevel = args.accessLevel;

        const operation = createPendingOperation(
          'POST',
          '/events',
          body,
          `Create event: "${name}" on ${startDate}`,
          'create_event'
        );

        return {
          status: 'PENDING_CONFIRMATION',
          operationId: operation.id,
          message: `Event creation staged. To execute, call confirm_operation with operationId: ${operation.id}`,
          preview: {
            action: 'CREATE EVENT',
            data: body,
          },
          expiresIn: '5 minutes',
        };
      }
    );

    registerTool(
      'update_event',
      'Stage an event update. Returns a pending operation that MUST be confirmed with confirm_operation before changes are actually saved.',
      {
        type: 'object',
        properties: {
          eventId: { type: 'number', description: 'The event ID to update' },
          name: { type: 'string', description: 'Event name' },
          startDate: { type: 'string', description: 'Start date/time (ISO 8601 format)' },
          endDate: { type: 'string', description: 'End date/time (ISO 8601 format)' },
          location: { type: 'string', description: 'Event location' },
          descriptionHtml: { type: 'string', description: 'Event description as HTML' },
          registrationEnabled: { type: 'boolean', description: 'Enable/disable registration' },
          registrationsLimit: { type: 'number', description: 'Maximum registrations' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Event tags',
          },
        },
        required: ['eventId'],
      },
      async (args) => {
        const eventId = args.eventId as number;

        // Validation
        validateId(eventId, 'eventId');
        if (args.name) {
          validateStringLength(args.name as string, 'name', 255);
        }
        if (args.startDate) {
          validateDateTimeFormat(args.startDate as string, 'startDate');
        }
        if (args.endDate) {
          validateDateTimeFormat(args.endDate as string, 'endDate');
        }
        if (args.registrationsLimit) {
          validatePositiveNumber(args.registrationsLimit as number, 'registrationsLimit');
        }

        const body: Record<string, unknown> = {
          Id: eventId,
        };

        const changes: string[] = [];

        if (args.name !== undefined) {
          body.Name = args.name;
          changes.push(`Name="${args.name}"`);
        }
        if (args.startDate !== undefined) {
          body.StartDate = args.startDate;
          changes.push(`StartDate=${args.startDate}`);
        }
        if (args.endDate !== undefined) {
          body.EndDate = args.endDate;
          changes.push(`EndDate=${args.endDate}`);
        }
        if (args.location !== undefined) {
          body.Location = args.location;
          changes.push(`Location="${args.location}"`);
        }
        if (args.descriptionHtml !== undefined) {
          body.DescriptionHtml = args.descriptionHtml;
          changes.push(`DescriptionHtml (updated)`);
        }
        if (args.registrationEnabled !== undefined) {
          body.RegistrationEnabled = args.registrationEnabled;
          changes.push(`RegistrationEnabled=${args.registrationEnabled}`);
        }
        if (args.registrationsLimit !== undefined) {
          body.RegistrationsLimit = args.registrationsLimit;
          changes.push(`RegistrationsLimit=${args.registrationsLimit}`);
        }
        if (args.tags !== undefined) {
          body.Tags = args.tags;
          changes.push(`Tags=[${(args.tags as string[]).join(', ')}]`);
        }

        const operation = createPendingOperation(
          'PUT',
          `/events/${eventId}`,
          body,
          `Update event ID ${eventId}: ${changes.join(', ')}`,
          'update_event'
        );

        return {
          status: 'PENDING_CONFIRMATION',
          operationId: operation.id,
          message: `Event update staged. To execute, call confirm_operation with operationId: ${operation.id}`,
          preview: {
            action: 'UPDATE EVENT',
            eventId,
            changes: body,
          },
          expiresIn: '5 minutes',
        };
      }
    );

    // Delete event - requires double confirmation
    registerTool(
      'delete_event',
      'Stage an event for DELETION. This is a DESTRUCTIVE operation that requires DOUBLE CONFIRMATION. The event and all its registrations will be permanently removed.',
      {
        type: 'object',
        properties: {
          eventId: { type: 'number', description: 'The event ID to delete' },
          confirmEventId: {
            type: 'number',
            description: 'Must match eventId to confirm you want to delete the correct event'
          },
        },
        required: ['eventId', 'confirmEventId'],
      },
      async (args) => {
        const eventId = args.eventId as number;
        const confirmEventId = args.confirmEventId as number;

        // Validation
        validateId(eventId, 'eventId');
        validateId(confirmEventId, 'confirmEventId');

        // First confirmation: IDs must match
        if (eventId !== confirmEventId) {
          throw new ValidationError(
            `eventId (${eventId}) and confirmEventId (${confirmEventId}) must match. ` +
            `This is a safety check to prevent accidental deletions.`
          );
        }

        // Fetch event to show what will be deleted
        const event = await client.get<Event>(`/events/${eventId}`);

        const operation = createDoubleConfirmOperation(
          'DELETE',
          `/events/${eventId}`,
          null,
          `DELETE event: "${event.Name}" (ID: ${eventId}, Date: ${event.StartDate})`,
          'delete_event'
        );

        return {
          status: 'PENDING_DOUBLE_CONFIRMATION',
          operationId: operation.id,
          message: `⚠️ DESTRUCTIVE OPERATION: Event deletion staged. This PERMANENTLY DELETES the event and ALL registrations. ` +
            `To execute, call confirm_delete with operationId: ${operation.id}`,
          warning: 'THIS CANNOT BE UNDONE - ALL REGISTRATIONS WILL BE LOST',
          preview: {
            action: 'DELETE EVENT',
            eventId,
            eventName: event.Name,
            eventDate: event.StartDate,
            confirmedRegistrations: event.ConfirmedRegistrationsCount,
            pendingRegistrations: event.PendingRegistrationsCount,
          },
          expiresIn: '5 minutes',
        };
      }
    );
  }
}
