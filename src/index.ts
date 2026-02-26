#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";

// Side-effect import: validates RETELL_API_KEY and initialises the SDK client.
import "./client.js";

import { ALL_TOOLS, toolHandlerMap } from "./tools/index.js";

// ─── MCP Server Setup ─────────────────────────────────────────────────────────
// Using the low-level Server class directly (not the McpServer high-level
// wrapper) so we can register raw JSON-Schema tool definitions and keep a
// single consistent pattern throughout.

const server = new Server(
  {
    name: "retell-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ── List Tools ─────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOLS.map((t) => t.definition),
}));

// ── Call Tool ──────────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const handler = toolHandlerMap.get(name);

  if (!handler) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { error: true, message: `Unknown tool: ${name}` },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await handler(rawArgs ?? {});
    return {
      content: [{ type: "text", text: result }],
    };
  } catch (err) {
    const error = err as Error & { status?: number; error?: unknown };

    // Provide user-friendly messages for Zod validation failures
    if (err instanceof ZodError) {
      const issues = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { error: true, message: `Validation failed: ${issues}` },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    const errorResult: Record<string, unknown> = {
      error: true,
      message: error.message,
    };
    if (error.status !== undefined) errorResult.status = error.status;
    if (error.error !== undefined) errorResult.details = error.error;

    return {
      content: [{ type: "text", text: JSON.stringify(errorResult, null, 2) }],
      isError: true,
    };
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr intentionally — stdout is reserved for the MCP JSON-RPC protocol
  // when using stdio transport. All diagnostic/startup messages must go to stderr.
  console.error("Retell AI MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
