/**
 * Input validation utilities
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid email format: "${email}"`);
  }
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDateFormat(date: string, fieldName: string): void {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new ValidationError(`Invalid date format for ${fieldName}: "${date}". Expected YYYY-MM-DD`);
  }

  // Check if it's a valid date
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError(`Invalid date value for ${fieldName}: "${date}"`);
  }
}

/**
 * Validate ISO 8601 datetime format
 */
export function validateDateTimeFormat(datetime: string, fieldName: string): void {
  const parsed = new Date(datetime);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError(`Invalid datetime for ${fieldName}: "${datetime}". Expected ISO 8601 format (e.g., 2024-01-15T10:00:00)`);
  }
}

/**
 * Validate required field is not empty
 */
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: number, fieldName: string): void {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    throw new ValidationError(`${fieldName} must be a positive number`);
  }
}

/**
 * Validate positive integer (for IDs)
 */
export function validateId(value: number, fieldName: string): void {
  if (typeof value !== 'number' || isNaN(value) || value <= 0 || !Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }
}

/**
 * Validate string length
 */
export function validateStringLength(value: string, fieldName: string, maxLength: number): void {
  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
}

/**
 * Validate enum value
 */
export function validateEnum(value: string, fieldName: string, allowedValues: string[]): void {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(`Invalid ${fieldName}: "${value}". Allowed values: ${allowedValues.join(', ')}`);
  }
}

/**
 * Validate contact status
 */
export function validateContactStatus(status: string): void {
  const validStatuses = ['Active', 'Lapsed', 'PendingNew', 'PendingRenewal', 'PendingUpgrade'];
  validateEnum(status, 'status', validStatuses);
}

/**
 * Validate event access level
 */
export function validateAccessLevel(accessLevel: string): void {
  const validLevels = ['Public', 'AdminOnly', 'Restricted'];
  validateEnum(accessLevel, 'accessLevel', validLevels);
}
