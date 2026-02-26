import type { ToolRegistration } from "../types.js";
import { agentTools } from "./agents.js";
import { callTools } from "./calls.js";
import { phoneNumberTools } from "./phone-numbers.js";
import { llmTools } from "./llms.js";
import { knowledgeBaseTools } from "./knowledge-bases.js";
import { voiceTools } from "./voices.js";
import { conversationFlowTools } from "./conversation-flows.js";
import { conversationFlowComponentTools } from "./conversation-flow-components.js";
import { chatAgentTools } from "./chat-agents.js";
import { chatSessionTools } from "./chat-sessions.js";
import { batchTools } from "./batch.js";
import { concurrencyTools } from "./concurrency.js";
import { mcpToolTools } from "./mcp-tools.js";

/**
 * All tool registrations aggregated from every domain module.
 * Each entry bundles an MCP Tool definition with its Zod-validated handler.
 */
export const ALL_TOOLS: ToolRegistration[] = [
  ...agentTools,
  ...callTools,
  ...phoneNumberTools,
  ...llmTools,
  ...knowledgeBaseTools,
  ...voiceTools,
  ...conversationFlowTools,
  ...conversationFlowComponentTools,
  ...chatAgentTools,
  ...chatSessionTools,
  ...batchTools,
  ...concurrencyTools,
  ...mcpToolTools,
];

/**
 * Lookup map from tool name → handler for O(1) dispatch.
 */
export const toolHandlerMap = new Map<string, ToolRegistration["handler"]>(
  ALL_TOOLS.map((t) => [t.definition.name, t.handler])
);
