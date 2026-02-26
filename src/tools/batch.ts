import { z } from "zod";
import Retell from "retell-sdk";
import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const CreateBatchCallSchema = z.object({
  from_number: z.string().min(1, "from_number is required"),
  tasks: z.array(z.record(z.unknown())).min(1, "tasks must contain at least one task"),
  name: z.string().optional(),
  trigger_timestamp: z.number().optional(),
});

const CreateBatchTestSchema = z.object({
  response_engine: z.record(z.unknown()),
  test_case_definition_ids: z.array(z.string()).min(1, "At least one test case definition ID is required"),
  reserved_concurrency: z.number().optional(),
});

// ─── Tool Registrations ──────────────────────────────────────────────────────

export const batchTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_create_batch_call",
      description:
        "Schedule a batch of outbound phone calls. Each task specifies a destination number and optional per-call agent overrides and dynamic variables.",
      inputSchema: {
        type: "object",
        properties: {
          from_number: {
            type: "string",
            description: "Your Retell number in E.164 format to call from.",
          },
          tasks: {
            type: "array",
            description:
              "List of call tasks. Each task must have 'to_number' and may include 'override_agent_id', 'retell_llm_dynamic_variables', etc.",
            items: { type: "object" },
          },
          name: {
            type: "string",
            description: "Optional label for the batch (your reference only).",
          },
          trigger_timestamp: {
            type: "number",
            description: "Unix ms timestamp to schedule the batch. Omit to send immediately.",
          },
        },
        required: ["from_number", "tasks"],
      },
    },
    handler: async (raw) => {
      const args = CreateBatchCallSchema.parse(raw);
      const params: Retell.BatchCallCreateBatchCallParams = {
        from_number: args.from_number,
        tasks: args.tasks as unknown as Retell.BatchCallCreateBatchCallParams["tasks"],
      };
      if (args.name !== undefined) params.name = args.name;
      if (args.trigger_timestamp !== undefined) params.trigger_timestamp = args.trigger_timestamp;
      const result = await retell.batchCall.createBatchCall(params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
      name: "retell_create_batch_test",
      description:
        "Run a batch of automated test cases against a Retell LLM or Conversation Flow response engine.",
      inputSchema: {
        type: "object",
        properties: {
          response_engine: {
            type: "object",
            description:
              "Response engine to test. Must be { type: 'retell-llm', llm_id: '...' } or { type: 'conversation-flow', conversation_flow_id: '...' }.",
          },
          test_case_definition_ids: {
            type: "array",
            items: { type: "string" },
            description: "Array of test case definition IDs to run.",
          },
          reserved_concurrency: {
            type: "number",
            description: "Reserve a portion of org concurrency for the batch test.",
          },
        },
        required: ["response_engine", "test_case_definition_ids"],
      },
    },
    handler: async (raw) => {
      const args = CreateBatchTestSchema.parse(raw);
      const params: Retell.TestCreateBatchTestParams = {
        response_engine: args.response_engine as unknown as Retell.TestCreateBatchTestParams["response_engine"],
        test_case_definition_ids: args.test_case_definition_ids,
      };
      if (args.reserved_concurrency !== undefined)
        params.reserved_concurrency = args.reserved_concurrency;
      const result = await retell.tests.createBatchTest(params);
      return JSON.stringify(result, null, 2);
    },
  },
];
