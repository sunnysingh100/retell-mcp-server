# Retell AI - Model Context Protocol (MCP) Server

A fully-featured, official-grade Model Context Protocol (MCP) server that provides complete programmatic access to the **[Retell AI](https://retellai.com)** platform. 

This MCP server achieves **100% parity with the Retell Node.js SDK**, exposing 60 specific tools allowing LLM-powered assistants (like Claude Desktop, Cursor, and Codex) to autonomously build, configure, and operate end-to-end voice and text agents.

---

## Capabilities

With this server, your AI assistant can autonomously:
- **Design Agents:** Create and configure LLM response engines, Conversation Flows, and Chat Agents.
- **Provide Memory:** Create Knowledge Bases, upload content, and link them to agents for RAG.
- **Manage Telephony:** Purchase, import, and configure U.S. or international phone numbers.
- **Trigger outbound calls & test:** Initiate Web calls, Phone calls, SMS chats, and batch tests.
- **Monitor:** Retrieve transcripts, real-time metrics, live call concurrency, and latency scores.

Everything available in the official SDK is available as an MCP Tool.

---

## Installation

### Prerequisites
- Node.js 18+
- A Retell AI API Key (from the [Retell Dashboard](https://beta.retellai.com/dashboard))

### Setup
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-repo/retell-mcp-server.git
cd retell-mcp-server
npm install
npm run build
```

---

## Configuration

To use this with an MCP client (such as Claude Desktop or Codex), you must configure it via your client's settings.

### Claude Desktop
Edit your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "retell-ai": {
      "command": "node",
      "args": [
        "/absolute/path/to/retell-mcp-server/dist/index.js"
      ],
      "env": {
        "RETELL_API_KEY": "your_retell_api_key_here"
      }
    }
  }
}
```

### Generic Client
Just run the built script with the environment variable set. The server operates over `stdio` via the standard MCP JSON-RPC protocol.
```bash
RETELL_API_KEY="your_api_key" node dist/index.js
```

---

## Available Tools (60 Total)

The server supports all 14 domain resources of the Retell SDK.

### 🎙 Voices
- `retell_list_voices`: List available voices across providers (ElevenLabs, OpenAI, Deepgram, etc).

### 🧠 LLMs & Knowledge Bases
- `retell_list_llms` / `retell_get_llm` / `retell_create_llm` / `retell_update_llm` / `retell_delete_llm`
- `retell_list_knowledge_bases` / `retell_get_knowledge_base` / `retell_create_knowledge_base` / `retell_delete_knowledge_base`
- `retell_add_knowledge_base_sources` / `retell_delete_knowledge_base_source`

### 🤖 Voice Agents
- `retell_list_agents` / `retell_get_agent` / `retell_create_agent` / `retell_update_agent` / `retell_delete_agent` 
- `retell_get_agent_versions` / `retell_publish_agent`

### 📱 Phone Numbers
- `retell_list_phone_numbers` / `retell_get_phone_number` / `retell_create_phone_number`
- `retell_update_phone_number` / `retell_delete_phone_number` / `retell_import_phone_number`

### 📞 Voice Calls
- `retell_list_calls` / `retell_get_call` / `retell_update_call` / `retell_delete_call`
- **Initiate:** `retell_create_phone_call` / `retell_create_web_call` / `retell_register_phone_call`

### 💬 Chat Agents & Sessions
- **Agents:** `retell_list_chat_agents` / `retell_get_chat_agent` / `retell_create_chat_agent` / `retell_update_chat_agent` / `retell_delete_chat_agent` / `retell_get_chat_agent_versions` / `retell_publish_chat_agent`
- **Sessions:** `retell_list_chats` / `retell_get_chat` / `retell_create_chat` / `retell_update_chat` / `retell_create_chat_completion` / `retell_create_sms_chat` / `retell_end_chat`

### 🔀 Conversation Flows (Node-based scripting)
- **Flows:** `retell_list_conversation_flows` / `retell_get_conversation_flow` / `retell_create_conversation_flow` / `retell_update_conversation_flow` / `retell_delete_conversation_flow`
- **Components:** `list`, `get`, `create`, `update`, `delete` for reusable conversation flow components.

### ⚙️ Utilities
- `retell_create_batch_call` / `retell_create_batch_test`
- `retell_get_concurrency`
- `retell_get_mcp_tools`

---

## Architectural Notes

- **Input Validation:** Every tool validates its inputs dynamically using strict `zod` schemas. Invalid arguments return clean, detailed error messages.
- **Type Safety:** The entire codebase is thoroughly typed against the `retell-sdk`, eliminating `any` casting and masking TypeScript errors.
- **Standard Protocol Compliance:** All expected errors generate an MCP protocol `isError: true` payload, ensuring the LLM client correctly handles API rejections without crashing.
