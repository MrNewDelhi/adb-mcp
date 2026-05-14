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

## Validate

```bash
npm run test
```

The test script runs TypeScript checking, builds the server, smoke-tests MCP startup/tool/resource/prompt registration, and validates the bundled Codex skill.

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

## Tutorial: Android Virtual Device + adb-mcp

This walkthrough takes you from a fresh Android Emulator setup to using this MCP server for device automation, screenshots, logs, and screen mirroring.

References:

- [Create and manage Android Virtual Devices](https://developer.android.com/studio/run/managing-avds)
- [Start the emulator from the command line](https://developer.android.com/studio/run/emulator-commandline)
- [Android Debug Bridge documentation](https://developer.android.com/tools/adb)
- [scrcpy official repository](https://github.com/Genymobile/scrcpy)
- [Vysor](https://www.vysor.net/)
- [WebADB](https://webadb.github.io/)

### 1. Install Android tooling

Install Android Studio or the standalone Android SDK command-line tools. Make sure these commands work:

```bash
adb version
emulator -version
sdkmanager --version
```

If they are missing, add the SDK tools to your shell profile:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

On macOS, Android Studio normally installs the SDK under `~/Library/Android/sdk`.

### 2. Create an Android Virtual Device

The easiest path is Android Studio:

1. Open Android Studio.
2. Open **Device Manager**.
3. Create a virtual device, for example a Pixel device.
4. Choose a recent Google APIs or Google Play system image.
5. Finish and note the AVD name.

Command-line alternative:

```bash
sdkmanager "platform-tools" "emulator" "system-images;android-35;google_apis;arm64-v8a"
avdmanager create avd \
  --name Pixel_API_35 \
  --package "system-images;android-35;google_apis;arm64-v8a" \
  --device "pixel"
```

Use `x86_64` instead of `arm64-v8a` when that matches your host and installed image.

### 3. Start the emulator

```bash
emulator -avd Pixel_API_35 -netdelay none -netspeed full
```

Wait for Android to boot:

```bash
adb wait-for-device
adb devices -l
```

You should see a serial like `emulator-5554`.

### 4. Run adb-mcp

From this repo:

```bash
npm install
npm run build
npm start
```

Configure your MCP client with:

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

First useful MCP calls:

```text
adb_devices(long=true)
adb_wait_for_device(serial="emulator-5554")
adb_diagnostics(serial="emulator-5554")
adb_screencap(serial="emulator-5554", outputPath="/tmp/avd.png")
adb_logcat(serial="emulator-5554", action="read", lines=500, format="threadtime")
```

### 5. Install and launch an app

```text
adb_install(serial="emulator-5554", apkPaths=["/absolute/path/app.apk"], reinstall=true, grantPermissions=true)
adb_pm_packages(serial="emulator-5554", thirdPartyOnly=true)
adb_app_control(serial="emulator-5554", packageName="com.example.app", action="launch")
```

For deep links or test entry points:

```text
adb_intent(
  serial="emulator-5554",
  intentType="start",
  action="android.intent.action.VIEW",
  data="example://demo",
  packageName="com.example.app",
  wait=true
)
```

### 6. Mirror or record the virtual device

#### Option A: scrcpy

scrcpy is the best open-source default for local mirroring. It mirrors and controls Android over USB or TCP/IP, does not require root, and does not install an app on the device.

Install on macOS:

```bash
brew install scrcpy
```

Mirror the emulator:

```bash
scrcpy --serial emulator-5554
```

Record a tutorial clip while mirroring:

```bash
scrcpy --serial emulator-5554 --record adb-mcp-demo.mp4
```

Useful tutorial-friendly settings:

```bash
scrcpy --serial emulator-5554 --max-size=1280 --max-fps=60 --no-audio --window-title "adb-mcp AVD demo"
```

For wireless physical-device use, connect the device with ADB first:

```bash
adb tcpip 5555
adb connect DEVICE_IP:5555
scrcpy --serial DEVICE_IP:5555
```

#### Option B: Vysor

Use Vysor when you want a polished desktop UI or remote sharing. Start the emulator or connect a physical device, verify it appears in `adb devices`, then open Vysor and select the device. Vysor can mirror and control Android and supports remote access features.

#### Option C: Browser-based access

Use [WebADB](https://webadb.github.io/) when you want browser-based ADB over WebUSB for compatible browsers and USB-connected physical devices. Browser WebUSB is not a replacement for the Android Emulator window, but it is useful for quick ADB operations from a web page.

For a website that shows the live device screen, the practical choices are:

- Use Vysor remote sharing.
- Use scrcpy to record a video file and embed that recording.
- Build a custom bridge that captures frames with `adb_screencap` or scrcpy and serves them over WebSocket/WebRTC.

### 7. Tutorial video outline

Use this as the script for a screen recording or Hyperframes-style generated tutorial:

1. Show Android Studio Device Manager and create `Pixel_API_35`.
2. Start the emulator with `emulator -avd Pixel_API_35`.
3. Run `adb devices -l` and show `emulator-5554`.
4. Start `adb-mcp` with `npm start`.
5. In the MCP client, call `adb_devices(long=true)`.
6. Call `adb_diagnostics(serial="emulator-5554")`.
7. Call `adb_screencap(serial="emulator-5554", outputPath="/tmp/avd.png")`.
8. Launch mirroring with `scrcpy --serial emulator-5554 --record adb-mcp-demo.mp4`.
9. Install or launch an example app with `adb_install` and `adb_app_control`.
10. End by showing `adb_logcat` and the saved tutorial recording.

Note: the `hyperframes` plugin is not required by this repo. If your Codex environment has that plugin installed, use the outline above as the source storyboard and the scrcpy recording as live footage.

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

The `skills/adb-mcp` folder contains a Codex-compatible skill that tells agents how to use and extend this MCP server. It follows progressive disclosure:

- `SKILL.md`: short operational workflow and validation commands
- `references/mcp-server-design.md`: MCP tools/resources/prompts/transports and implementation best practices
- `references/mcp-security-testing.md`: security model, high-risk surfaces, and test matrix
- `references/adb-tool-taxonomy.md`: Android/ADB workflow selection guide

## MCP Implementation Notes

`adb-mcp` currently uses stdio transport, which is the safest default for local MCP clients that spawn the server as a child process. The server exposes:

- **Tools** for ADB actions
- **A resource** at `adb://cheatsheet`
- **A prompt** named `adb_triage`
- **Server instructions** that clients may include in model context

If adding an HTTP transport later, add authentication, host header validation, CORS review, and DNS rebinding protection before exposing it.
