import { strict as assert } from "node:assert";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
});

const client = new Client({ name: "adb-mcp-smoke", version: "0.0.0" });

try {
  await client.connect(transport);

  const { tools } = await client.listTools();
  const toolNames = tools.map((tool) => tool.name);

  assert.equal(tools.length, 38, "expected all adb-mcp tools to be registered");
  for (const required of ["adb_command", "adb_devices", "adb_screencap", "adb_logcat", "adb_diagnostics"]) {
    assert.ok(toolNames.includes(required), `missing tool: ${required}`);
  }

  const { resources } = await client.listResources();
  assert.ok(resources.some((resource) => resource.uri === "adb://cheatsheet"), "missing adb cheatsheet resource");

  const { prompts } = await client.listPrompts();
  assert.ok(prompts.some((prompt) => prompt.name === "adb_triage"), "missing adb_triage prompt");

  console.log(JSON.stringify({ ok: true, toolCount: tools.length, resources: resources.length, prompts: prompts.length }, null, 2));
} finally {
  await client.close();
}
