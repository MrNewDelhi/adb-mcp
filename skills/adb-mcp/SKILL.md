---
name: adb-mcp
description: Use when working with, extending, reviewing, testing, or safely operating the adb-mcp Model Context Protocol server for Android Debug Bridge automation. Covers Android device/emulator workflows, MCP server components such as tools/resources/prompts/transports, TypeScript SDK implementation patterns, security review, and validation/testing of ADB MCP tools.
---

# adb-mcp

Use this skill when an Android task can be handled through the `adb-mcp` MCP server, or when changing the server itself.

## Choose Context

- For MCP design or implementation changes, read `references/mcp-server-design.md`.
- For security review, destructive tool handling, or release readiness, read `references/mcp-security-testing.md`.
- For Android tool selection and ADB workflow patterns, read `references/adb-tool-taxonomy.md`.

## Operate The Server

1. Start with `adb_devices` unless the user already gave a serial.
2. Pass `serial` explicitly whenever more than one target is connected.
3. Prefer typed tools for common operations.
4. Use `adb_command` only for exact ADB flags, uncommon subcommands, or newly added platform-tools behavior.
5. Collect evidence before changing state: `adb_diagnostics`, `adb_logcat`, `adb_screencap`, `adb_package_info`, and targeted `adb_dumpsys`.
6. For app workflows, prefer `adb_intent`, `adb_app_control`, `adb_permission`, and `adb_pm_packages` before `adb_shell`.

## Extend The Server

1. Decide whether the feature is a tool, resource, or prompt.
2. Keep each tool single-purpose with a Zod input schema and a clear description.
3. Use resources for read-only reference material or generated artifacts.
4. Use prompts for repeatable user-invoked workflows such as triage.
5. Add or update tests before considering the change complete.
6. Update this skill only with durable workflow guidance; put details in references.

## Safety

Treat these as state-changing or destructive unless the user clearly intends them:

- `adb_uninstall`
- `adb_app_control` with `clear`, `disable`, `suspend`, or `force-stop`
- `adb_file_shell` with `rm`, `chmod`, or `chown`
- `adb_reboot`
- `adb_root_remount`
- `adb_setprop`
- `adb_settings` with `put` or `delete`
- `adb_network`, `adb_battery_power`, and `adb_display` setters
- `adb_backup_restore`
- Raw `adb_command` and `adb_shell`

Prefer evidence-gathering tools before destructive tools. Do not hide destructive behavior behind a harmless-looking tool name.

## Common Operation Patterns

Device snapshot:

```text
adb_devices(long=true)
adb_diagnostics(serial=?, packageName=?)
adb_screencap(serial=?)
```

App launch and logs:

```text
adb_logcat(action="clear")
adb_app_control(action="launch", packageName="...")
adb_logcat(action="read", lines=1000, format="threadtime")
```

Install and grant:

```text
adb_install(apkPaths=["/path/app.apk"], reinstall=true, grantPermissions=true)
adb_permission(action="grant", packageName="...", permission="android.permission.POST_NOTIFICATIONS")
```

Intent start:

```text
adb_intent(
  intentType="start",
  action="android.intent.action.VIEW",
  data="example://path",
  packageName="...",
  wait=true
)
```

Exact ADB fallback:

```text
adb_command(args=["shell", "cmd", "package", "resolve-activity", "--brief", "com.example"])
```

## Output Handling

Most tools return the executed command, args, exit code, stdout, stderr, and timeout status. File-producing tools return the local output path. When a command fails, inspect `stderr` and retry with a longer `timeoutMs` only when the operation is expected to be slow.

## Validation

Run these checks after server or skill changes:

```bash
npm run typecheck
npm run test:mcp
npm run validate:skill
```

Use a connected emulator or test device for live ADB verification. If no Android target is available, still run the MCP smoke test because it validates server startup and capability registration without invoking `adb`.
