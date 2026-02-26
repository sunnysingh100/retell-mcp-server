import { z } from "zod";
import Retell from "retell-sdk";
import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const GetLlmSchema = z.object({
  llm_id: z.string().min(1, "llm_id is required"),
});

const CreateLlmSchema = z.object({
  model: z.string().optional(),
  general_prompt: z.string().optional(),
  begin_message: z.string().optional(),
  general_tools: z.array(z.record(z.unknown())).optional(),
  knowledge_base_ids: z.array(z.string()).optional(),
});

const UpdateLlmSchema = z.object({
  llm_id: z.string().min(1, "llm_id is required"),
  model: z.string().optional(),
  general_prompt: z.string().optional(),
  begin_message: z.string().optional(),
  knowledge_base_ids: z.array(z.string()).optional(),
});

const DeleteLlmSchema = z.object({
  llm_id: z.string().min(1, "llm_id is required"),
});

// ─── Tool Registrations ──────────────────────────────────────────────────────

export const llmTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_list_llms",
      description: "List all Retell LLM configurations in your account.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    handler: async () => {
      const result = await retell.llm.list();
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_get_llm",
      description: "Get details of a specific Retell LLM configuration.",
      inputSchema: {
        type: "object",
        properties: {
          llm_id: { type: "string", description: "The unique ID of the LLM to retrieve." },
        },
        required: ["llm_id"],
      },
    },
    handler: async (raw) => {
      const args = GetLlmSchema.parse(raw);
      const result = await retell.llm.retrieve(args.llm_id);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_llm",
      description:
        "Create a new Retell LLM configuration to attach to agents. Define system prompt, model, begin message, and tools.",
      inputSchema: {
        type: "object",
        properties: {
          model: {
            type: "string",
            description:
              'The underlying LLM model (e.g. "gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet", "claude-3-haiku").',
          },
          general_prompt: {
            type: "string",
            description: "System-level prompt defining the agent personality and instructions.",
          },
          begin_message: {
            type: "string",
            description:
              "First message the agent says when a conversation starts. Pass empty string to clear.",
          },
          general_tools: {
            type: "array",
            description: "Tool/function definitions the LLM can call during conversation.",
            items: { type: "object" },
          },
          knowledge_base_ids: {
            type: "array",
            items: { type: "string" },
            description: "Knowledge base IDs to attach for RAG-based responses.",
          },
        },
        required: [],
      },
    },
    handler: async (raw) => {
      const args = CreateLlmSchema.parse(raw);
      const params: Retell.LlmCreateParams = {};
      if (args.model !== undefined) params.model = args.model as Retell.LlmCreateParams["model"];
      if (args.general_prompt !== undefined) params.general_prompt = args.general_prompt;
      if (args.begin_message !== undefined) params.begin_message = args.begin_message || null;
      if (args.general_tools !== undefined)
        params.general_tools = args.general_tools as unknown as Retell.LlmCreateParams["general_tools"];
      if (args.knowledge_base_ids !== undefined) params.knowledge_base_ids = args.knowledge_base_ids;
      const result = await retell.llm.create(params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_update_llm",
      description: "Update an existing Retell LLM configuration's prompt, model, or tools.",
      inputSchema: {
        type: "object",
        properties: {
          llm_id: { type: "string", description: "The unique ID of the LLM to update." },
          model: { type: "string", description: "New LLM model to use." },
          general_prompt: { type: "string", description: "New system prompt." },
          begin_message: {
            type: "string",
            description: "New opening message. Pass empty string to clear.",
          },
          knowledge_base_ids: {
            type: "array",
            items: { type: "string" },
            description: "New knowledge base IDs to attach.",
          },
        },
        required: ["llm_id"],
      },
    },
    handler: async (raw) => {
      const args = UpdateLlmSchema.parse(raw);
      const params: Retell.LlmUpdateParams = {};
      if (args.model !== undefined) params.model = args.model as Retell.LlmUpdateParams["model"];
      if (args.general_prompt !== undefined) params.general_prompt = args.general_prompt;
      if (args.begin_message !== undefined) params.begin_message = args.begin_message || null;
      if (args.knowledge_base_ids !== undefined) params.knowledge_base_ids = args.knowledge_base_ids;
      const result = await retell.llm.update(args.llm_id, params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_delete_llm",
      description: "Delete a Retell LLM configuration by its ID.",
      inputSchema: {
        type: "object",
        properties: {
          llm_id: { type: "string", description: "The unique ID of the LLM to delete." },
        },
        required: ["llm_id"],
      },
    },
    handler: async (raw) => {
      const args = DeleteLlmSchema.parse(raw);
      await retell.llm.delete(args.llm_id);
      return JSON.stringify({ success: true, message: `LLM ${args.llm_id} deleted.` });
    },
  },
];
