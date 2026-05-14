---
name: adb-mcp
description: Use when working with the adb-mcp server to inspect, debug, automate, or test Android devices and emulators through Android Debug Bridge tools, including packages, logs, screenshots, shell commands, intents, settings, files, ports, network, battery, display, bugreports, and diagnostics.
---

# adb-mcp

Use this skill when an Android task can be handled through the `adb-mcp` MCP server.

## Workflow

1. Start with `adb_devices` unless the user already gave a serial.
2. If more than one device is connected, pass `serial` explicitly to every device-specific tool.
3. Prefer typed tools for common operations.
4. Use `adb_command` for exact ADB flags, uncommon subcommands, or newly added platform-tools behavior.
5. For debugging, collect evidence before changing state: `adb_diagnostics`, `adb_logcat`, `adb_screencap`, `adb_package_info`, and targeted `adb_dumpsys`.
6. For app workflows, prefer `adb_intent`, `adb_app_control`, `adb_permission`, and `adb_pm_packages` before falling back to `adb_shell`.

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

## Common Patterns

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
