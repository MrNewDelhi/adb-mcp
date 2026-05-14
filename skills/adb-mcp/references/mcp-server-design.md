# MCP Server Design For adb-mcp

## Scope

Use this reference when adding, refactoring, or reviewing MCP server features in `adb-mcp`.

## Core Components

MCP servers expose three main primitives:

- **Tools**: model-invoked actions with schemas. Use tools for ADB commands, app control, file transfer, screenshots, and diagnostics.
- **Resources**: read-only data selected by the host application. Use resources for cheatsheets, generated artifacts, schema/reference docs, and large outputs that should not be embedded in a tool response.
- **Prompts**: user-invoked workflow templates. Use prompts for repeatable Android workflows such as triage, install smoke tests, or crash reproduction.

The current server uses `StdioServerTransport`, which is the right default for local, process-spawned MCP integrations. If adding HTTP transport later, add host validation and authentication before exposing it.

## Tool Design Rules

Design each tool as a narrow operation:

- Use a verb-noun name such as `adb_screencap`, `adb_logcat`, or `adb_app_control`.
- Define inputs with Zod schemas.
- Keep descriptions concrete enough for a model to choose correctly.
- Include `serial` on device-specific tools.
- Include `timeoutMs` on operations that can block.
- Return command metadata, stdout, stderr, exit code, and timeout status.
- For generated files, return an absolute local output path.
- Prefer arrays of arguments over shell strings unless Android shell syntax is required.

Use `adb_command` as the explicit escape hatch for raw ADB behavior. Do not duplicate every obscure ADB flag as a new tool unless it creates a safer or clearer workflow.

## Resources

Use resources when the client should choose whether to attach content:

- `adb://cheatsheet` for compact usage notes.
- Future `adb://diagnostics/{id}` for large triage bundles.
- Future `adb://artifacts/{name}` for screenshots, recordings, logs, or bugreports.

Avoid returning large logs directly from tools when a resource link or output file path is better.

## Prompts

Use prompts for workflows that users explicitly request:

- `adb_triage`: device/app snapshot, logs, screenshot, and next action plan.
- Future `adb_install_smoke_test`: install, permission grant, launch, screenshot, logs.
- Future `adb_crash_repro`: clear logs, run steps, collect crash buffer and bugreport.

Prompts should reference tools and expected evidence. They should not duplicate every tool description.

## Transport Choices

- Use stdio for local desktop/CLI integrations.
- Use Streamable HTTP only when remote access is needed.
- If HTTP is added, require host header validation, auth, CORS review, and documented deployment topology.

## Best Practices Checklist

- Keep tool names stable once published.
- Add new tools rather than changing existing semantics.
- Prefer structured inputs over free-form shell strings.
- Make high-risk behavior obvious in the tool name and description.
- Avoid collecting secrets through tool arguments unless there is no alternative.
- Do not log secrets, tokens, full environment variables, or private file contents.
- Keep README and skill references aligned when adding major workflows.

## Primary References

- MCP server concepts: https://modelcontextprotocol.io/docs/learn/server-concepts
- MCP TypeScript SDK server guide: https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/docs/server.md
- MCP SDK overview: https://modelcontextprotocol.io/docs/sdk
