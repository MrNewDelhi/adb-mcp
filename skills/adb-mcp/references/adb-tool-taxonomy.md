# ADB Tool Taxonomy For adb-mcp

## Device Discovery

Use first:

```text
adb_devices(long=true)
adb_wait_for_device(serial="...")
```

Use `adb_server` for `start-server`, `kill-server`, and reconnect workflows.

## Evidence Collection

Prefer before mutation:

```text
adb_diagnostics(serial="...", packageName="...")
adb_logcat(serial="...", action="read", lines=1000, format="threadtime")
adb_screencap(serial="...", outputPath="/tmp/current.png")
adb_dumpsys(serial="...", service="activity")
adb_package_info(serial="...", packageName="...", info="dump")
```

## App Workflows

Use typed app tools before raw shell:

```text
adb_install(...)
adb_pm_packages(...)
adb_app_control(action="launch" | "force-stop" | "clear")
adb_permission(action="grant" | "revoke")
adb_intent(...)
```

## Interaction

Use `adb_input` for simple UI driving:

```text
adb_input(type="keyevent", keycode="KEYCODE_HOME")
adb_input(type="tap", x=100, y=200)
adb_input(type="swipe", x=500, y=1600, x2=500, y2=400, durationMs=500)
adb_input(type="text", text="hello world")
```

For robust UI testing, pair input actions with UI hierarchy dumps through `adb_shell(command="uiautomator dump /dev/tty")`.

## Files And Artifacts

Use:

```text
adb_file_push(localPath="...", remotePath="...")
adb_file_pull(remotePath="...", localPath="...")
adb_file_shell(action="ls" | "cat" | "stat", path="...")
adb_bugreport(outputPath="/tmp/bugreport.zip")
adb_screenrecord(outputPath="/tmp/demo.mp4")
```

Treat `rm`, `chmod`, and `chown` as destructive.

## Exact Fallback

Use `adb_command` when:

- ADB has a flag not yet wrapped.
- The command must match official docs or a bug report exactly.
- You need bootloader/recovery behavior not modeled by a typed tool.

Example:

```text
adb_command(args=["shell", "cmd", "package", "resolve-activity", "--brief", "com.example"])
```
