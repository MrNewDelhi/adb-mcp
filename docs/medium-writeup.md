# ADB MCP: Android Debug Bridge, Now Agent-Ready

![ADB MCP story preview](https://raw.githubusercontent.com/MrNewDelhi/adb-mcp/main/docs/assets/adb-mcp-cover.png)

## Subtitle

How I wrapped Android Debug Bridge into a Model Context Protocol server for emulator automation, app testing, logs, screenshots, package management, and Android debugging workflows.

## Article

Android Debug Bridge is one of those tools every Android engineer eventually learns to respect. It can install an APK, inspect a device, stream logs, capture screenshots, launch activities, forward ports, tweak settings, pull files, and reboot a device into recovery. It is powerful, scriptable, and wonderfully direct.

But there is a problem: `adb` is still primarily a command-line interface.

That is fine for humans who know the exact command they want. It is less ideal for AI agents, QA automation systems, debugging assistants, and developer tools that need a structured way to discover capabilities, validate inputs, run commands, and return useful results.

So I built **adb-mcp**, a Model Context Protocol server that exposes Android Debug Bridge as a set of typed tools.

Repository:

https://github.com/MrNewDelhi/adb-mcp

## Why MCP for ADB?

Model Context Protocol gives tools a standard shape. Instead of asking an agent to guess shell commands from memory, we can expose Android operations as named tools with schemas:

```text
adb_devices(long=true)
adb_screencap(serial="emulator-5554", outputPath="/tmp/avd.png")
adb_logcat(serial="emulator-5554", action="read", lines=500)
adb_app_control(serial="emulator-5554", packageName="com.example.app", action="launch")
```

That small change matters.

It makes Android automation easier to reason about. It gives agents a safer, more discoverable interface. It also keeps the raw power of ADB available through an escape hatch:

```text
adb_command(args=["shell", "cmd", "package", "resolve-activity", "--brief", "com.example"])
```

The goal was not to hide ADB. The goal was to make it agent-friendly.

## What adb-mcp Can Do

The current server includes 38 MCP tools covering most day-to-day Android debugging and automation tasks:

- Device discovery and ADB server control
- USB and TCP/IP connection management
- Shell commands
- APK install and uninstall
- Package listing and package inspection
- App launch, force-stop, clear data, enable, disable, suspend
- Permission grant and revoke
- File push, pull, listing, cat, remove, chmod, chown
- Screenshot capture
- Screen recording
- Logcat capture, clear, and save
- `dumpsys`, `getprop`, `setprop`, and Android settings
- Input events such as tap, text, swipe, keyevent
- Activity, service, foreground service, and broadcast intents
- Port forward and reverse
- Network, battery, display, and content provider helpers
- Bugreport capture
- Emulator console commands
- Legacy backup and restore helpers
- A compact diagnostics bundle

It also includes a Codex-compatible skill so agents know the safest workflow:

1. Start with `adb_devices`.
2. Use a serial when more than one target is connected.
3. Gather evidence before changing state.
4. Prefer typed tools.
5. Fall back to `adb_command` for exact ADB behavior.

## Running It

Install dependencies and build:

```bash
npm install
npm run build
```

Run the MCP server:

```bash
npm start
```

Example MCP configuration:

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

If `adb` is not on your `PATH`, set `ADB_PATH` to the full Android Platform Tools binary path.


## Architecture

The revamped repository is organized around MCP components instead of one large server file. The executable entrypoint creates a stdio MCP server, registers ADB tools, exposes a compact resource, and provides a reusable triage prompt.

![ADB MCP architecture](https://raw.githubusercontent.com/MrNewDelhi/adb-mcp/main/docs/assets/adb-mcp-architecture.svg)

The main pieces are:

- `src/index.ts`: stdio executable entrypoint
- `src/server.ts`: server metadata, instructions, and component registration
- `src/adb.ts`: process boundary for platform-tools `adb`
- `src/tools/adbTools.ts`: 38 typed ADB tools
- `src/resources.ts`: `adb://cheatsheet`
- `src/prompts.ts`: `adb_triage`
- `tests/mcp-smoke.mjs`: MCP startup and capability test

The result is still simple to run locally, but much easier to extend safely.

## Using It With an Android Virtual Device

The cleanest demo path is an Android Virtual Device.

Create an emulator in Android Studio Device Manager, or use the command line:

```bash
sdkmanager "platform-tools" "emulator" "system-images;android-35;google_apis;arm64-v8a"
avdmanager create avd \
  --name Pixel_API_35 \
  --package "system-images;android-35;google_apis;arm64-v8a" \
  --device "pixel"
```

Start it:

```bash
emulator -avd Pixel_API_35 -netdelay none -netspeed full
```

Wait for the device:

```bash
adb wait-for-device
adb devices -l
```

Then call the MCP tools:

```text
adb_devices(long=true)
adb_wait_for_device(serial="emulator-5554")
adb_diagnostics(serial="emulator-5554")
adb_screencap(serial="emulator-5554", outputPath="/tmp/avd.png")
adb_logcat(serial="emulator-5554", action="read", lines=500, format="threadtime")
```

At this point an agent can inspect the device, collect logs, capture the screen, and run Android workflows without hand-writing shell commands.

## Mirroring the Device for Tutorials

For a visual tutorial, pair adb-mcp with `scrcpy`.

Install:

```bash
brew install scrcpy
```

Mirror the emulator:

```bash
scrcpy --serial emulator-5554
```

Record a clip:

```bash
scrcpy --serial emulator-5554 --record adb-mcp-demo.mp4
```

For a polished demo:

```bash
scrcpy --serial emulator-5554 \
  --max-size=1280 \
  --max-fps=60 \
  --no-audio \
  --window-title "adb-mcp AVD demo" \
  --record adb-mcp-demo.mp4
```

Vysor is another option if you want a desktop UI with remote sharing. WebADB is useful for browser-based ADB experiments over WebUSB, mainly for compatible USB-connected physical devices.

## Why This Is Useful

The practical value is not just that an AI can run `adb`. It is that the ADB surface becomes structured.

For QA, an agent can:

- Install a build.
- Launch a specific activity.
- Grant permissions.
- Tap through a flow.
- Capture screenshots.
- Save logs.
- Generate a bugreport.

For debugging, an agent can:

- Inspect package state.
- Pull app files.
- Read system properties.
- Check battery, display, network, and storage.
- Compare logcat before and after a reproduction step.

For developer tooling, a UI can:

- Expose ADB workflows as buttons.
- Record reproducible Android sessions.
- Attach diagnostics to bug reports.
- Drive emulator-based demos.

ADB already had the power. MCP gives it a clean interface for agents and tools.

## Safety Notes

ADB is powerful enough to change real device state. Some commands can uninstall apps, erase app data, reboot devices, modify settings, change files, or run arbitrary shell commands.

That is why adb-mcp keeps dangerous operations explicit. The tool names make state-changing actions visible:

```text
adb_uninstall
adb_app_control(action="clear")
adb_file_shell(action="rm")
adb_reboot
adb_setprop
adb_settings(action="put")
adb_command(...)
```

For trusted local test devices and emulators, this is exactly what you want. For shared or production devices, treat it with the same care you would give direct shell access.

## What Comes Next

The current version is already broad and now split into testable components, but there are obvious next steps:

- Add more structured parsers for `dumpsys` output.
- Add higher-level testing recipes.
- Add a small browser dashboard for live sessions.
- Add WebSocket or WebRTC streaming around screenshots or scrcpy.
- Add example workflows for crash triage, APK install smoke tests, and permission testing.

The foundation is there: ADB as a typed MCP server, with both safe wrappers and raw access when needed.

If you build Android apps, test Android flows, or want AI agents to work with emulators and devices, this is a useful starting point.

Repository:

https://github.com/MrNewDelhi/adb-mcp

## Sources

- Android Developers: Create and manage virtual devices: https://developer.android.com/studio/run/managing-avds
- Android Developers: Start the emulator from the command line: https://developer.android.com/studio/run/emulator-commandline
- Android Developers: Android Debug Bridge: https://developer.android.com/tools/adb
- scrcpy: https://github.com/Genymobile/scrcpy
- Vysor: https://www.vysor.net/
- WebADB: https://webadb.github.io/

## Hyperframes Screenshot and Video Plan

Use these as prompts or scene notes in Hyperframes.

### Cover Image

Prompt:

```text
A crisp developer-tool hero image showing an Android emulator, a terminal running adb commands, and a clean MCP tools panel. Modern technical style, dark editor background, green Android accent, readable but generic UI text, no logos except a small Android robot silhouette.
```

Placement:

Use this as the Medium header image.

### Screenshot 1: Repository Overview

Shot:

```text
Browser view of github.com/MrNewDelhi/adb-mcp showing README title, feature list, and MCP config section.
```

Caption:

```text
adb-mcp wraps Android Debug Bridge as a typed MCP server.
```

### Screenshot 2: Emulator Running

Shot:

```text
Android Studio emulator window showing a Pixel virtual device on the home screen, with a terminal beside it running adb devices -l and showing emulator-5554.
```

Caption:

```text
The tutorial flow starts with a normal Android Virtual Device.
```

### Screenshot 3: MCP Tool Calls

Shot:

```text
MCP client or terminal-like panel showing adb_devices(long=true), adb_diagnostics(serial="emulator-5554"), and adb_screencap(serial="emulator-5554").
```

Caption:

```text
Instead of memorizing flags, agents call typed ADB tools.
```

### Screenshot 4: Logcat and Screenshot Output

Shot:

```text
Split screen: left side shows threadtime logcat output; right side shows a captured Android emulator screenshot saved as /tmp/avd.png.
```

Caption:

```text
Diagnostics, logs, and screenshots become reproducible tool outputs.
```

### Screenshot 5: scrcpy Recording

Shot:

```text
Terminal command scrcpy --serial emulator-5554 --record adb-mcp-demo.mp4 with a mirrored Android device window beside it.
```

Caption:

```text
scrcpy can mirror and record the emulator for tutorial videos.
```

### 45-Second Video Storyboard

1. Show the GitHub repo and README title.
2. Cut to Android Studio Device Manager with a Pixel AVD.
3. Start the emulator and show `adb devices -l`.
4. Show the MCP client listing or calling `adb_devices`.
5. Run `adb_diagnostics` and show summarized output.
6. Capture a screenshot with `adb_screencap`.
7. Launch scrcpy recording.
8. End on the repo URL and the phrase: `Android Debug Bridge, now agent-ready.`

### 90-Second Video Storyboard

1. Intro title: `Building an ADB MCP Server`.
2. Problem: ADB is powerful but command-heavy.
3. Show typed MCP calls replacing raw shell commands.
4. Create/start an Android Virtual Device.
5. Connect with `adb_devices`.
6. Collect diagnostics.
7. Install or launch an app.
8. Capture logs and screenshots.
9. Mirror/record with scrcpy.
10. Show safety note: destructive ADB actions remain explicit.
11. End with GitHub repo and call to try it on an emulator.
