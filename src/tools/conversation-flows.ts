import { z } from "zod";
import Retell from "retell-sdk";
import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const GetConversationFlowSchema = z.object({
  conversation_flow_id: z.string().min(1, "conversation_flow_id is required"),
});

const CreateConversationFlowSchema = z.object({
  nodes: z.array(z.record(z.unknown())),
  start_speaker: z.enum(["agent", "user"]),
  model_choice: z.record(z.unknown()),
  global_prompt: z.string().optional(),
  knowledge_base_ids: z.array(z.string()).optional(),
  start_node_id: z.string().optional(),
  tools: z.array(z.record(z.unknown())).optional(),
  default_dynamic_variables: z.record(z.string()).optional(),
});

const UpdateConversationFlowSchema = z.object({
  conversation_flow_id: z.string().min(1, "conversation_flow_id is required"),
  nodes: z.array(z.record(z.unknown())).optional(),
  start_speaker: z.enum(["agent", "user"]).optional(),
  model_choice: z.record(z.unknown()).optional(),
  global_prompt: z.string().optional(),
  knowledge_base_ids: z.array(z.string()).optional(),
  start_node_id: z.string().optional(),
  tools: z.array(z.record(z.unknown())).optional(),
  default_dynamic_variables: z.record(z.string()).optional(),
});

const DeleteConversationFlowSchema = z.object({
  conversation_flow_id: z.string().min(1, "conversation_flow_id is required"),
});

// ─── Tool Registrations ──────────────────────────────────────────────────────

export const conversationFlowTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_list_conversation_flows",
      description:
        "List all Conversation Flows in your Retell AI account. Conversation Flows are node-based agent scripts with fine-grained control over dialogue, branching, and function execution.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    handler: async () => {
      const result = await retell.conversationFlow.list();
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_get_conversation_flow",
      description: "Get full details of a specific Conversation Flow including its nodes, edges, and tools.",
      inputSchema: {
        type: "object",
        properties: {
          conversation_flow_id: {
            type: "string",
            description: "The unique ID of the Conversation Flow to retrieve.",
          },
        },
        required: ["conversation_flow_id"],
      },
    },
    handler: async (raw) => {
      const args = GetConversationFlowSchema.parse(raw);
      const result = await retell.conversationFlow.retrieve(args.conversation_flow_id);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_conversation_flow",
      description:
        "Create a new Conversation Flow. A Conversation Flow is a node-graph that controls agent dialogue with conversation nodes, function nodes, branch nodes, and end nodes connected by edges.",
      inputSchema: {
        type: "object",
        properties: {
          nodes: {
            type: "array",
            description:
              "Array of nodes in the flow. Each node must have an 'id', a 'type' (e.g. 'conversation', 'end', 'function', 'transfer_call', 'branch'), and relevant fields. Conversation nodes also need an 'instruction' object with 'type' ('prompt' or 'static_text') and 'text'.",
            items: { type: "object" },
          },
          start_speaker: {
            type: "string",
            enum: ["agent", "user"],
            description: "Who speaks first — 'agent' or 'user'.",
          },
          model_choice: {
            type: "object",
            description:
              'The LLM model choice. Example: { "type": "cascading", "model": "gpt-4.1" }. Supported models: gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, claude-4.5-sonnet, claude-4.5-haiku, gemini-2.5-flash.',
          },
          global_prompt: {
            type: "string",
            description: "A global prompt applied to every node in the conversation flow.",
          },
          knowledge_base_ids: {
            type: "array",
            items: { type: "string" },
            description: "Knowledge base IDs for RAG retrieval.",
          },
          start_node_id: {
            type: "string",
            description: "ID of the node where the conversation begins.",
          },
          tools: {
            type: "array",
            description: "Reusable tool/function definitions available in this flow.",
            items: { type: "object" },
          },
          default_dynamic_variables: {
            type: "object",
            description: "Default values for dynamic variables used in the flow.",
            additionalProperties: { type: "string" },
          },
        },
        required: ["nodes", "start_speaker", "model_choice"],
      },
    },
    handler: async (raw) => {
      const args = CreateConversationFlowSchema.parse(raw);
      // ConversationFlowCreateParams has deeply nested union node types
      // that cannot be statically narrowed from runtime MCP inputs.
      const params: Retell.ConversationFlowCreateParams = {
        nodes: args.nodes as unknown as Retell.ConversationFlowCreateParams["nodes"],
        start_speaker: args.start_speaker,
        model_choice: args.model_choice as unknown as Retell.ConversationFlowCreateParams["model_choice"],
      };

      if (args.global_prompt !== undefined) params.global_prompt = args.global_prompt;
      if (args.knowledge_base_ids !== undefined) params.knowledge_base_ids = args.knowledge_base_ids;
      if (args.start_node_id !== undefined) params.start_node_id = args.start_node_id;
      if (args.tools !== undefined)
        params.tools = args.tools as unknown as Retell.ConversationFlowCreateParams["tools"];
      if (args.default_dynamic_variables !== undefined)
        params.default_dynamic_variables = args.default_dynamic_variables;
      const result = await retell.conversationFlow.create(params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_update_conversation_flow",
      description: "Update an existing Conversation Flow's nodes, edges, model, prompt, or tools.",
      inputSchema: {
        type: "object",
        properties: {
          conversation_flow_id: {
            type: "string",
            description: "The unique ID of the Conversation Flow to update.",
          },
          nodes: {
            type: "array",
            description: "Updated array of nodes.",
            items: { type: "object" },
          },
          start_speaker: {
            type: "string",
            enum: ["agent", "user"],
            description: "Who speaks first.",
          },
          model_choice: {
            type: "object",
            description: "Updated LLM model choice.",
          },
          global_prompt: {
            type: "string",
            description: "Updated global prompt.",
          },
          knowledge_base_ids: {
            type: "array",
            items: { type: "string" },
            description: "Updated knowledge base IDs.",
          },
          start_node_id: {
            type: "string",
            description: "Updated start node ID.",
          },
          tools: {
            type: "array",
            description: "Updated tool definitions.",
            items: { type: "object" },
          },
          default_dynamic_variables: {
            type: "object",
            description: "Updated default dynamic variables.",
            additionalProperties: { type: "string" },
          },
        },
        required: ["conversation_flow_id"],
      },
    },
    handler: async (raw) => {
      const args = UpdateConversationFlowSchema.parse(raw);
      const params: Retell.ConversationFlowUpdateParams = {};
      if (args.nodes !== undefined)
        params.nodes = args.nodes as unknown as Retell.ConversationFlowUpdateParams["nodes"];
      if (args.start_speaker !== undefined) params.start_speaker = args.start_speaker;
      if (args.model_choice !== undefined)
        params.model_choice = args.model_choice as unknown as Retell.ConversationFlowUpdateParams["model_choice"];
      if (args.global_prompt !== undefined) params.global_prompt = args.global_prompt;
      if (args.knowledge_base_ids !== undefined) params.knowledge_base_ids = args.knowledge_base_ids;
      if (args.start_node_id !== undefined) params.start_node_id = args.start_node_id;
      if (args.tools !== undefined)
        params.tools = args.tools as unknown as Retell.ConversationFlowUpdateParams["tools"];
      if (args.default_dynamic_variables !== undefined)
        params.default_dynamic_variables = args.default_dynamic_variables;
      const result = await retell.conversationFlow.update(args.conversation_flow_id, params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_delete_conversation_flow",
      description: "Permanently delete a Conversation Flow and all its versions.",
      inputSchema: {
        type: "object",
        properties: {
          conversation_flow_id: {
            type: "string",
            description: "The unique ID of the Conversation Flow to delete.",
          },
        },
        required: ["conversation_flow_id"],
      },
    },
    handler: async (raw) => {
      const args = DeleteConversationFlowSchema.parse(raw);
      await retell.conversationFlow.delete(args.conversation_flow_id);
      return JSON.stringify({
        success: true,
        message: `Conversation Flow ${args.conversation_flow_id} deleted.`,
      });
    },
  },
];
