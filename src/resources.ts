import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(server: McpServer) {
  server.registerResource("adb-cheatsheet", "adb://cheatsheet", {
    title: "ADB MCP Cheatsheet",
    description: "Compact operational guidance for adb-mcp users.",
    mimeType: "text/markdown",
  }, async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "text/markdown",
        text: [
          "# ADB MCP Cheatsheet",
          "",
          "- Use `adb_devices` before targeting devices.",
          "- Use `serial` whenever more than one device is attached.",
          "- Use typed tools for common operations and `adb_command` for any exact adb feature.",
          "- Long-running operations support `timeoutMs`.",
          "- Destructive actions include uninstall, clear, rm, reboot, settings writes, setprop, root/remount, backup/restore, and some emulator commands.",
        ].join("\n"),
      },
    ],
  }));
}
