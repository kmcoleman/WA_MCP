/**
 * Pending operations manager for write confirmation
 * Stores operations that require user confirmation before execution
 */

import type { WildApricotClient } from './client.js';

export interface PendingOperation {
  id: string;
  type: 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  body: unknown;
  description: string;
  createdAt: number;
  toolName: string;
  requiresDoubleConfirm: boolean;
}

// Store pending operations in memory (keyed by operation ID)
const pendingOperations: Map<string, PendingOperation> = new Map();

// Operations expire after 5 minutes
const OPERATION_EXPIRY_MS = 5 * 60 * 1000;

function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function cleanExpiredOperations(): void {
  const now = Date.now();
  for (const [id, op] of pendingOperations) {
    if (now - op.createdAt > OPERATION_EXPIRY_MS) {
      pendingOperations.delete(id);
    }
  }
}

export function createPendingOperation(
  type: 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  body: unknown,
  description: string,
  toolName: string
): PendingOperation {
  cleanExpiredOperations();

  const operation: PendingOperation = {
    id: generateOperationId(),
    type,
    endpoint,
    body,
    description,
    createdAt: Date.now(),
    toolName,
    requiresDoubleConfirm: false,
  };

  pendingOperations.set(operation.id, operation);
  return operation;
}

export function createDoubleConfirmOperation(
  type: 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  body: unknown,
  description: string,
  toolName: string
): PendingOperation {
  cleanExpiredOperations();

  const operation: PendingOperation = {
    id: generateOperationId(),
    type,
    endpoint,
    body,
    description,
    createdAt: Date.now(),
    toolName,
    requiresDoubleConfirm: true,
  };

  pendingOperations.set(operation.id, operation);
  return operation;
}

export function getPendingOperation(id: string): PendingOperation | undefined {
  cleanExpiredOperations();
  return pendingOperations.get(id);
}

export function removePendingOperation(id: string): boolean {
  return pendingOperations.delete(id);
}

export function listPendingOperations(): PendingOperation[] {
  cleanExpiredOperations();
  return Array.from(pendingOperations.values());
}

export async function executeOperation(
  client: WildApricotClient,
  operation: PendingOperation
): Promise<unknown> {
  // Remove from pending before execution
  pendingOperations.delete(operation.id);

  switch (operation.type) {
    case 'POST':
      return client.post(operation.endpoint, operation.body);
    case 'PUT':
      return client.put(operation.endpoint, operation.body);
    case 'DELETE':
      await client.delete(operation.endpoint);
      return { success: true, message: 'Deleted successfully' };
    default:
      throw new Error(`Unknown operation type: ${operation.type}`);
  }
}

export function registerConfirmationTools(
  client: WildApricotClient,
  registerTool: (
    name: string,
    description: string,
    schema: object,
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ) => void
) {
  // Standard confirmation for create/update operations
  registerTool(
    'confirm_operation',
    'Confirm and execute a pending write operation (create/update). REQUIRED before any create/update operation is actually performed. Does NOT work for delete operations - use confirm_delete instead.',
    {
      type: 'object',
      properties: {
        operationId: {
          type: 'string',
          description: 'The operation ID returned by the write tool',
        },
      },
      required: ['operationId'],
    },
    async (args) => {
      const operationId = args.operationId as string;
      const operation = getPendingOperation(operationId);

      if (!operation) {
        throw new Error(
          `Operation ${operationId} not found. It may have expired (5 minute limit) or already been executed/cancelled.`
        );
      }

      // Reject if this is a double-confirm operation
      if (operation.requiresDoubleConfirm) {
        throw new Error(
          `Operation ${operationId} requires double confirmation because it is a DESTRUCTIVE operation (${operation.toolName}). ` +
          `Use confirm_delete instead of confirm_operation.`
        );
      }

      const result = await executeOperation(client, operation);
      return {
        success: true,
        message: `Operation confirmed and executed: ${operation.description}`,
        result,
      };
    }
  );

  // Double confirmation for delete operations
  registerTool(
    'confirm_delete',
    '⚠️ DESTRUCTIVE: Confirm and execute a pending DELETE operation. This is for PERMANENT DELETIONS only. Requires typing "DELETE" to confirm.',
    {
      type: 'object',
      properties: {
        operationId: {
          type: 'string',
          description: 'The operation ID returned by the delete tool',
        },
        confirmText: {
          type: 'string',
          description: 'Must be exactly "DELETE" (all caps) to confirm the destructive operation',
        },
      },
      required: ['operationId', 'confirmText'],
    },
    async (args) => {
      const operationId = args.operationId as string;
      const confirmText = args.confirmText as string;

      // Check confirmation text
      if (confirmText !== 'DELETE') {
        throw new Error(
          `Confirmation failed. You must provide confirmText: "DELETE" (all caps) to confirm a delete operation. ` +
          `You provided: "${confirmText}"`
        );
      }

      const operation = getPendingOperation(operationId);

      if (!operation) {
        throw new Error(
          `Operation ${operationId} not found. It may have expired (5 minute limit) or already been executed/cancelled.`
        );
      }

      // Verify this is actually a double-confirm operation
      if (!operation.requiresDoubleConfirm) {
        throw new Error(
          `Operation ${operationId} is not a delete operation. Use confirm_operation instead.`
        );
      }

      const result = await executeOperation(client, operation);
      return {
        success: true,
        message: `⚠️ DELETED: ${operation.description}`,
        warning: 'This action cannot be undone.',
        result,
      };
    }
  );

  registerTool(
    'cancel_operation',
    'Cancel a pending write operation without executing it',
    {
      type: 'object',
      properties: {
        operationId: {
          type: 'string',
          description: 'The operation ID to cancel',
        },
      },
      required: ['operationId'],
    },
    async (args) => {
      const operationId = args.operationId as string;
      const operation = getPendingOperation(operationId);

      if (!operation) {
        return {
          success: false,
          message: `Operation ${operationId} not found. It may have expired or already been executed/cancelled.`,
        };
      }

      removePendingOperation(operationId);
      return {
        success: true,
        message: `Operation cancelled: ${operation.description}`,
      };
    }
  );

  registerTool(
    'list_pending_operations',
    'List all pending write operations awaiting confirmation',
    {
      type: 'object',
      properties: {},
      required: [],
    },
    async () => {
      const operations = listPendingOperations();
      return {
        count: operations.length,
        operations: operations.map(op => ({
          id: op.id,
          toolName: op.toolName,
          description: op.description,
          requiresDoubleConfirm: op.requiresDoubleConfirm,
          confirmWith: op.requiresDoubleConfirm ? 'confirm_delete' : 'confirm_operation',
          createdAt: new Date(op.createdAt).toISOString(),
          expiresIn: Math.round((OPERATION_EXPIRY_MS - (Date.now() - op.createdAt)) / 1000) + ' seconds',
        })),
      };
    }
  );
}
