# Retell AI MCP Server

A **Model Context Protocol (MCP) server** for the Retell AI platform. Enables AI assistants like Claude to manage AI voice agents, calls, phone numbers, LLMs, knowledge bases, and voices — directly via natural language.

## Features

**25 tools** covering the full Retell AI API surface:

| Category | Tools |
|---|---|
| 🤖 **Agents** | list, get, create, update, delete |
| 📞 **Calls** | list, get, create phone call, create web call, delete |
| ☎️ **Phone Numbers** | list, get, create (purchase), update, delete |
| 🧠 **LLMs** | list, get, create, update, delete |
| 📚 **Knowledge Bases** | list, get, create, delete |
| 🎙️ **Voices** | list |

## Prerequisites

- Node.js 18+
- A [Retell AI account](https://dashboard.retellai.com) with an API key

## Setup

### 1. Install dependencies & build

```bash
cd retell-mcp-server
npm install
npm run build
```

### 2. Configure your API key

Copy `.env.example` to `.env` and add your Retell API key:

```bash
cp .env.example .env
```

Then edit `.env`:
```
RETELL_API_KEY=key_xxxxxxxxxxxxxxxxxxxxxxxx
```

Get your API key from the [Retell AI Dashboard → API Keys](https://dashboard.retellai.com).

### 3. Connect to an MCP client

#### Claude Desktop

Add this to your `claude_desktop_config.json` (usually at `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "retell-ai": {
      "command": "node",
      "args": ["C:/Users/JULI/retell-mcp-server/dist/index.js"],
      "env": {
        "RETELL_API_KEY": "key_xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

#### Codex / Other MCP clients

Use the provided `mcp_config.json` as a reference. Update `RETELL_API_KEY` with your actual key.

## Usage Examples

Once connected, you can ask your AI assistant things like:

- *"List all my Retell AI agents"*
- *"Create a new LLM with a customer support prompt using gpt-4o-mini"*
- *"Create a new voice agent named 'Support Bot' using the LLM I just created"*
- *"Show me all calls from the last 24 hours"*
- *"Make an outbound call from +14157774444 to +12137774445"*
- *"Purchase a new phone number with area code 415 and bind it to agent abc123"*
- *"Create a knowledge base with our FAQ text and attach it to the LLM"*
- *"List all available voices"*
- *"Delete the agent with ID oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD"*

## Tool Reference

### Agents

| Tool | Description |
|---|---|
| `retell_list_agents` | List all agents |
| `retell_get_agent` | Get agent by ID |
| `retell_create_agent` | Create agent (requires **voice_id** + **llm_id** or **llm_websocket_url**) |
| `retell_update_agent` | Update agent settings |
| `retell_delete_agent` | Delete an agent |

### Calls

| Tool | Description |
|---|---|
| `retell_list_calls` | List calls with optional filters |
| `retell_get_call` | Get full call details (transcript, recording, etc.) |
| `retell_create_phone_call` | Make outbound phone call |
| `retell_create_web_call` | Create browser-based web call |
| `retell_delete_call` | Delete a call record |

### Phone Numbers

| Tool | Description |
|---|---|
| `retell_list_phone_numbers` | List all phone numbers |
| `retell_get_phone_number` | Get phone number details |
| `retell_create_phone_number` | Purchase & configure a new number |
| `retell_update_phone_number` | Update number agent bindings |
| `retell_delete_phone_number` | Release a phone number |

### LLMs

| Tool | Description |
|---|---|
| `retell_list_llms` | List all LLM configurations |
| `retell_get_llm` | Get LLM details |
| `retell_create_llm` | Create LLM with prompt, model, and tools |
| `retell_update_llm` | Update LLM settings |
| `retell_delete_llm` | Delete an LLM |

### Knowledge Bases

| Tool | Description |
|---|---|
| `retell_list_knowledge_bases` | List all knowledge bases |
| `retell_get_knowledge_base` | Get knowledge base details |
| `retell_create_knowledge_base` | Create KB from text/URLs |
| `retell_delete_knowledge_base` | Delete a knowledge base |

### Voices

| Tool | Description |
|---|---|
| `retell_list_voices` | List all available voices |

## Development

```bash
# Build TypeScript
npm run build

# Watch mode
npm run watch
```

## Project Structure

```
retell-mcp-server/
├── src/
│   └── index.ts          # Main MCP server implementation
├── dist/                 # Compiled JavaScript output
├── package.json
├── tsconfig.json
├── mcp_config.json       # MCP client configuration reference
└── .env.example          # Environment variable template
```
