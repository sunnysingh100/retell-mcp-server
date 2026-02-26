import { z } from "zod";
import Retell from "retell-sdk";
import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const ListCallsSchema = z.object({
  filter_criteria: z
    .object({
      agent_id: z.array(z.string()).optional(),
      call_status: z.array(z.string()).optional(),
      before_start_timestamp: z.number().optional(),
      after_start_timestamp: z.number().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(1000).optional(),
  sort_order: z.enum(["ascending", "descending"]).optional(),
  pagination_key: z.string().optional(),
});

const GetCallSchema = z.object({
  call_id: z.string().min(1, "call_id is required"),
});

const CreatePhoneCallSchema = z.object({
  from_number: z.string().min(1, "from_number is required"),
  to_number: z.string().min(1, "to_number is required"),
  override_agent_id: z.string().optional(),
  retell_llm_dynamic_variables: z.record(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const CreateWebCallSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
  retell_llm_dynamic_variables: z.record(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const DeleteCallSchema = z.object({
  call_id: z.string().min(1, "call_id is required"),
});

const UpdateCallSchema = z.object({
  call_id: z.string().min(1, "call_id is required"),
  metadata: z.record(z.unknown()).optional(),
  data_storage_setting: z
    .enum(["everything", "everything_except_pii", "basic_attributes_only"])
    .optional(),
});

const RegisterPhoneCallSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
  from_number: z.string().optional(),
  to_number: z.string().optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  metadata: z.record(z.unknown()).optional(),
  retell_llm_dynamic_variables: z.record(z.string()).optional(),
});

// ─── Tool Registrations ──────────────────────────────────────────────────────

export const callTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_list_calls",
      description:
        "List calls in your Retell AI account. Supports filtering by agent ID, status, and date range. Supports pagination via pagination_key.",
      inputSchema: {
        type: "object",
        properties: {
          filter_criteria: {
            type: "object",
            description: "Optional filter criteria.",
            properties: {
              agent_id: {
                type: "array",
                items: { type: "string" },
                description: "Filter by agent IDs.",
              },
              call_status: {
                type: "array",
                items: { type: "string" },
                description: 'Filter by status: "registered", "ongoing", "ended", "error".',
              },
              before_start_timestamp: {
                type: "number",
                description: "Unix ms — return calls before this time.",
              },
              after_start_timestamp: {
                type: "number",
                description: "Unix ms — return calls after this time.",
              },
            },
          },
          limit: { type: "number", description: "Max number of calls to return (1–1000)." },
          sort_order: {
            type: "string",
            enum: ["ascending", "descending"],
            description: "Sort order by start timestamp.",
          },
          pagination_key: {
            type: "string",
            description:
              "Pagination cursor from a previous response. Pass this to get the next page of results.",
          },
        },
        required: [],
      },
    },
    handler: async (raw) => {
      const args = ListCallsSchema.parse(raw);
      const listParams: Retell.CallListParams = {};
      if (args.filter_criteria !== undefined) {
        listParams.filter_criteria = args.filter_criteria as Retell.CallListParams["filter_criteria"];
      }
      if (args.limit !== undefined) listParams.limit = args.limit;
      if (args.sort_order !== undefined) listParams.sort_order = args.sort_order;
      if (args.pagination_key !== undefined) listParams.pagination_key = args.pagination_key;
      const result = await retell.call.list(listParams);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_get_call",
      description:
        "Get full details of a specific call including transcript, recording URL, latency, and cost.",
      inputSchema: {
        type: "object",
        properties: {
          call_id: { type: "string", description: "The unique ID of the call to retrieve." },
        },
        required: ["call_id"],
      },
    },
    handler: async (raw) => {
      const args = GetCallSchema.parse(raw);
      const result = await retell.call.retrieve(args.call_id);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_phone_call",
      description:
        "Initiate an outbound phone call via a Retell AI agent. Requires a purchased from_number and a destination to_number.",
      inputSchema: {
        type: "object",
        properties: {
          from_number: {
            type: "string",
            description: 'Your Retell purchased phone number (e.g. "+14157774444").',
          },
          to_number: {
            type: "string",
            description: 'The destination phone number (e.g. "+12137774445").',
          },
          override_agent_id: {
            type: "string",
            description: "Override the default agent bound to the from_number for this call.",
          },
          retell_llm_dynamic_variables: {
            type: "object",
            description: "Dynamic variables to inject into the LLM prompt for this specific call.",
            additionalProperties: { type: "string" },
          },
          metadata: {
            type: "object",
            description: "Custom key-value metadata to attach to the call.",
            additionalProperties: {},
          },
        },
        required: ["from_number", "to_number"],
      },
    },
    handler: async (raw) => {
      const args = CreatePhoneCallSchema.parse(raw);
      const params: Retell.CallCreatePhoneCallParams = {
        from_number: args.from_number,
        to_number: args.to_number,
      };
      if (args.override_agent_id !== undefined) params.override_agent_id = args.override_agent_id;
      if (args.retell_llm_dynamic_variables !== undefined)
        params.retell_llm_dynamic_variables = args.retell_llm_dynamic_variables;
      if (args.metadata !== undefined)
        params.metadata = args.metadata as Record<string, unknown>;
      const result = await retell.call.createPhoneCall(params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_web_call",
      description:
        "Create a browser-based web call with a Retell AI agent. Returns an access_token for the Retell Web SDK.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The agent ID to use for this web call." },
          retell_llm_dynamic_variables: {
            type: "object",
            description: "Dynamic variables to inject into the LLM prompt.",
            additionalProperties: { type: "string" },
          },
          metadata: {
            type: "object",
            description: "Custom key-value metadata to attach to the call.",
            additionalProperties: {},
          },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = CreateWebCallSchema.parse(raw);
      const params: Retell.CallCreateWebCallParams = { agent_id: args.agent_id };
      if (args.retell_llm_dynamic_variables !== undefined)
        params.retell_llm_dynamic_variables = args.retell_llm_dynamic_variables;
      if (args.metadata !== undefined)
        params.metadata = args.metadata as Record<string, unknown>;
      const result = await retell.call.createWebCall(params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_delete_call",
      description: "Delete a call record from your Retell AI account.",
      inputSchema: {
        type: "object",
        properties: {
          call_id: { type: "string", description: "The unique ID of the call to delete." },
        },
        required: ["call_id"],
      },
    },
    handler: async (raw) => {
      const args = DeleteCallSchema.parse(raw);
      await retell.call.delete(args.call_id);
      return JSON.stringify({ success: true, message: `Call ${args.call_id} deleted.` });
    },
  },

  {
    definition: {
      name: "retell_update_call",
      description: "Update metadata or data storage settings for an existing call.",
      inputSchema: {
        type: "object",
        properties: {
          call_id: { type: "string", description: "The unique ID of the call to update." },
          metadata: {
            type: "object",
            description: "Arbitrary metadata object to attach to the call.",
            additionalProperties: {},
          },
          data_storage_setting: {
            type: "string",
            enum: ["everything", "everything_except_pii", "basic_attributes_only"],
            description: "Override data storage setting for this call.",
          },
        },
        required: ["call_id"],
      },
    },
    handler: async (raw) => {
      const args = UpdateCallSchema.parse(raw);
      const params: Retell.CallUpdateParams = {};
      if (args.metadata !== undefined)
        params.metadata = args.metadata as Record<string, unknown>;
      if (args.data_storage_setting !== undefined)
        params.data_storage_setting = args.data_storage_setting;
      const result = await retell.call.update(args.call_id, params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_register_phone_call",
      description:
        "Register a phone call for custom telephony (bring-your-own telephony). Returns call_id and access_token for the audio websocket.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The agent to handle this call." },
          from_number: { type: "string", description: "Caller number in E.164 format." },
          to_number: { type: "string", description: "Callee number in E.164 format." },
          direction: {
            type: "string",
            enum: ["inbound", "outbound"],
            description: "Direction of the phone call.",
          },
          metadata: {
            type: "object",
            description: "Optional metadata.",
            additionalProperties: {},
          },
          retell_llm_dynamic_variables: {
            type: "object",
            description: "Dynamic variables to inject.",
            additionalProperties: { type: "string" },
          },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = RegisterPhoneCallSchema.parse(raw);
      const params: Retell.CallRegisterPhoneCallParams = { agent_id: args.agent_id };
      if (args.from_number !== undefined) params.from_number = args.from_number;
      if (args.to_number !== undefined) params.to_number = args.to_number;
      if (args.direction !== undefined) params.direction = args.direction;
      if (args.metadata !== undefined)
        params.metadata = args.metadata as Record<string, unknown>;
      if (args.retell_llm_dynamic_variables !== undefined)
        params.retell_llm_dynamic_variables = args.retell_llm_dynamic_variables;
      const result = await retell.call.registerPhoneCall(params);
      return JSON.stringify(result, null, 2);
    },
  },
];
