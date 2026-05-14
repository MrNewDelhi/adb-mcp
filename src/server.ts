import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAdbRunner } from "./adb.js";
import { registerPrompts } from "./prompts.js";
import { registerResources } from "./resources.js";
import { registerAdbTools } from "./tools/adbTools.js";

export const SERVER_NAME = "adb-mcp";
export const SERVER_VERSION = "0.1.0";

const instructions = [
  "Start with adb_devices before targeting a device unless the user supplied a serial.",
  "Use the serial argument for every device-specific tool when multiple devices are connected.",
  "Prefer typed adb-mcp tools for common workflows; use adb_command only for exact or unsupported ADB behavior.",
  "Collect diagnostics, logs, and screenshots before destructive actions such as uninstall, clear, rm, reboot, settings writes, or raw shell commands.",
  "Treat bugreports, logs, screenshots, recordings, and pulled files as potentially sensitive artifacts.",
].join(" ");

export function createServer(adbBinary = process.env.ADB_PATH || "adb") {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    { instructions },
  );

  const adb = createAdbRunner(adbBinary);
  registerAdbTools(server, adb);
  registerResources(server);
  registerPrompts(server);

  return server;
}
