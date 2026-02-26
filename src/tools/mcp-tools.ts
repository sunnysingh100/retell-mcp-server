import { z } from "zod";
import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const GetMcpToolsSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
  mcp_id: z.string().min(1, "mcp_id is required"),
  version: z.number().optional(),
});

// ─── Tool Registrations ──────────────────────────────────────────────────────

export const mcpToolTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_get_mcp_tools",
      description:
        "Get the list of MCP tools available from a specific MCP server configured on a Retell agent.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: {
            type: "string",
            description: "The agent ID whose MCP tools to retrieve.",
          },
          mcp_id: {
            type: "string",
            description: "The ID of the MCP server to get tools from.",
          },
          version: {
            type: "number",
            description: "Optional agent version. Defaults to latest.",
          },
        },
        required: ["agent_id", "mcp_id"],
      },
    },
    handler: async (raw) => {
      const args = GetMcpToolsSchema.parse(raw);
      const query: { mcp_id: string; version?: number } = { mcp_id: args.mcp_id };
      if (args.version !== undefined) query.version = args.version;
      const result = await retell.mcpTool.getMcpTools(args.agent_id, query);
      return JSON.stringify(result, null, 2);
    },
  },
];
