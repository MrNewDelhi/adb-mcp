# Security Policy

## Security Model

`adb-mcp` is a local Model Context Protocol server for Android Debug Bridge automation. It can execute ADB commands, run Android shell commands, move files, collect logs, capture screens, install/uninstall apps, and change device state.

Run it only with trusted MCP clients and trusted repositories. It has the same local privileges as the process that starts it.

## High-Risk Operations

These tools can mutate devices, apps, or local files:

- `adb_command`
- `adb_shell`
- `adb_uninstall`
- `adb_app_control` with `clear`, `disable`, `suspend`, or `force-stop`
- `adb_file_shell` with `rm`, `chmod`, or `chown`
- `adb_reboot`
- `adb_root_remount`
- `adb_setprop`
- `adb_settings` with `put` or `delete`
- `adb_network`, `adb_battery_power`, and `adb_display` setters
- `adb_backup_restore`

## Recommended Use

- Prefer emulators or dedicated test devices.
- Use `StdioServerTransport` for local MCP clients.
- Review any MCP client configuration before executing it.
- Avoid storing private logs, screenshots, recordings, or bugreports in public repositories.
- Treat bugreports as sensitive because they can contain device, account, app, and environment data.

## If HTTP Transport Is Added Later

Add authentication, host header validation, CORS review, and DNS rebinding protection before exposing the server over a network or localhost HTTP endpoint.

## Reporting Issues

Open a GitHub issue for non-sensitive security concerns. For sensitive reports, use a private communication channel with the repository owner rather than posting exploit details publicly.
