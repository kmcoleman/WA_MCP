/**
 * CSV export utilities
 */

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * Convert an array of objects to CSV string
 */
export function objectsToCsv(data: Record<string, unknown>[], columns?: string[]): string {
  if (data.length === 0) {
    return '';
  }

  // Determine columns - either specified or from first object
  const cols = columns || Object.keys(data[0]);

  // Header row
  const header = cols.map(col => escapeCsvValue(col)).join(',');

  // Data rows
  const rows = data.map(row => {
    return cols.map(col => {
      const value = row[col];
      // Handle nested objects by stringifying
      if (typeof value === 'object' && value !== null) {
        return escapeCsvValue(JSON.stringify(value));
      }
      return escapeCsvValue(value);
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Flatten a contact object for CSV export
 */
export function flattenContact(contact: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {
    Id: contact.Id,
    FirstName: contact.FirstName,
    LastName: contact.LastName,
    Email: contact.Email,
    DisplayName: contact.DisplayName,
    Organization: contact.Organization,
    Status: contact.Status,
    MembershipEnabled: contact.MembershipEnabled,
    IsArchived: contact.IsArchived,
  };

  // Flatten membership level
  if (contact.MembershipLevel && typeof contact.MembershipLevel === 'object') {
    const ml = contact.MembershipLevel as Record<string, unknown>;
    flat.MembershipLevelId = ml.Id;
    flat.MembershipLevelName = ml.Name;
  }

  // Flatten field values into columns
  if (Array.isArray(contact.FieldValues)) {
    for (const field of contact.FieldValues) {
      if (field && typeof field === 'object') {
        const fieldName = (field as Record<string, unknown>).FieldName;
        const fieldValue = (field as Record<string, unknown>).Value;
        if (fieldName) {
          flat[`Field_${fieldName}`] = fieldValue;
        }
      }
    }
  }

  return flat;
}

/**
 * Flatten a registration object for CSV export
 */
export function flattenRegistration(reg: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {
    Id: reg.Id,
    RegistrationDate: reg.RegistrationDate,
    Status: reg.Status,
    IsCheckedIn: reg.IsCheckedIn,
    IsPaid: reg.IsPaid,
    RegistrationFee: reg.RegistrationFee,
    PaidSum: reg.PaidSum,
    OnWaitlist: reg.OnWaitlist,
    Memo: reg.Memo,
  };

  // Flatten event
  if (reg.Event && typeof reg.Event === 'object') {
    const event = reg.Event as Record<string, unknown>;
    flat.EventId = event.Id;
    flat.EventName = event.Name;
  }

  // Flatten contact
  if (reg.Contact && typeof reg.Contact === 'object') {
    const contact = reg.Contact as Record<string, unknown>;
    flat.ContactId = contact.Id;
    flat.ContactName = contact.Name;
  }

  // Flatten registration type
  if (reg.RegistrationType && typeof reg.RegistrationType === 'object') {
    const rt = reg.RegistrationType as Record<string, unknown>;
    flat.RegistrationTypeId = rt.Id;
    flat.RegistrationTypeName = rt.Name;
  }

  // Flatten registration fields
  if (Array.isArray(reg.RegistrationFields)) {
    for (const field of reg.RegistrationFields) {
      if (field && typeof field === 'object') {
        const fieldName = (field as Record<string, unknown>).FieldName;
        const fieldValue = (field as Record<string, unknown>).Value;
        if (fieldName) {
          flat[`Field_${fieldName}`] = fieldValue;
        }
      }
    }
  }

  return flat;
}

/**
 * Flatten an event object for CSV export
 */
export function flattenEvent(event: Record<string, unknown>): Record<string, unknown> {
  return {
    Id: event.Id,
    Name: event.Name,
    StartDate: event.StartDate,
    EndDate: event.EndDate,
    Location: event.Location,
    RegistrationEnabled: event.RegistrationEnabled,
    RegistrationsLimit: event.RegistrationsLimit,
    ConfirmedRegistrationsCount: event.ConfirmedRegistrationsCount,
    CheckedInAttendeesNumber: event.CheckedInAttendeesNumber,
    PendingRegistrationsCount: event.PendingRegistrationsCount,
    Tags: Array.isArray(event.Tags) ? event.Tags.join('; ') : event.Tags,
    AccessLevel: event.AccessLevel,
    EventType: event.EventType,
  };
}
