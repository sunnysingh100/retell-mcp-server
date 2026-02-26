import { z } from "zod";
import Retell from "retell-sdk";
import { retell } from "../client.js";
import type { ToolRegistration } from "../types.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const GetPhoneNumberSchema = z.object({
  phone_number: z.string().min(1, "phone_number is required"),
});

const CreatePhoneNumberSchema = z.object({
  area_code: z.number().int().optional(),
  inbound_agent_id: z.string().optional(),
  outbound_agent_id: z.string().optional(),
  nickname: z.string().optional(),
});

const UpdatePhoneNumberSchema = z.object({
  phone_number: z.string().min(1, "phone_number is required"),
  inbound_agent_id: z.string().optional(),
  outbound_agent_id: z.string().optional(),
  nickname: z.string().optional(),
});

const DeletePhoneNumberSchema = z.object({
  phone_number: z.string().min(1, "phone_number is required"),
});

const ImportPhoneNumberSchema = z.object({
  phone_number: z.string().min(1, "phone_number is required"),
  termination_uri: z.string().min(1, "termination_uri is required"),
  inbound_agent_id: z.string().optional(),
  outbound_agent_id: z.string().optional(),
  nickname: z.string().optional(),
  sip_trunk_auth_username: z.string().optional(),
  sip_trunk_auth_password: z.string().optional(),
});

// ─── Tool Registrations ──────────────────────────────────────────────────────

export const phoneNumberTools: ToolRegistration[] = [
  {
    definition: {
      name: "retell_list_phone_numbers",
      description: "List all phone numbers in your Retell AI account.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    handler: async () => {
      const result = await retell.phoneNumber.list();
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
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
    handler: async (raw) => {
      const args = GetPhoneNumberSchema.parse(raw);
      const result = await retell.phoneNumber.retrieve(args.phone_number);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
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
    handler: async (raw) => {
      const args = CreatePhoneNumberSchema.parse(raw);
      const params: Retell.PhoneNumberCreateParams = {};
      if (args.area_code !== undefined) params.area_code = args.area_code;
      if (args.inbound_agent_id !== undefined) params.inbound_agent_id = args.inbound_agent_id;
      if (args.outbound_agent_id !== undefined) params.outbound_agent_id = args.outbound_agent_id;
      if (args.nickname !== undefined) params.nickname = args.nickname;
      const result = await retell.phoneNumber.create(params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
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
    handler: async (raw) => {
      const args = UpdatePhoneNumberSchema.parse(raw);
      const params: Retell.PhoneNumberUpdateParams = {};
      if (args.inbound_agent_id !== undefined) params.inbound_agent_id = args.inbound_agent_id || null;
      if (args.outbound_agent_id !== undefined) params.outbound_agent_id = args.outbound_agent_id || null;
      if (args.nickname !== undefined) params.nickname = args.nickname;
      const result = await retell.phoneNumber.update(args.phone_number, params);
      return JSON.stringify(result, null, 2);
    },
  },

  {
    definition: {
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
    handler: async (raw) => {
      const args = DeletePhoneNumberSchema.parse(raw);
      await retell.phoneNumber.delete(args.phone_number);
      return JSON.stringify({
        success: true,
        message: `Phone number ${args.phone_number} released.`,
      });
    },
  },

  {
    definition: {
      name: "retell_import_phone_number",
      description:
        "Import a phone number from your own custom telephony (SIP trunk) and optionally bind agents to it.",
      inputSchema: {
        type: "object",
        properties: {
          phone_number: { type: "string", description: "The number to import in E.164 format." },
          termination_uri: {
            type: "string",
            description: "SIP termination URI for outbound calls (e.g. 'someuri.pstn.twilio.com').",
          },
          inbound_agent_id: { type: "string", description: "Agent to handle inbound calls." },
          outbound_agent_id: { type: "string", description: "Agent to use for outbound calls." },
          nickname: { type: "string", description: "Optional label for this number." },
          sip_trunk_auth_username: { type: "string", description: "SIP trunk auth username." },
          sip_trunk_auth_password: { type: "string", description: "SIP trunk auth password." },
        },
        required: ["phone_number", "termination_uri"],
      },
    },
    handler: async (raw) => {
      const args = ImportPhoneNumberSchema.parse(raw);
      const params: Retell.PhoneNumberImportParams = {
        phone_number: args.phone_number,
        termination_uri: args.termination_uri,
      };
      if (args.inbound_agent_id !== undefined) params.inbound_agent_id = args.inbound_agent_id;
      if (args.outbound_agent_id !== undefined) params.outbound_agent_id = args.outbound_agent_id;
      if (args.nickname !== undefined) params.nickname = args.nickname;
      if (args.sip_trunk_auth_username !== undefined)
        params.sip_trunk_auth_username = args.sip_trunk_auth_username;
      if (args.sip_trunk_auth_password !== undefined)
        params.sip_trunk_auth_password = args.sip_trunk_auth_password;
      const result = await retell.phoneNumber.import(params);
      return JSON.stringify(result, null, 2);
    },
  },
];
