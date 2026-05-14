# adb-mcp

A broad Android Debug Bridge MCP server for local Android device and emulator automation.

It exposes typed tools for the common ADB surface area and keeps a raw `adb_command` escape hatch for everything else, so agents can use precise ADB behavior without waiting for a wrapper to be added.

## Features

- Device discovery, server control, wait states, USB/TCPIP transport switching
- Raw shell execution, reboot modes, root/remount/verity helpers
- APK install/uninstall, package listing, package dumps, app launch/stop/clear/enable/disable
- Runtime permissions and package control
- File push/pull and shell file operations
- Screenshots, screen recordings, logcat capture/clear/save
- `dumpsys`, `getprop`, `setprop`, Android `settings`
- Input events: key, text, tap, swipe, roll, press
- Intents: activity, service, foreground service, broadcasts, extras, flags, categories
- Port forward/reverse
- Network, display, battery/power helpers
- Content provider CLI access
- Bugreports, emulator console commands, legacy backup/restore
- Compact diagnostics bundle for triage
- MCP resource cheatsheet and prompt template

## Requirements

- Node.js 20+
- Android Platform Tools installed
- `adb` on `PATH`, or set `ADB_PATH=/absolute/path/to/adb`

## Install

```bash
npm install
npm run build
```

## Run

```bash
npm run dev
```

After building:

```bash
npm start
```

Or as a package binary:

```bash
adb-mcp
```

## MCP config example

```json
{
  "mcpServers": {
    "adb": {
      "command": "node",
      "args": ["/absolute/path/to/adb-mcp/dist/index.js"],
      "env": {
        "ADB_PATH": "adb"
      }
    }
  }
}
```

## Tool groups

Core:

- `adb_command`
- `adb_version`
- `adb_devices`
- `adb_server`
- `adb_wait_for_device`
- `adb_connect`
- `adb_disconnect`
- `adb_transport_mode`

Device and shell:

- `adb_shell`
- `adb_reboot`
- `adb_root_remount`
- `adb_getprop`
- `adb_setprop`
- `adb_settings`
- `adb_dumpsys`
- `adb_diagnostics`

Apps and packages:

- `adb_install`
- `adb_uninstall`
- `adb_pm_packages`
- `adb_package_info`
- `adb_app_control`
- `adb_permission`
- `adb_intent`

Files, media, logs:

- `adb_file_push`
- `adb_file_pull`
- `adb_file_shell`
- `adb_screencap`
- `adb_screenrecord`
- `adb_logcat`
- `adb_bugreport`

System helpers:

- `adb_input`
- `adb_ports`
- `adb_network`
- `adb_battery_power`
- `adb_display`
- `adb_content`
- `adb_emulator_console`
- `adb_backup_restore`

## Safety notes

This server intentionally exposes powerful ADB operations. Many actions can change device state, erase app data, uninstall apps, reboot devices, write settings, manipulate files, or run arbitrary shell commands. Use with trusted MCP clients and connected test devices.

## Skills

The `skills/adb-mcp` folder contains a Codex-compatible skill that tells agents how to use this MCP server for Android debugging, QA, automation, and triage workflows.
