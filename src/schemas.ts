import { z } from "zod";

export const serialSchema = z.string().min(1).optional().describe("ADB device serial. Omit to use adb's default target.");
export const timeoutSchema = z.number().int().positive().max(3_600_000).optional().describe("Command timeout in milliseconds.");
export const envSchema = z.record(z.string(), z.string()).optional().describe("Extra environment variables for the adb process.");
export const optionalBool = z.boolean().optional();

export const intentSchema = {
  serial: serialSchema,
  intentType: z.enum(["start", "start-activity", "startservice", "start-foreground-service", "broadcast"]),
  action: z.string().optional(),
  data: z.string().optional(),
  mimeType: z.string().optional(),
  component: z.string().optional().describe("Component such as com.example/.MainActivity."),
  packageName: z.string().optional(),
  categories: z.array(z.string()).optional(),
  flags: z.array(z.string()).optional().describe("Intent flags as numeric strings, e.g. 0x10000000."),
  extras: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  user: z.string().optional(),
  wait: optionalBool.describe("Use -W for activity starts."),
  timeoutMs: timeoutSchema,
};
