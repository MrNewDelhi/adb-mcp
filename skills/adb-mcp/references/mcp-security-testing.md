# Security And Testing For adb-mcp

## Security Model

`adb-mcp` is a local MCP server that can run ADB commands with the same user privileges as the MCP client process. ADB can mutate connected devices and can read or write local files through pull/push artifacts. Treat this server like a local automation binary with direct device control.

## High-Risk Surfaces

- Raw command execution through `adb_command`.
- Android shell execution through `adb_shell`.
- App data deletion through `adb_app_control(action="clear")`.
- Package removal through `adb_uninstall`.
- File mutation through `adb_file_shell`.
- Device state changes through reboot, settings, display, network, root/remount, and battery/power tools.
- Large artifact collection through bugreports, logs, screenshots, screen recordings, and pulled files.

## Security Rules

- Keep destructive operations explicit in names and descriptions.
- Prefer stdio transport for local use.
- If HTTP transport is added, require authentication and DNS rebinding protection.
- Do not treat session IDs as authentication.
- Do not accept OAuth/access tokens unless they are issued specifically for this MCP server.
- Avoid broad scopes if authorization is added; use progressive least privilege.
- Never pass secrets in logs, tool descriptions, resource URIs, or prompt text.
- Use allow-lists for any future feature that accesses host paths outside explicit user-provided output paths.
- Make generated local paths explicit in tool responses.

## Testing Layers

Run tests in this order:

1. **Static checks**: `npm run typecheck`.
2. **MCP smoke test**: `npm run test:mcp`.
3. **Skill validation**: `npm run validate:skill`.
4. **No-device behavior**: call read-only/list tools where possible and ensure missing `adb` is reported clearly.
5. **Emulator integration**: boot an AVD, run device discovery, diagnostics, screenshot, logcat, input, and app launch flows.
6. **Destructive-tool review**: verify names, descriptions, and docs make state changes obvious.

## Integration Test Matrix

With an emulator connected:

```text
adb_devices(long=true)
adb_wait_for_device(serial="emulator-5554")
adb_getprop(serial="emulator-5554", property="ro.build.version.release")
adb_screencap(serial="emulator-5554", outputPath="/tmp/adb-mcp-smoke.png")
adb_logcat(serial="emulator-5554", action="read", lines=100)
adb_input(serial="emulator-5554", type="keyevent", keycode="KEYCODE_HOME")
adb_diagnostics(serial="emulator-5554")
```

With a sample APK:

```text
adb_install(serial="emulator-5554", apkPaths=["/path/app.apk"], reinstall=true, grantPermissions=true)
adb_app_control(serial="emulator-5554", packageName="com.example.app", action="launch")
adb_package_info(serial="emulator-5554", packageName="com.example.app", info="dump")
```

## Release Readiness

- `npm run test` passes.
- README lists any new tool or workflow.
- Skill references explain any new high-risk operation.
- New tools have clear input schemas.
- Generated artifacts use predictable output handling.
- GitHub repository does not include secrets, private logs, screenshots with sensitive data, or device-specific credentials.

## Primary References

- MCP security best practices: https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices
- MCP TypeScript SDK server guide: https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/docs/server.md
