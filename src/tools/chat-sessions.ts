import { z } from "zod";
import Retell from "retell-sdk";
import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const GetChatSchema = z.object({
  chat_id: z.string().min(1, "chat_id is required"),
});

const CreateChatSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
  agent_version: z.number().optional(),
  retell_llm_dynamic_variables: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateChatSchema = z.object({
  chat_id: z.string().min(1, "chat_id is required"),
  metadata: z.record(z.unknown()).optional(),
  data_storage_setting: z.enum(["everything", "basic_attributes_only"]).optional(),
  override_dynamic_variables: z.record(z.string()).optional(),
});

const CreateChatCompletionSchema = z.object({
  chat_id: z.string().min(1, "chat_id is required"),
  content: z.string().min(1, "content is required"),
});

const CreateSmsChatSchema = z.object({
  from_number: z.string().min(1, "from_number is required"),
  to_number: z.string().min(1, "to_number is required"),
  override_agent_id: z.string().optional(),
  retell_llm_dynamic_variables: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const EndChatSchema = z.object({
  chat_id: z.string().min(1, "chat_id is required"),
});

// ─── Tool Registrations ──────────────────────────────────────────────────────

export const chatSessionTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_list_chats",
      description: "List all chat sessions in your Retell AI account.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    handler: async () => {
      const result = await retell.chat.list();
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_get_chat",
      description: "Get details and transcript of a specific chat session.",
      inputSchema: {
        type: "object",
        properties: {
          chat_id: { type: "string", description: "The unique ID of the chat session." },
        },
        required: ["chat_id"],
      },
    },
    handler: async (raw) => {
      const args = GetChatSchema.parse(raw);
      const result = await retell.chat.retrieve(args.chat_id);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_chat",
      description: "Start a new chat session with a chat agent.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The chat agent to use for this session." },
          agent_version: {
            type: "number",
            description: "Specific agent version to use. Defaults to latest.",
          },
          retell_llm_dynamic_variables: {
            type: "object",
            description: "Dynamic variables to inject into the prompt.",
            additionalProperties: {},
          },
          metadata: {
            type: "object",
            description: "Optional metadata to attach.",
            additionalProperties: {},
          },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = CreateChatSchema.parse(raw);
      const params: Retell.ChatCreateParams = { agent_id: args.agent_id };
      if (args.agent_version !== undefined) params.agent_version = args.agent_version;
      if (args.retell_llm_dynamic_variables !== undefined)
        params.retell_llm_dynamic_variables = args.retell_llm_dynamic_variables as Record<
          string,
          unknown
        >;
      if (args.metadata !== undefined) params.metadata = args.metadata as Record<string, unknown>;
      const result = await retell.chat.create(params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_update_chat",
      description: "Update metadata or data storage settings for an ongoing chat session.",
      inputSchema: {
        type: "object",
        properties: {
          chat_id: { type: "string", description: "The unique ID of the chat session." },
          metadata: {
            type: "object",
            description: "Metadata to update.",
            additionalProperties: {},
          },
          data_storage_setting: {
            type: "string",
            enum: ["everything", "basic_attributes_only"],
            description: "Data storage override.",
          },
          override_dynamic_variables: {
            type: "object",
            description: "Dynamic variables to override mid-session.",
            additionalProperties: { type: "string" },
          },
        },
        required: ["chat_id"],
      },
    },
    handler: async (raw) => {
      const args = UpdateChatSchema.parse(raw);
      const params: Retell.ChatUpdateParams = {};
      if (args.metadata !== undefined) params.metadata = args.metadata as Record<string, unknown>;
      if (args.data_storage_setting !== undefined)
        params.data_storage_setting = args.data_storage_setting;
      if (args.override_dynamic_variables !== undefined)
        params.override_dynamic_variables = args.override_dynamic_variables;
      const result = await retell.chat.update(args.chat_id, params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_chat_completion",
      description: "Send a user message to an ongoing chat session and get the agent's response.",
      inputSchema: {
        type: "object",
        properties: {
          chat_id: { type: "string", description: "The unique ID of the chat session." },
          content: { type: "string", description: "The user message content." },
        },
        required: ["chat_id", "content"],
      },
    },
    handler: async (raw) => {
      const args = CreateChatCompletionSchema.parse(raw);
      const result = await retell.chat.createChatCompletion({
        chat_id: args.chat_id,
        content: args.content,
      });
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_sms_chat",
      description:
        "Start an outbound SMS chat conversation using a phone number with SMS capability.",
      inputSchema: {
        type: "object",
        properties: {
          from_number: {
            type: "string",
            description: "Your Retell SMS-capable number in E.164 format.",
          },
          to_number: {
            type: "string",
            description: "The destination number in E.164 format.",
          },
          override_agent_id: {
            type: "string",
            description: "Override the default agent for this SMS chat.",
          },
          retell_llm_dynamic_variables: {
            type: "object",
            description: "Dynamic variables to inject.",
            additionalProperties: {},
          },
          metadata: {
            type: "object",
            description: "Optional metadata.",
            additionalProperties: {},
          },
        },
        required: ["from_number", "to_number"],
      },
    },
    handler: async (raw) => {
      const args = CreateSmsChatSchema.parse(raw);
      const params: Retell.ChatCreateSMSChatParams = {
        from_number: args.from_number,
        to_number: args.to_number,
      };
      if (args.override_agent_id !== undefined) params.override_agent_id = args.override_agent_id;
      if (args.retell_llm_dynamic_variables !== undefined)
        params.retell_llm_dynamic_variables = args.retell_llm_dynamic_variables as Record<
          string,
          unknown
        >;
      if (args.metadata !== undefined) params.metadata = args.metadata as Record<string, unknown>;
      const result = await retell.chat.createSMSChat(params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_end_chat",
      description: "End an ongoing chat session.",
      inputSchema: {
        type: "object",
        properties: {
          chat_id: {
            type: "string",
            description: "The unique ID of the chat session to end.",
          },
        },
        required: ["chat_id"],
      },
    },
    handler: async (raw) => {
      const args = EndChatSchema.parse(raw);
      const result = await retell.chat.end(args.chat_id);
      return JSON.stringify(result, null, 2);
    },
  },
];
