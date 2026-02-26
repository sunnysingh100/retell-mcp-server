import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * A tool definition bundled with its Zod-validated handler.
 * Each domain module exports an array of these.
 */
export interface ToolRegistration {
  /** MCP Tool definition (name, description, inputSchema) */
  definition: Tool;
  /** Handler that receives validated args and returns a JSON string result */
  handler: (args: Record<string, unknown>) => Promise<string>;
}
