import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RunResult } from "./adb.js";

export type AdbRunner = (args: string[], timeoutMs?: number, env?: Record<string, string>) => Promise<RunResult>;

export type ToolRegistrar = (server: McpServer, adb: AdbRunner) => void;
