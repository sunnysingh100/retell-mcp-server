import { z } from "zod";
import Retell from "retell-sdk";
import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const GetChatAgentSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
});

const CreateChatAgentSchema = z.object({
  llm_id: z.string().optional(),
  llm_websocket_url: z.string().optional(),
  conversation_flow_id: z.string().optional(),
  agent_name: z.string().optional(),
  language: z.string().optional(),
  webhook_url: z.string().optional(),
});

const UpdateChatAgentSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
  llm_id: z.string().optional(),
  llm_websocket_url: z.string().optional(),
  conversation_flow_id: z.string().optional(),
  agent_name: z.string().optional(),
  language: z.string().optional(),
  webhook_url: z.string().optional(),
});

const DeleteChatAgentSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
});

const GetChatAgentVersionsSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
});

const PublishChatAgentSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildChatResponseEngine(
  args: z.infer<typeof CreateChatAgentSchema>
): Retell.ChatAgentCreateParams["response_engine"] | undefined {
  if (args.llm_id) {
    return { type: "retell-llm", llm_id: args.llm_id };
  } else if (args.llm_websocket_url) {
    return { type: "custom-llm", llm_websocket_url: args.llm_websocket_url };
  } else if (args.conversation_flow_id) {
    return { type: "conversation-flow", conversation_flow_id: args.conversation_flow_id };
  }
  return undefined;
}

// ─── Tool Registrations ──────────────────────────────────────────────────────

export const chatAgentTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_list_chat_agents",
      description: "List all chat (text/messaging) agents in your Retell AI account.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    handler: async () => {
      const result = await retell.chatAgent.list();
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_get_chat_agent",
      description: "Get details of a specific chat agent by its ID.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The unique ID of the chat agent." },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = GetChatAgentSchema.parse(raw);
      const result = await retell.chatAgent.retrieve(args.agent_id);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_chat_agent",
      description:
        "Create a new chat (text/messaging) agent. Requires a response_engine (llm_id, llm_websocket_url, or conversation_flow_id).",
      inputSchema: {
        type: "object",
        properties: {
          llm_id: { type: "string", description: "Retell LLM ID to use as response engine." },
          llm_websocket_url: { type: "string", description: "Custom LLM WebSocket URL." },
          conversation_flow_id: { type: "string", description: "Conversation Flow ID to use." },
          agent_name: { type: "string", description: "Display name for the chat agent." },
          language: { type: "string", description: "Language code (default: en-US)." },
          webhook_url: { type: "string", description: "Webhook URL for chat events." },
        },
        required: [],
      },
    },
    handler: async (raw) => {
      const args = CreateChatAgentSchema.parse(raw);
      const response_engine = buildChatResponseEngine(args);
      if (!response_engine) {
        throw new Error(
          "One of llm_id, llm_websocket_url, or conversation_flow_id must be provided."
        );
      }
      const params: Retell.ChatAgentCreateParams = { response_engine };
      if (args.agent_name !== undefined) params.agent_name = args.agent_name;
      if (args.language !== undefined)
        params.language = args.language as Retell.ChatAgentCreateParams["language"];
      if (args.webhook_url !== undefined) params.webhook_url = args.webhook_url;
      const result = await retell.chatAgent.create(params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_update_chat_agent",
      description: "Update an existing chat agent's configuration.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The unique ID of the chat agent to update." },
          llm_id: { type: "string", description: "Switch to this Retell LLM." },
          llm_websocket_url: { type: "string", description: "Switch to this custom LLM URL." },
          conversation_flow_id: { type: "string", description: "Switch to this Conversation Flow." },
          agent_name: { type: "string", description: "New display name." },
          language: { type: "string", description: "New language code." },
          webhook_url: { type: "string", description: "New webhook URL." },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = UpdateChatAgentSchema.parse(raw);
      const params: Retell.ChatAgentUpdateParams = {};
      const response_engine = buildChatResponseEngine(args);
      if (response_engine)
        params.response_engine = response_engine as Retell.ChatAgentUpdateParams["response_engine"];
      if (args.agent_name !== undefined) params.agent_name = args.agent_name;
      if (args.language !== undefined)
        params.language = args.language as Retell.ChatAgentUpdateParams["language"];
      if (args.webhook_url !== undefined) params.webhook_url = args.webhook_url;
      const result = await retell.chatAgent.update(args.agent_id, params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_delete_chat_agent",
      description: "Permanently delete a chat agent by its ID.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The unique ID of the chat agent to delete." },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = DeleteChatAgentSchema.parse(raw);
      await retell.chatAgent.delete(args.agent_id);
      return JSON.stringify({ success: true, message: `Chat agent ${args.agent_id} deleted.` });
    },
  },

  {
    definition: {
      name: "retell_get_chat_agent_versions",
      description: "Get all published versions of a chat agent.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The unique ID of the chat agent." },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = GetChatAgentVersionsSchema.parse(raw);
      const result = await retell.chatAgent.getVersions(args.agent_id);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_publish_chat_agent",
      description: "Publish the latest draft of a chat agent, creating a new immutable version.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The unique ID of the chat agent to publish." },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = PublishChatAgentSchema.parse(raw);
      const result = await retell.chatAgent.publish(args.agent_id);
      return JSON.stringify(result, null, 2);
    },
  },
];
