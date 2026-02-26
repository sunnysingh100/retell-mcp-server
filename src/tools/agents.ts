import { z } from "zod";
import Retell from "retell-sdk";
import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const GetAgentSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
});

const CreateAgentSchema = z.object({
  voice_id: z.string().min(1, "voice_id is required"),
  llm_id: z.string().optional(),
  llm_websocket_url: z.string().optional(),
  conversation_flow_id: z.string().optional(),
  agent_name: z.string().optional(),
  language: z.string().optional(),
  responsiveness: z.number().min(0).max(1).optional(),
  interruption_sensitivity: z.number().min(0).max(1).optional(),
  enable_backchannel: z.boolean().optional(),
  webhook_url: z.string().optional(),
  max_call_duration_ms: z.number().min(60000).max(7200000).optional(),
});

const UpdateAgentSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
  agent_name: z.string().optional(),
  voice_id: z.string().optional(),
  language: z.string().optional(),
  responsiveness: z.number().min(0).max(1).optional(),
  interruption_sensitivity: z.number().min(0).max(1).optional(),
  enable_backchannel: z.boolean().optional(),
  webhook_url: z.string().optional(),
  max_call_duration_ms: z.number().min(60000).max(7200000).optional(),
  llm_id: z.string().optional(),
  llm_websocket_url: z.string().optional(),
  conversation_flow_id: z.string().optional(),
});

const DeleteAgentSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
});

const GetAgentVersionsSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
});

const PublishAgentSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

function buildResponseEngine(args: z.infer<typeof CreateAgentSchema>): Retell.AgentCreateParams["response_engine"] {
  if (args.llm_id) {
    return { type: "retell-llm", llm_id: args.llm_id };
  } else if (args.llm_websocket_url) {
    return { type: "custom-llm", llm_websocket_url: args.llm_websocket_url };
  } else if (args.conversation_flow_id) {
    return { type: "conversation-flow", conversation_flow_id: args.conversation_flow_id };
  }
  throw new Error(
    "One of llm_id (Retell LLM), llm_websocket_url (Custom LLM), or conversation_flow_id (Conversation Flow) must be provided."
  );
}

// ─── Tool Registrations ──────────────────────────────────────────────────────

export const agentTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_list_agents",
      description:
        "List all Retell AI voice agents in your account. Returns agent IDs, names, voice settings, and configuration.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    handler: async () => {
      const result = await retell.agent.list();
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_get_agent",
      description: "Get detailed information about a specific Retell AI agent by its ID.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The unique ID of the agent to retrieve." },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = GetAgentSchema.parse(raw);
      const result = await retell.agent.retrieve(args.agent_id);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_agent",
      description:
        "Create a new Retell AI voice agent. Requires a voice_id and one response engine: llm_id (Retell LLM), llm_websocket_url (Custom LLM), or conversation_flow_id (Conversation Flow).",
      inputSchema: {
        type: "object",
        properties: {
          voice_id: {
            type: "string",
            description:
              'Voice ID for the agent (e.g. "retell-Cimo", "11labs-Adrian"). Use retell_list_voices to see options.',
          },
          llm_id: {
            type: "string",
            description:
              "ID of the Retell LLM to use as response engine. Provide llm_id, llm_websocket_url, or conversation_flow_id.",
          },
          llm_websocket_url: {
            type: "string",
            description:
              "WebSocket URL for a custom LLM response engine. Provide llm_id, llm_websocket_url, or conversation_flow_id.",
          },
          conversation_flow_id: {
            type: "string",
            description:
              "ID of a Conversation Flow to use as response engine. Use retell_list_conversation_flows to find IDs. Provide llm_id, llm_websocket_url, or conversation_flow_id.",
          },
          agent_name: { type: "string", description: "Optional display name for the agent." },
          language: {
            type: "string",
            description: 'Language code for the agent (default: "en-US").',
          },
          responsiveness: {
            type: "number",
            description: "Agent responsiveness (0.0–1.0). Higher = faster responses.",
          },
          interruption_sensitivity: {
            type: "number",
            description: "Sensitivity to user interruptions (0.0–1.0).",
          },
          enable_backchannel: {
            type: "boolean",
            description: 'Enable acknowledgement filler words like "uh-huh", "yeah".',
          },
          webhook_url: { type: "string", description: "Webhook URL to receive call events." },
          max_call_duration_ms: {
            type: "number",
            description: "Maximum call duration in ms (min: 60000, max: 7200000).",
          },
        },
        required: ["voice_id"],
      },
    },
    handler: async (raw) => {
      const args = CreateAgentSchema.parse(raw);
      const response_engine = buildResponseEngine(args);
      const createParams: Retell.AgentCreateParams = {
        response_engine,
        voice_id: args.voice_id,
      };
      if (args.agent_name !== undefined) createParams.agent_name = args.agent_name;
      if (args.language !== undefined)
        createParams.language = args.language as Retell.AgentCreateParams["language"];
      if (args.responsiveness !== undefined) createParams.responsiveness = args.responsiveness;
      if (args.interruption_sensitivity !== undefined)
        createParams.interruption_sensitivity = args.interruption_sensitivity;
      if (args.enable_backchannel !== undefined) createParams.enable_backchannel = args.enable_backchannel;
      if (args.webhook_url !== undefined) createParams.webhook_url = args.webhook_url;
      if (args.max_call_duration_ms !== undefined) createParams.max_call_duration_ms = args.max_call_duration_ms;
      const result = await retell.agent.create(createParams);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_update_agent",
      description:
        "Update an existing Retell AI agent's configuration, including switching to a different response engine type (Retell LLM, Custom LLM, or Conversation Flow).",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The unique ID of the agent to update." },
          agent_name: { type: "string", description: "New display name." },
          voice_id: { type: "string", description: "New voice ID." },
          language: { type: "string", description: "New language code." },
          responsiveness: { type: "number", description: "New responsiveness (0.0–1.0)." },
          interruption_sensitivity: {
            type: "number",
            description: "New interruption sensitivity (0.0–1.0).",
          },
          enable_backchannel: { type: "boolean", description: "Enable/disable backchannel." },
          webhook_url: { type: "string", description: "New webhook URL." },
          max_call_duration_ms: {
            type: "number",
            description: "New max call duration in ms.",
          },
          llm_id: {
            type: "string",
            description: "Switch to a Retell LLM response engine by providing its ID.",
          },
          llm_websocket_url: {
            type: "string",
            description: "Switch to a custom LLM response engine by providing its WebSocket URL.",
          },
          conversation_flow_id: {
            type: "string",
            description: "Switch to a Conversation Flow response engine by providing its ID.",
          },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = UpdateAgentSchema.parse(raw);
      const updateParams: Retell.AgentUpdateParams = {};
      if (args.agent_name !== undefined) updateParams.agent_name = args.agent_name;
      if (args.voice_id !== undefined) updateParams.voice_id = args.voice_id;
      if (args.language !== undefined)
        updateParams.language = args.language as Retell.AgentUpdateParams["language"];
      if (args.responsiveness !== undefined) updateParams.responsiveness = args.responsiveness;
      if (args.interruption_sensitivity !== undefined)
        updateParams.interruption_sensitivity = args.interruption_sensitivity;
      if (args.enable_backchannel !== undefined) updateParams.enable_backchannel = args.enable_backchannel;
      if (args.webhook_url !== undefined) updateParams.webhook_url = args.webhook_url;
      if (args.max_call_duration_ms !== undefined) updateParams.max_call_duration_ms = args.max_call_duration_ms;
      if (args.llm_id) {
        updateParams.response_engine = { type: "retell-llm", llm_id: args.llm_id };
      } else if (args.llm_websocket_url) {
        updateParams.response_engine = { type: "custom-llm", llm_websocket_url: args.llm_websocket_url };
      } else if (args.conversation_flow_id) {
        updateParams.response_engine = {
          type: "conversation-flow",
          conversation_flow_id: args.conversation_flow_id,
        };
      }
      const result = await retell.agent.update(args.agent_id, updateParams);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_delete_agent",
      description: "Permanently delete a Retell AI agent by its ID.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The unique ID of the agent to delete." },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = DeleteAgentSchema.parse(raw);
      await retell.agent.delete(args.agent_id);
      return JSON.stringify({ success: true, message: `Agent ${args.agent_id} deleted.` });
    },
  },

  {
    definition: {
      name: "retell_get_agent_versions",
      description: "Get all published versions of a Retell AI voice agent.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The unique ID of the agent." },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = GetAgentVersionsSchema.parse(raw);
      const result = await retell.agent.getVersions(args.agent_id);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_publish_agent",
      description:
        "Publish the latest draft version of a voice agent, creating a new immutable version and starting a fresh draft.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The unique ID of the agent to publish." },
        },
        required: ["agent_id"],
      },
    },
    handler: async (raw) => {
      const args = PublishAgentSchema.parse(raw);
      const result = await retell.agent.publish(args.agent_id);
      return JSON.stringify(result, null, 2);
    },
  },
];
