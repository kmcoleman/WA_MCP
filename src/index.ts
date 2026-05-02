#!/usr/bin/env node

/**
 * Wild Apricot MCP Server
 *
 * A Model Context Protocol server for interacting with Wild Apricot API.
 * Supports reading and optionally writing contacts, events, registrations,
 * membership levels, invoices, and account information.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createServer } from 'http';

import { loadConfig } from './config.js';
import { createClient } from './client.js';
import { registerAllTools } from './tools/index.js';

// Tool registry
const tools: Map<string, Tool> = new Map();
const handlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>> = new Map();

function registerTool(
  name: string,
  description: string,
  inputSchema: object,
  handler: (args: Record<string, unknown>) => Promise<unknown>
) {
  tools.set(name, {
    name,
    description,
    inputSchema: inputSchema as Tool['inputSchema'],
  });
  handlers.set(name, handler);
}

async function main() {
  // Load configuration
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error('Configuration error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Create API client
  const client = createClient(config);

  // Register all tools
  registerAllTools(client, config.readOnly, registerTool);

  // Create MCP server
  const server = new Server(
    {
      name: 'wildapricot-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Array.from(tools.values()),
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const handler = handlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await handler(args || {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start server
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : null;

  if (port) {
    const httpServer = createServer(async (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    });
    httpServer.listen(port, () => {
      console.error(`Wild Apricot MCP server running on http://localhost:${port}`);
      console.error(`Registered ${tools.size} tools`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Wild Apricot MCP server started (read-only: ${config.readOnly})`);
    console.error(`Registered ${tools.size} tools`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
