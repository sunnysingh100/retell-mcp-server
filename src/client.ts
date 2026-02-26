import Retell from "retell-sdk";

const RETELL_API_KEY = process.env.RETELL_API_KEY;
if (!RETELL_API_KEY) {
  console.error("Error: RETELL_API_KEY environment variable is required.");
  process.exit(1);
}

export const retell = new Retell({ apiKey: RETELL_API_KEY });
