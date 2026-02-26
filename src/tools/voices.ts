import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

export const voiceTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_list_voices",
      description:
        "List all available voices for Retell AI agents, including provider, gender, accent, and preview audio URLs.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    handler: async () => {
      const result = await retell.voice.list();
      return JSON.stringify(result, null, 2);
    },
  },
];
