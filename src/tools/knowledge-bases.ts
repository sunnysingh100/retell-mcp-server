import { z } from "zod";
import Retell from "retell-sdk";
import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const GetKnowledgeBaseSchema = z.object({
  knowledge_base_id: z.string().min(1, "knowledge_base_id is required"),
});

const CreateKnowledgeBaseSchema = z.object({
  knowledge_base_name: z.string().min(1, "knowledge_base_name is required"),
  knowledge_base_texts: z
    .array(
      z.object({
        title: z.string(),
        text: z.string(),
      })
    )
    .optional(),
  knowledge_base_urls: z.array(z.string()).optional(),
});

const DeleteKnowledgeBaseSchema = z.object({
  knowledge_base_id: z.string().min(1, "knowledge_base_id is required"),
});

const AddKnowledgeBaseSourcesSchema = z.object({
  knowledge_base_id: z.string().min(1, "knowledge_base_id is required"),
  knowledge_base_texts: z
    .array(
      z.object({
        title: z.string(),
        text: z.string(),
      })
    )
    .optional(),
  knowledge_base_urls: z.array(z.string()).optional(),
});

const DeleteKnowledgeBaseSourceSchema = z.object({
  knowledge_base_id: z.string().min(1, "knowledge_base_id is required"),
  source_id: z.string().min(1, "source_id is required"),
});

// ─── Tool Registrations ──────────────────────────────────────────────────────

export const knowledgeBaseTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_list_knowledge_bases",
      description: "List all knowledge bases in your Retell AI account.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    handler: async () => {
      const result = await retell.knowledgeBase.list();
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_get_knowledge_base",
      description: "Get details about a specific knowledge base.",
      inputSchema: {
        type: "object",
        properties: {
          knowledge_base_id: {
            type: "string",
            description: "The unique ID of the knowledge base.",
          },
        },
        required: ["knowledge_base_id"],
      },
    },
    handler: async (raw) => {
      const args = GetKnowledgeBaseSchema.parse(raw);
      const result = await retell.knowledgeBase.retrieve(args.knowledge_base_id);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_knowledge_base",
      description:
        "Create a new knowledge base for RAG. Provide plain-text sources, URLs to crawl, or both.",
      inputSchema: {
        type: "object",
        properties: {
          knowledge_base_name: {
            type: "string",
            description: "Display name for the knowledge base.",
          },
          knowledge_base_texts: {
            type: "array",
            description: "Plain-text sources to add.",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Title of the text source." },
                text: { type: "string", description: "The text content." },
              },
              required: ["title", "text"],
            },
          },
          knowledge_base_urls: {
            type: "array",
            items: { type: "string" },
            description: "URLs to crawl and add as sources.",
          },
        },
        required: ["knowledge_base_name"],
      },
    },
    handler: async (raw) => {
      const args = CreateKnowledgeBaseSchema.parse(raw);
      const params: Retell.KnowledgeBaseCreateParams = {
        knowledge_base_name: args.knowledge_base_name,
      };
      if (args.knowledge_base_texts !== undefined)
        params.knowledge_base_texts =
          args.knowledge_base_texts as Retell.KnowledgeBaseCreateParams["knowledge_base_texts"];
      if (args.knowledge_base_urls !== undefined) params.knowledge_base_urls = args.knowledge_base_urls;
      const result = await retell.knowledgeBase.create(params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_delete_knowledge_base",
      description: "Delete a knowledge base from your Retell AI account.",
      inputSchema: {
        type: "object",
        properties: {
          knowledge_base_id: {
            type: "string",
            description: "The unique ID of the knowledge base to delete.",
          },
        },
        required: ["knowledge_base_id"],
      },
    },
    handler: async (raw) => {
      const args = DeleteKnowledgeBaseSchema.parse(raw);
      await retell.knowledgeBase.delete(args.knowledge_base_id);
      return JSON.stringify({
        success: true,
        message: `Knowledge base ${args.knowledge_base_id} deleted.`,
      });
    },
  },

  {
    definition: {
      name: "retell_add_knowledge_base_sources",
      description: "Add new text or URL sources to an existing knowledge base.",
      inputSchema: {
        type: "object",
        properties: {
          knowledge_base_id: {
            type: "string",
            description: "The unique ID of the knowledge base.",
          },
          knowledge_base_texts: {
            type: "array",
            description: "Plain-text sources to add.",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                text: { type: "string" },
              },
              required: ["title", "text"],
            },
          },
          knowledge_base_urls: {
            type: "array",
            items: { type: "string" },
            description: "URLs to crawl and add.",
          },
        },
        required: ["knowledge_base_id"],
      },
    },
    handler: async (raw) => {
      const args = AddKnowledgeBaseSourcesSchema.parse(raw);
      const params: Retell.KnowledgeBaseAddSourcesParams = {};
      if (args.knowledge_base_texts !== undefined)
        params.knowledge_base_texts =
          args.knowledge_base_texts as Retell.KnowledgeBaseAddSourcesParams["knowledge_base_texts"];
      if (args.knowledge_base_urls !== undefined) params.knowledge_base_urls = args.knowledge_base_urls;
      const result = await retell.knowledgeBase.addSources(args.knowledge_base_id, params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_delete_knowledge_base_source",
      description: "Remove a specific source from an existing knowledge base by its source ID.",
      inputSchema: {
        type: "object",
        properties: {
          knowledge_base_id: {
            type: "string",
            description: "The unique ID of the knowledge base.",
          },
          source_id: { type: "string", description: "The unique ID of the source to remove." },
        },
        required: ["knowledge_base_id", "source_id"],
      },
    },
    handler: async (raw) => {
      const args = DeleteKnowledgeBaseSourceSchema.parse(raw);
      await retell.knowledgeBase.deleteSource(args.knowledge_base_id, args.source_id);
      return JSON.stringify({
        success: true,
        message: `Source ${args.source_id} removed from knowledge base ${args.knowledge_base_id}.`,
      });
    },
  },
];
