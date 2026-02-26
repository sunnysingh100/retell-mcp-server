import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

export const concurrencyTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_get_concurrency",
      description:
        "Get the current live call concurrency and concurrency limits for your Retell organization.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    handler: async () => {
      const result = await retell.concurrency.retrieve();
      return JSON.stringify(result, null, 2);
    },
  },
];
