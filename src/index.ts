#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Retell from "retell-sdk";

// ─── Client Setup ────────────────────────────────────────────────────────────

const RETELL_API_KEY = process.env.RETELL_API_KEY;
if (!RETELL_API_KEY) {
  console.error("Error: RETELL_API_KEY environment variable is required.");
  process.exit(1);
}

const retell = new Retell({ apiKey: RETELL_API_KEY });

// ─── Tool Definitions ─────────────────────────────────────────────────────────

// Each entry mirrors the MCP Tool schema; we register these via McpServer.registerTool()
const TOOLS: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> = [
  // ── Agent Tools ──────────────────────────────────────────────────────────
  {
    name: "retell_list_agents",
    description:
      "List all Retell AI voice agents in your account. Returns agent IDs, names, voice settings, and configuration.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
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
  {
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
  {
    name: "retell_update_agent",
    description: "Update an existing Retell AI agent's configuration, including switching to a different response engine type (Retell LLM, Custom LLM, or Conversation Flow).",
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
  {
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
  {
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
  {
    name: "retell_publish_agent",
    description: "Publish the latest draft version of a voice agent, creating a new immutable version and starting a fresh draft.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "The unique ID of the agent to publish." },
      },
      required: ["agent_id"],
    },
  },

  // ── Call Tools ───────────────────────────────────────────────────────────
  {
    name: "retell_list_calls",
    description:
      "List calls in your Retell AI account. Supports filtering by agent ID, status, and date range.",
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
      },
      required: [],
    },
  },
  {
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
  {
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
  {
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
  {
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
  {
    name: "retell_update_call",
    description: "Update metadata or data storage settings for an existing call.",
    inputSchema: {
      type: "object",
      properties: {
        call_id: { type: "string", description: "The unique ID of the call to update." },
        metadata: { type: "object", description: "Arbitrary metadata object to attach to the call.", additionalProperties: {} },
        data_storage_setting: { type: "string", enum: ["everything", "everything_except_pii", "basic_attributes_only"], description: "Override data storage setting for this call." },
      },
      required: ["call_id"],
    },
  },
  {
    name: "retell_register_phone_call",
    description: "Register a phone call for custom telephony (bring-your-own telephony). Returns call_id and access_token for the audio websocket.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "The agent to handle this call." },
        from_number: { type: "string", description: "Caller number in E.164 format." },
        to_number: { type: "string", description: "Callee number in E.164 format." },
        direction: { type: "string", enum: ["inbound", "outbound"], description: "Direction of the phone call." },
        metadata: { type: "object", description: "Optional metadata.", additionalProperties: {} },
        retell_llm_dynamic_variables: { type: "object", description: "Dynamic variables to inject.", additionalProperties: { type: "string" } },
      },
      required: ["agent_id"],
    },
  },

  // ── Phone Number Tools ───────────────────────────────────────────────────
  {
    name: "retell_list_phone_numbers",
    description: "List all phone numbers in your Retell AI account.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "retell_get_phone_number",
    description: "Get details about a specific phone number including its associated agent.",
    inputSchema: {
      type: "object",
      properties: {
        phone_number: {
          type: "string",
          description: 'The phone number to retrieve (e.g. "+14157774444").',
        },
      },
      required: ["phone_number"],
    },
  },
  {
    name: "retell_create_phone_number",
    description: "Purchase a new US phone number and optionally bind it to an agent.",
    inputSchema: {
      type: "object",
      properties: {
        area_code: {
          type: "number",
          description: "US area code for the number to purchase (e.g. 415).",
        },
        inbound_agent_id: {
          type: "string",
          description: "Agent ID to handle inbound calls on this number.",
        },
        outbound_agent_id: {
          type: "string",
          description: "Agent ID to use for outbound calls from this number.",
        },
        nickname: { type: "string", description: "Optional nickname/label for this number." },
      },
      required: [],
    },
  },
  {
    name: "retell_update_phone_number",
    description: "Update the agent binding or settings for an existing phone number.",
    inputSchema: {
      type: "object",
      properties: {
        phone_number: {
          type: "string",
          description: 'The phone number to update (e.g. "+14157774444").',
        },
        inbound_agent_id: {
          type: "string",
          description: "New agent ID to handle inbound calls. Pass empty string to unset.",
        },
        outbound_agent_id: {
          type: "string",
          description: "New agent ID for outbound calls. Pass empty string to unset.",
        },
        nickname: { type: "string", description: "New nickname for this phone number." },
      },
      required: ["phone_number"],
    },
  },
  {
    name: "retell_delete_phone_number",
    description: "Release (delete) a phone number from your Retell AI account.",
    inputSchema: {
      type: "object",
      properties: {
        phone_number: {
          type: "string",
          description: 'The phone number to release (e.g. "+14157774444").',
        },
      },
      required: ["phone_number"],
    },
  },
  {
    name: "retell_import_phone_number",
    description: "Import a phone number from your own custom telephony (SIP trunk) and optionally bind agents to it.",
    inputSchema: {
      type: "object",
      properties: {
        phone_number: { type: "string", description: "The number to import in E.164 format." },
        termination_uri: { type: "string", description: "SIP termination URI for outbound calls (e.g. 'someuri.pstn.twilio.com')." },
        inbound_agent_id: { type: "string", description: "Agent to handle inbound calls." },
        outbound_agent_id: { type: "string", description: "Agent to use for outbound calls." },
        nickname: { type: "string", description: "Optional label for this number." },
        sip_trunk_auth_username: { type: "string", description: "SIP trunk auth username." },
        sip_trunk_auth_password: { type: "string", description: "SIP trunk auth password." },
      },
      required: ["phone_number", "termination_uri"],
    },
  },

  // ── LLM Tools ────────────────────────────────────────────────────────────
  {
    name: "retell_list_llms",
    description: "List all Retell LLM configurations in your account.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
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
  {
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
          description: "First message the agent says when a conversation starts. Pass empty string to clear.",
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
  {
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
  {
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

  // ── Knowledge Base Tools ─────────────────────────────────────────────────
  {
    name: "retell_list_knowledge_bases",
    description: "List all knowledge bases in your Retell AI account.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
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
  {
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
  {
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
  {
    name: "retell_add_knowledge_base_sources",
    description: "Add new text or URL sources to an existing knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        knowledge_base_id: { type: "string", description: "The unique ID of the knowledge base." },
        knowledge_base_texts: {
          type: "array",
          description: "Plain-text sources to add.",
          items: { type: "object", properties: { title: { type: "string" }, text: { type: "string" } }, required: ["title", "text"] },
        },
        knowledge_base_urls: { type: "array", items: { type: "string" }, description: "URLs to crawl and add." },
      },
      required: ["knowledge_base_id"],
    },
  },
  {
    name: "retell_delete_knowledge_base_source",
    description: "Remove a specific source from an existing knowledge base by its source ID.",
    inputSchema: {
      type: "object",
      properties: {
        knowledge_base_id: { type: "string", description: "The unique ID of the knowledge base." },
        source_id: { type: "string", description: "The unique ID of the source to remove." },
      },
      required: ["knowledge_base_id", "source_id"],
    },
  },

  // ── Voice Tools ──────────────────────────────────────────────────────────
  {
    name: "retell_list_voices",
    description:
      "List all available voices for Retell AI agents, including provider, gender, accent, and preview audio URLs.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },

  // ── Conversation Flow Tools ───────────────────────────────────────────────
  {
    name: "retell_list_conversation_flows",
    description:
      "List all Conversation Flows in your Retell AI account. Conversation Flows are node-based agent scripts with fine-grained control over dialogue, branching, and function execution.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
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
  {
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
            "The LLM model choice. Example: { \"type\": \"cascading\", \"model\": \"gpt-4.1\" }. Supported models: gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, claude-4.5-sonnet, claude-4.5-haiku, gemini-2.5-flash.",
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
      required: ["nodes"],
    },
  },
  {
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
  {
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

  // ── Conversation Flow Component Tools ────────────────────────────────────
  {
    name: "retell_list_conversation_flow_components",
    description:
      "List all shared Conversation Flow Components in your account. Components are reusable sub-flows that can be embedded in multiple Conversation Flows, saving development time and ensuring consistency.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
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
  {
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
  {
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
  {
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

  // ── Batch Call Tools ─────────────────────────────────────────────────────
  {
    name: "retell_create_batch_call",
    description: "Schedule a batch of outbound phone calls. Each task specifies a destination number and optional per-call agent overrides and dynamic variables.",
    inputSchema: {
      type: "object",
      properties: {
        from_number: { type: "string", description: "Your Retell number in E.164 format to call from." },
        tasks: {
          type: "array",
          description: "List of call tasks. Each task must have 'to_number' and may include 'override_agent_id', 'retell_llm_dynamic_variables', etc.",
          items: { type: "object" },
        },
        name: { type: "string", description: "Optional label for the batch (your reference only)." },
        trigger_timestamp: { type: "number", description: "Unix ms timestamp to schedule the batch. Omit to send immediately." },
      },
      required: ["from_number", "tasks"],
    },
  },

  // ── Chat Agent Tools ─────────────────────────────────────────────────────
  {
    name: "retell_list_chat_agents",
    description: "List all chat (text/messaging) agents in your Retell AI account.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "retell_get_chat_agent",
    description: "Get details of a specific chat agent by its ID.",
    inputSchema: {
      type: "object",
      properties: { agent_id: { type: "string", description: "The unique ID of the chat agent." } },
      required: ["agent_id"],
    },
  },
  {
    name: "retell_create_chat_agent",
    description: "Create a new chat (text/messaging) agent. Requires a response_engine (llm_id, llm_websocket_url, or conversation_flow_id).",
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
  {
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
  {
    name: "retell_delete_chat_agent",
    description: "Permanently delete a chat agent by its ID.",
    inputSchema: {
      type: "object",
      properties: { agent_id: { type: "string", description: "The unique ID of the chat agent to delete." } },
      required: ["agent_id"],
    },
  },
  {
    name: "retell_get_chat_agent_versions",
    description: "Get all published versions of a chat agent.",
    inputSchema: {
      type: "object",
      properties: { agent_id: { type: "string", description: "The unique ID of the chat agent." } },
      required: ["agent_id"],
    },
  },
  {
    name: "retell_publish_chat_agent",
    description: "Publish the latest draft of a chat agent, creating a new immutable version.",
    inputSchema: {
      type: "object",
      properties: { agent_id: { type: "string", description: "The unique ID of the chat agent to publish." } },
      required: ["agent_id"],
    },
  },

  // ── Chat Session Tools ───────────────────────────────────────────────────
  {
    name: "retell_list_chats",
    description: "List all chat sessions in your Retell AI account.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "retell_get_chat",
    description: "Get details and transcript of a specific chat session.",
    inputSchema: {
      type: "object",
      properties: { chat_id: { type: "string", description: "The unique ID of the chat session." } },
      required: ["chat_id"],
    },
  },
  {
    name: "retell_create_chat",
    description: "Start a new chat session with a chat agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "The chat agent to use for this session." },
        agent_version: { type: "number", description: "Specific agent version to use. Defaults to latest." },
        retell_llm_dynamic_variables: { type: "object", description: "Dynamic variables to inject into the prompt.", additionalProperties: {} },
        metadata: { type: "object", description: "Optional metadata to attach.", additionalProperties: {} },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "retell_update_chat",
    description: "Update metadata or data storage settings for an ongoing chat session.",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: { type: "string", description: "The unique ID of the chat session." },
        metadata: { type: "object", description: "Metadata to update.", additionalProperties: {} },
        data_storage_setting: { type: "string", enum: ["everything", "basic_attributes_only"], description: "Data storage override." },
        override_dynamic_variables: { type: "object", description: "Dynamic variables to override mid-session.", additionalProperties: { type: "string" } },
      },
      required: ["chat_id"],
    },
  },
  {
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
  {
    name: "retell_create_sms_chat",
    description: "Start an outbound SMS chat conversation using a phone number with SMS capability.",
    inputSchema: {
      type: "object",
      properties: {
        from_number: { type: "string", description: "Your Retell SMS-capable number in E.164 format." },
        to_number: { type: "string", description: "The destination number in E.164 format." },
        override_agent_id: { type: "string", description: "Override the default agent for this SMS chat." },
        retell_llm_dynamic_variables: { type: "object", description: "Dynamic variables to inject.", additionalProperties: {} },
        metadata: { type: "object", description: "Optional metadata.", additionalProperties: {} },
      },
      required: ["from_number", "to_number"],
    },
  },
  {
    name: "retell_end_chat",
    description: "End an ongoing chat session.",
    inputSchema: {
      type: "object",
      properties: { chat_id: { type: "string", description: "The unique ID of the chat session to end." } },
      required: ["chat_id"],
    },
  },

  // ── Tests Tools ──────────────────────────────────────────────────────────
  {
    name: "retell_create_batch_test",
    description: "Run a batch of automated test cases against a Retell LLM or Conversation Flow response engine.",
    inputSchema: {
      type: "object",
      properties: {
        response_engine: {
          type: "object",
          description: "Response engine to test. Must be { type: 'retell-llm', llm_id: '...' } or { type: 'conversation-flow', conversation_flow_id: '...' }.",
        },
        test_case_definition_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of test case definition IDs to run.",
        },
        reserved_concurrency: { type: "number", description: "Reserve a portion of org concurrency for the batch test." },
      },
      required: ["response_engine", "test_case_definition_ids"],
    },
  },

  // ── Concurrency Tools ────────────────────────────────────────────────────
  {
    name: "retell_get_concurrency",
    description: "Get the current live call concurrency and concurrency limits for your Retell organization.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },

  // ── MCP Tool Tools ───────────────────────────────────────────────────────
  {
    name: "retell_get_mcp_tools",
    description: "Get the list of MCP tools available from a specific MCP server configured on a Retell agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "The agent ID whose MCP tools to retrieve." },
        mcp_id: { type: "string", description: "The ID of the MCP server to get tools from." },
        version: { type: "number", description: "Optional agent version. Defaults to latest." },
      },
      required: ["agent_id", "mcp_id"],
    },
  },
];

// ─── Tool Handlers ────────────────────────────────────────────────────────────

type ToolArgs = Record<string, unknown>;

async function handleToolCall(name: string, args: ToolArgs): Promise<string> {
  try {
    switch (name) {
      // ── Agents ──────────────────────────────────────────────────────────
      case "retell_list_agents": {
        const result = await retell.agent.list();
        return JSON.stringify(result, null, 2);
      }

      case "retell_get_agent": {
        const result = await retell.agent.retrieve(args.agent_id as string);
        return JSON.stringify(result, null, 2);
      }

      case "retell_create_agent": {
        // response_engine is required — determine which type to use
        let response_engine: Retell.AgentCreateParams["response_engine"];
        if (args.llm_id) {
          response_engine = { type: "retell-llm", llm_id: args.llm_id as string };
        } else if (args.llm_websocket_url) {
          response_engine = { type: "custom-llm", llm_websocket_url: args.llm_websocket_url as string };
        } else if (args.conversation_flow_id) {
          response_engine = { type: "conversation-flow", conversation_flow_id: args.conversation_flow_id as string };
        } else {
          throw new Error(
            "One of llm_id (Retell LLM), llm_websocket_url (Custom LLM), or conversation_flow_id (Conversation Flow) must be provided."
          );
        }

        const createParams: Retell.AgentCreateParams = {
          response_engine,
          voice_id: args.voice_id as string,
        };
        if (args.agent_name !== undefined) createParams.agent_name = args.agent_name as string;
        if (args.language !== undefined) {
          createParams.language = args.language as Retell.AgentCreateParams["language"];
        }
        if (args.responsiveness !== undefined) createParams.responsiveness = args.responsiveness as number;
        if (args.interruption_sensitivity !== undefined) {
          createParams.interruption_sensitivity = args.interruption_sensitivity as number;
        }
        if (args.enable_backchannel !== undefined) {
          createParams.enable_backchannel = args.enable_backchannel as boolean;
        }
        if (args.webhook_url !== undefined) createParams.webhook_url = args.webhook_url as string;
        if (args.max_call_duration_ms !== undefined) {
          createParams.max_call_duration_ms = args.max_call_duration_ms as number;
        }
        const createResult = await retell.agent.create(createParams);
        return JSON.stringify(createResult, null, 2);
      }

      case "retell_update_agent": {
        const updateParams: Retell.AgentUpdateParams = {};
        if (args.agent_name !== undefined) updateParams.agent_name = args.agent_name as string;
        if (args.voice_id !== undefined) updateParams.voice_id = args.voice_id as string;
        if (args.language !== undefined) {
          updateParams.language = args.language as Retell.AgentUpdateParams["language"];
        }
        if (args.responsiveness !== undefined) updateParams.responsiveness = args.responsiveness as number;
        if (args.interruption_sensitivity !== undefined) {
          updateParams.interruption_sensitivity = args.interruption_sensitivity as number;
        }
        if (args.enable_backchannel !== undefined) {
          updateParams.enable_backchannel = args.enable_backchannel as boolean;
        }
        if (args.webhook_url !== undefined) updateParams.webhook_url = args.webhook_url as string;
        if (args.max_call_duration_ms !== undefined) {
          updateParams.max_call_duration_ms = args.max_call_duration_ms as number;
        }
        // Switch response engine if requested
        if (args.llm_id) {
          updateParams.response_engine = { type: "retell-llm", llm_id: args.llm_id as string };
        } else if (args.llm_websocket_url) {
          updateParams.response_engine = { type: "custom-llm", llm_websocket_url: args.llm_websocket_url as string };
        } else if (args.conversation_flow_id) {
          updateParams.response_engine = { type: "conversation-flow", conversation_flow_id: args.conversation_flow_id as string };
        }
        const updateResult = await retell.agent.update(args.agent_id as string, updateParams);
        return JSON.stringify(updateResult, null, 2);
      }

      case "retell_delete_agent": {
        await retell.agent.delete(args.agent_id as string);
        return JSON.stringify({ success: true, message: `Agent ${args.agent_id} deleted.` });
      }

      // ── Calls ────────────────────────────────────────────────────────────
      case "retell_list_calls": {
        const listParams: Retell.CallListParams = {};
        if (args.filter_criteria !== undefined) {
          listParams.filter_criteria = args.filter_criteria as Retell.CallListParams["filter_criteria"];
        }
        if (args.limit !== undefined) listParams.limit = args.limit as number;
        if (args.sort_order !== undefined) {
          listParams.sort_order = args.sort_order as "ascending" | "descending";
        }
        const callListResult = await retell.call.list(listParams);
        return JSON.stringify(callListResult, null, 2);
      }

      case "retell_get_call": {
        const callResult = await retell.call.retrieve(args.call_id as string);
        return JSON.stringify(callResult, null, 2);
      }

      case "retell_create_phone_call": {
        const phoneCallParams: Retell.CallCreatePhoneCallParams = {
          from_number: args.from_number as string,
          to_number: args.to_number as string,
        };
        if (args.override_agent_id !== undefined) {
          phoneCallParams.override_agent_id = args.override_agent_id as string;
        }
        if (args.retell_llm_dynamic_variables !== undefined) {
          phoneCallParams.retell_llm_dynamic_variables = args.retell_llm_dynamic_variables as Record<string, string>;
        }
        if (args.metadata !== undefined) {
          phoneCallParams.metadata = args.metadata as Record<string, unknown>;
        }
        const phoneCallResult = await retell.call.createPhoneCall(phoneCallParams);
        return JSON.stringify(phoneCallResult, null, 2);
      }

      case "retell_create_web_call": {
        const webCallParams: Retell.CallCreateWebCallParams = {
          agent_id: args.agent_id as string,
        };
        if (args.retell_llm_dynamic_variables !== undefined) {
          webCallParams.retell_llm_dynamic_variables = args.retell_llm_dynamic_variables as Record<string, string>;
        }
        if (args.metadata !== undefined) {
          webCallParams.metadata = args.metadata as Record<string, unknown>;
        }
        const webCallResult = await retell.call.createWebCall(webCallParams);
        return JSON.stringify(webCallResult, null, 2);
      }

      case "retell_delete_call": {
        await retell.call.delete(args.call_id as string);
        return JSON.stringify({ success: true, message: `Call ${args.call_id} deleted.` });
      }

      // ── Phone Numbers ─────────────────────────────────────────────────────
      case "retell_list_phone_numbers": {
        const phoneNumbers = await retell.phoneNumber.list();
        return JSON.stringify(phoneNumbers, null, 2);
      }

      case "retell_get_phone_number": {
        const phoneNumber = await retell.phoneNumber.retrieve(args.phone_number as string);
        return JSON.stringify(phoneNumber, null, 2);
      }

      case "retell_create_phone_number": {
        const phoneCreateParams: Retell.PhoneNumberCreateParams = {};
        if (args.area_code !== undefined) phoneCreateParams.area_code = args.area_code as number;
        if (args.inbound_agent_id !== undefined) {
          phoneCreateParams.inbound_agent_id = args.inbound_agent_id as string;
        }
        if (args.outbound_agent_id !== undefined) {
          phoneCreateParams.outbound_agent_id = args.outbound_agent_id as string;
        }
        if (args.nickname !== undefined) phoneCreateParams.nickname = args.nickname as string;
        const phoneCreateResult = await retell.phoneNumber.create(phoneCreateParams);
        return JSON.stringify(phoneCreateResult, null, 2);
      }

      case "retell_update_phone_number": {
        const phoneUpdateParams: Retell.PhoneNumberUpdateParams = {};
        if (args.inbound_agent_id !== undefined) {
          phoneUpdateParams.inbound_agent_id = (args.inbound_agent_id as string) || null;
        }
        if (args.outbound_agent_id !== undefined) {
          phoneUpdateParams.outbound_agent_id = (args.outbound_agent_id as string) || null;
        }
        if (args.nickname !== undefined) phoneUpdateParams.nickname = args.nickname as string;
        const phoneUpdateResult = await retell.phoneNumber.update(
          args.phone_number as string,
          phoneUpdateParams
        );
        return JSON.stringify(phoneUpdateResult, null, 2);
      }

      case "retell_delete_phone_number": {
        await retell.phoneNumber.delete(args.phone_number as string);
        return JSON.stringify({
          success: true,
          message: `Phone number ${args.phone_number} released.`,
        });
      }

      // ── LLMs ─────────────────────────────────────────────────────────────
      case "retell_list_llms": {
        const llms = await retell.llm.list();
        return JSON.stringify(llms, null, 2);
      }

      case "retell_get_llm": {
        const llm = await retell.llm.retrieve(args.llm_id as string);
        return JSON.stringify(llm, null, 2);
      }

      case "retell_create_llm": {
        const llmCreateParams: Retell.LlmCreateParams = {};
        if (args.model !== undefined) {
          llmCreateParams.model = args.model as Retell.LlmCreateParams["model"];
        }
        if (args.general_prompt !== undefined) {
          llmCreateParams.general_prompt = args.general_prompt as string;
        }
        if (args.begin_message !== undefined) {
          llmCreateParams.begin_message = (args.begin_message as string) || null;
        }
        if (args.general_tools !== undefined) {
          llmCreateParams.general_tools = args.general_tools as Retell.LlmCreateParams["general_tools"];
        }
        if (args.knowledge_base_ids !== undefined) {
          llmCreateParams.knowledge_base_ids = args.knowledge_base_ids as string[];
        }
        const llmCreateResult = await retell.llm.create(llmCreateParams);
        return JSON.stringify(llmCreateResult, null, 2);
      }

      case "retell_update_llm": {
        const llmUpdateParams: Retell.LlmUpdateParams = {};
        if (args.model !== undefined) {
          llmUpdateParams.model = args.model as Retell.LlmUpdateParams["model"];
        }
        if (args.general_prompt !== undefined) {
          llmUpdateParams.general_prompt = args.general_prompt as string;
        }
        if (args.begin_message !== undefined) {
          llmUpdateParams.begin_message = (args.begin_message as string) || null;
        }
        if (args.knowledge_base_ids !== undefined) {
          llmUpdateParams.knowledge_base_ids = args.knowledge_base_ids as string[];
        }
        const llmUpdateResult = await retell.llm.update(args.llm_id as string, llmUpdateParams);
        return JSON.stringify(llmUpdateResult, null, 2);
      }

      case "retell_delete_llm": {
        await retell.llm.delete(args.llm_id as string);
        return JSON.stringify({ success: true, message: `LLM ${args.llm_id} deleted.` });
      }

      // ── Knowledge Bases ───────────────────────────────────────────────────
      case "retell_list_knowledge_bases": {
        const kbs = await retell.knowledgeBase.list();
        return JSON.stringify(kbs, null, 2);
      }

      case "retell_get_knowledge_base": {
        const kb = await retell.knowledgeBase.retrieve(args.knowledge_base_id as string);
        return JSON.stringify(kb, null, 2);
      }

      case "retell_create_knowledge_base": {
        const kbCreateParams: Retell.KnowledgeBaseCreateParams = {
          knowledge_base_name: args.knowledge_base_name as string,
        };
        if (args.knowledge_base_texts !== undefined) {
          kbCreateParams.knowledge_base_texts = args.knowledge_base_texts as Retell.KnowledgeBaseCreateParams["knowledge_base_texts"];
        }
        if (args.knowledge_base_urls !== undefined) {
          kbCreateParams.knowledge_base_urls = args.knowledge_base_urls as string[];
        }
        const kbCreateResult = await retell.knowledgeBase.create(kbCreateParams);
        return JSON.stringify(kbCreateResult, null, 2);
      }

      case "retell_delete_knowledge_base": {
        await retell.knowledgeBase.delete(args.knowledge_base_id as string);
        return JSON.stringify({
          success: true,
          message: `Knowledge base ${args.knowledge_base_id} deleted.`,
        });
      }

      // ── Voices ────────────────────────────────────────────────────────────
      case "retell_list_voices": {
        const voices = await retell.voice.list();
        return JSON.stringify(voices, null, 2);
      }

      // ── Conversation Flows ────────────────────────────────────────────────
      case "retell_list_conversation_flows": {
        const flows = await retell.conversationFlow.list();
        return JSON.stringify(flows, null, 2);
      }

      case "retell_get_conversation_flow": {
        const flow = await retell.conversationFlow.retrieve(args.conversation_flow_id as string);
        return JSON.stringify(flow, null, 2);
      }

      case "retell_create_conversation_flow": {
        // Use 'as any' because ConversationFlowCreateParams has deeply nested node union types
        // that cannot be statically verified for runtime MCP inputs.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cfCreateResult = await retell.conversationFlow.create(args as any);
        return JSON.stringify(cfCreateResult, null, 2);
      }

      case "retell_update_conversation_flow": {
        const { conversation_flow_id: cfId, ...cfUpdateBody } = args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cfUpdateResult = await retell.conversationFlow.update(cfId as string, cfUpdateBody as any);
        return JSON.stringify(cfUpdateResult, null, 2);
      }

      case "retell_delete_conversation_flow": {
        await retell.conversationFlow.delete(args.conversation_flow_id as string);
        return JSON.stringify({
          success: true,
          message: `Conversation Flow ${args.conversation_flow_id} deleted.`,
        });
      }

      // ── Conversation Flow Components ──────────────────────────────────────
      case "retell_list_conversation_flow_components": {
        const components = await retell.conversationFlowComponent.list();
        return JSON.stringify(components, null, 2);
      }

      case "retell_get_conversation_flow_component": {
        const component = await retell.conversationFlowComponent.retrieve(
          args.conversation_flow_component_id as string
        );
        return JSON.stringify(component, null, 2);
      }

      case "retell_create_conversation_flow_component": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cfcCreateResult = await retell.conversationFlowComponent.create(args as any);
        return JSON.stringify(cfcCreateResult, null, 2);
      }

      case "retell_update_conversation_flow_component": {
        const { conversation_flow_component_id: cfcId, ...cfcUpdateBody } = args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cfcUpdateResult = await retell.conversationFlowComponent.update(cfcId as string, cfcUpdateBody as any);
        return JSON.stringify(cfcUpdateResult, null, 2);
      }

      case "retell_delete_conversation_flow_component": {
        await retell.conversationFlowComponent.delete(
          args.conversation_flow_component_id as string
        );
        return JSON.stringify({
          success: true,
          message: `Conversation Flow Component ${args.conversation_flow_component_id} deleted.`,
        });
      }

      // ── Agent Versions & Publish ─────────────────────────────────────────
      case "retell_get_agent_versions": {
        const result = await retell.agent.getVersions(args.agent_id as string);
        return JSON.stringify(result, null, 2);
      }

      case "retell_publish_agent": {
        const result = await retell.agent.publish(args.agent_id as string);
        return JSON.stringify(result, null, 2);
      }

      // ── Call Update & Register ────────────────────────────────────────────
      case "retell_update_call": {
        const { call_id, ...callUpdateBody } = args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateResult = await retell.call.update(call_id as string, callUpdateBody as any);
        return JSON.stringify(updateResult, null, 2);
      }

      case "retell_register_phone_call": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const registerResult = await retell.call.registerPhoneCall(args as any);
        return JSON.stringify(registerResult, null, 2);
      }

      // ── Phone Number Import ───────────────────────────────────────────────
      case "retell_import_phone_number": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const importResult = await retell.phoneNumber.import(args as any);
        return JSON.stringify(importResult, null, 2);
      }

      // ── Knowledge Base Sources ────────────────────────────────────────────
      case "retell_add_knowledge_base_sources": {
        const { knowledge_base_id, ...sourceBody } = args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const addResult = await retell.knowledgeBase.addSources(knowledge_base_id as string, sourceBody as any);
        return JSON.stringify(addResult, null, 2);
      }

      case "retell_delete_knowledge_base_source": {
        await retell.knowledgeBase.deleteSource(
          args.knowledge_base_id as string,
          args.source_id as string
        );
        return JSON.stringify({
          success: true,
          message: `Source ${args.source_id} removed from knowledge base ${args.knowledge_base_id}.`,
        });
      }

      // ── Batch Calls ───────────────────────────────────────────────────────
      case "retell_create_batch_call": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const batchResult = await retell.batchCall.createBatchCall(args as any);
        return JSON.stringify(batchResult, null, 2);
      }

      // ── Chat Agents ───────────────────────────────────────────────────────
      case "retell_list_chat_agents": {
        const chatAgents = await retell.chatAgent.list();
        return JSON.stringify(chatAgents, null, 2);
      }

      case "retell_get_chat_agent": {
        const chatAgent = await retell.chatAgent.retrieve(args.agent_id as string);
        return JSON.stringify(chatAgent, null, 2);
      }

      case "retell_create_chat_agent": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chatAgentCreateResult = await retell.chatAgent.create(args as any);
        return JSON.stringify(chatAgentCreateResult, null, 2);
      }

      case "retell_update_chat_agent": {
        const { agent_id: chatAgentIdUpd, ...chatAgentUpdateBody } = args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chatAgentUpdateResult = await retell.chatAgent.update(chatAgentIdUpd as string, chatAgentUpdateBody as any);
        return JSON.stringify(chatAgentUpdateResult, null, 2);
      }

      case "retell_delete_chat_agent": {
        await retell.chatAgent.delete(args.agent_id as string);
        return JSON.stringify({ success: true, message: `Chat agent ${args.agent_id} deleted.` });
      }

      case "retell_get_chat_agent_versions": {
        const chatAgentVersions = await retell.chatAgent.getVersions(args.agent_id as string);
        return JSON.stringify(chatAgentVersions, null, 2);
      }

      case "retell_publish_chat_agent": {
        const publishResult = await retell.chatAgent.publish(args.agent_id as string);
        return JSON.stringify(publishResult, null, 2);
      }

      // ── Chat Sessions ─────────────────────────────────────────────────────
      case "retell_list_chats": {
        const chatList = await retell.chat.list();
        return JSON.stringify(chatList, null, 2);
      }

      case "retell_get_chat": {
        const chatDetail = await retell.chat.retrieve(args.chat_id as string);
        return JSON.stringify(chatDetail, null, 2);
      }

      case "retell_create_chat": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chatCreateResult = await retell.chat.create(args as any);
        return JSON.stringify(chatCreateResult, null, 2);
      }

      case "retell_update_chat": {
        const { chat_id, ...chatUpdateBody } = args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chatUpdateResult = await retell.chat.update(chat_id as string, chatUpdateBody as any);
        return JSON.stringify(chatUpdateResult, null, 2);
      }

      case "retell_create_chat_completion": {
        const completionResult = await retell.chat.createChatCompletion({
          chat_id: args.chat_id as string,
          content: args.content as string,
        });
        return JSON.stringify(completionResult, null, 2);
      }

      case "retell_create_sms_chat": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const smsResult = await retell.chat.createSMSChat(args as any);
        return JSON.stringify(smsResult, null, 2);
      }

      case "retell_end_chat": {
        const endResult = await retell.chat.end(args.chat_id as string);
        return JSON.stringify(endResult, null, 2);
      }

      // ── Tests ─────────────────────────────────────────────────────────────
      case "retell_create_batch_test": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const testResult = await retell.tests.createBatchTest(args as any);
        return JSON.stringify(testResult, null, 2);
      }

      // ── Concurrency ───────────────────────────────────────────────────────
      case "retell_get_concurrency": {
        const concurrency = await retell.concurrency.retrieve();
        return JSON.stringify(concurrency, null, 2);
      }

      // ── MCP Tools ─────────────────────────────────────────────────────────
      case "retell_get_mcp_tools": {
        const mcpToolsQuery: { mcp_id: string; version?: number } = {
          mcp_id: args.mcp_id as string,
        };
        if (args.version !== undefined) mcpToolsQuery.version = args.version as number;
        const mcpToolsResult = await retell.mcpTool.getMcpTools(
          args.agent_id as string,
          mcpToolsQuery
        );
        return JSON.stringify(mcpToolsResult, null, 2);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const error = err as Error & { status?: number; error?: unknown };
    const errorResult: Record<string, unknown> = {
      error: true,
      message: error.message,
    };
    if (error.status !== undefined) errorResult.status = error.status;
    if (error.error !== undefined) errorResult.details = error.error;
    return JSON.stringify(errorResult, null, 2);
  }
}

// ─── MCP Server Setup ─────────────────────────────────────────────────────────
const mcpServer = new McpServer(
  {
    name: "retell-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// McpServer is the non-deprecated high-level wrapper.
// We use its underlying .server for raw JSON-Schema tool registration,
// which is the documented pattern for advanced use cases.
mcpServer.server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

mcpServer.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await handleToolCall(name, (args ?? {}) as ToolArgs);
  return {
    content: [{ type: "text", text: result }],
  };
});

// ─── Start ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("Retell AI MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
