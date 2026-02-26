import { z } from "zod";
import Retell from "retell-sdk";
import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const GetComponentSchema = z.object({
  conversation_flow_component_id: z.string().min(1, "conversation_flow_component_id is required"),
});

const CreateComponentSchema = z.object({
  name: z.string().min(1, "name is required"),
  nodes: z.array(z.record(z.unknown())),
  start_node_id: z.string().optional(),
  tools: z.array(z.record(z.unknown())).optional(),
});

const UpdateComponentSchema = z.object({
  conversation_flow_component_id: z.string().min(1, "conversation_flow_component_id is required"),
  name: z.string().optional(),
  nodes: z.array(z.record(z.unknown())).optional(),
  start_node_id: z.string().optional(),
  tools: z.array(z.record(z.unknown())).optional(),
});

const DeleteComponentSchema = z.object({
  conversation_flow_component_id: z.string().min(1, "conversation_flow_component_id is required"),
});

// ─── Tool Registrations ──────────────────────────────────────────────────────

export const conversationFlowComponentTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_list_conversation_flow_components",
      description:
        "List all shared Conversation Flow Components in your account. Components are reusable sub-flows that can be embedded in multiple Conversation Flows, saving development time and ensuring consistency.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    handler: async () => {
      const result = await retell.conversationFlowComponent.list();
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_get_conversation_flow_component",
      description: "Get full details of a specific shared Conversation Flow Component.",
      inputSchema: {
        type: "object",
        properties: {
          conversation_flow_component_id: {
            type: "string",
            description: "The unique ID of the Conversation Flow Component to retrieve.",
          },
        },
        required: ["conversation_flow_component_id"],
      },
    },
    handler: async (raw) => {
      const args = GetComponentSchema.parse(raw);
      const result = await retell.conversationFlowComponent.retrieve(args.conversation_flow_component_id);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_conversation_flow_component",
      description:
        "Create a new shared Conversation Flow Component. Components are reusable sub-flows that can be embedded across multiple Conversation Flows.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Display name for the component.",
          },
          nodes: {
            type: "array",
            description:
              "Array of nodes that make up this component. Same node types as Conversation Flows: conversation, end, function, branch, transfer_call, etc.",
            items: { type: "object" },
          },
          start_node_id: {
            type: "string",
            description: "ID of the entry node of this component.",
          },
          tools: {
            type: "array",
            description: "Tool definitions available within this component.",
            items: { type: "object" },
          },
        },
        required: ["name", "nodes"],
      },
    },
    handler: async (raw) => {
      const args = CreateComponentSchema.parse(raw);
      const params: Retell.ConversationFlowComponentCreateParams = {
        name: args.name,
        nodes: args.nodes as unknown as Retell.ConversationFlowComponentCreateParams["nodes"],
      };
      if (args.start_node_id !== undefined) params.start_node_id = args.start_node_id;
      if (args.tools !== undefined)
        params.tools = args.tools as unknown as Retell.ConversationFlowComponentCreateParams["tools"];
      const result = await retell.conversationFlowComponent.create(params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_update_conversation_flow_component",
      description: "Update an existing shared Conversation Flow Component's name, nodes, or tools.",
      inputSchema: {
        type: "object",
        properties: {
          conversation_flow_component_id: {
            type: "string",
            description: "The unique ID of the component to update.",
          },
          name: {
            type: "string",
            description: "New display name for the component.",
          },
          nodes: {
            type: "array",
            description: "Updated array of nodes.",
            items: { type: "object" },
          },
          start_node_id: {
            type: "string",
            description: "Updated entry node ID.",
          },
          tools: {
            type: "array",
            description: "Updated tool definitions.",
            items: { type: "object" },
          },
        },
        required: ["conversation_flow_component_id"],
      },
    },
    handler: async (raw) => {
      const args = UpdateComponentSchema.parse(raw);
      const params: Retell.ConversationFlowComponentUpdateParams = {};
      if (args.name !== undefined) params.name = args.name;
      if (args.nodes !== undefined)
        params.nodes = args.nodes as unknown as Retell.ConversationFlowComponentUpdateParams["nodes"];
      if (args.start_node_id !== undefined) params.start_node_id = args.start_node_id;
      if (args.tools !== undefined)
        params.tools = args.tools as unknown as Retell.ConversationFlowComponentUpdateParams["tools"];
      const result = await retell.conversationFlowComponent.update(
        args.conversation_flow_component_id,
        params
      );
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_delete_conversation_flow_component",
      description:
        "Delete a shared Conversation Flow Component. When deleted, local copies are automatically created in all Conversation Flows that use it.",
      inputSchema: {
        type: "object",
        properties: {
          conversation_flow_component_id: {
            type: "string",
            description: "The unique ID of the component to delete.",
          },
        },
        required: ["conversation_flow_component_id"],
      },
    },
    handler: async (raw) => {
      const args = DeleteComponentSchema.parse(raw);
      await retell.conversationFlowComponent.delete(args.conversation_flow_component_id);
      return JSON.stringify({
        success: true,
        message: `Conversation Flow Component ${args.conversation_flow_component_id} deleted.`,
      });
    },
  },
];
