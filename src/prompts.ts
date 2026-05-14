import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
  server.registerPrompt("adb_triage", {
    description: "Collect an Android device/app triage plan.",
    argsSchema: { packageName: z.string().optional() },
  }, ({ packageName }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Triage the connected Android target${packageName ? ` for ${packageName}` : ""}. Start with adb_devices, then collect diagnostics, focused logs, package state, screenshots if useful, and propose minimal next actions.`,
        },
      },
    ],
  }));
}
