import { randomUUID } from "node:crypto";
import { mkdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { boolArg, intentArgs, parseDevices, parsePackageList, resolveOutputPath, shellQuote, targetArgs } from "../adbHelpers.js";
import { result, toolText } from "../mcpResponses.js";
import { envSchema, intentSchema, optionalBool, serialSchema, timeoutSchema } from "../schemas.js";
import type { AdbRunner } from "../types.js";

export const ADB_TOOL_COUNT = 38;

export function registerAdbTools(server: McpServer, adb: AdbRunner) {
  const registerTool = <Args extends z.ZodRawShape>(
    name: string,
    description: string,
    inputSchema: Args,
    cb: (args: z.infer<z.ZodObject<Args>>) => unknown,
  ) => {
    server.registerTool(name, { description, inputSchema }, cb as never);
  };

  registerTool(
    "adb_command",
    "Run any raw adb command. This is the escape hatch for every ADB feature not covered by a typed tool.",
    {
      args: z.array(z.string()).describe("Arguments after the adb binary, for example ['shell', 'getprop']. Do not include 'adb'."),
      timeoutMs: timeoutSchema,
      env: envSchema,
    },
    async ({ args, timeoutMs, env }) => result(await adb(args, timeoutMs, env)),
  );
  
  registerTool("adb_version", "Show adb version and installation path.", {}, async () => result(await adb(["version"])));
  
  registerTool(
    "adb_devices",
    "List connected Android devices and emulators.",
    { long: optionalBool.describe("Include transport/model/product details with adb devices -l.") },
    async ({ long }) => result(await adb(["devices", ...(long ? ["-l"] : [])]), parseDevices),
  );
  
  registerTool(
    "adb_server",
    "Control the adb server process.",
    {
      action: z.enum(["start", "kill", "reconnect", "reconnect-device", "reconnect-offline"]),
      timeoutMs: timeoutSchema,
    },
    async ({ action, timeoutMs }) => {
      const args = action === "start" ? ["start-server"] : action === "kill" ? ["kill-server"] : [action];
      return result(await adb(args, timeoutMs));
    },
  );
  
  registerTool(
    "adb_wait_for_device",
    "Wait for a device, USB device, local emulator, or recovery/sideload state.",
    {
      serial: serialSchema,
      transport: z.enum(["any", "usb", "local"]).default("any"),
      state: z.enum(["device", "recovery", "sideload", "bootloader", "disconnect"]).default("device"),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, transport, state, timeoutMs }) => {
      const waitTarget = transport === "any" ? `wait-for-${state}` : `wait-for-${transport}-${state}`;
      return result(await adb([...targetArgs(serial), waitTarget], timeoutMs));
    },
  );
  
  registerTool(
    "adb_connect",
    "Connect to an Android device over TCP/IP, for example 192.168.1.10:5555.",
    { host: z.string().min(1), timeoutMs: timeoutSchema },
    async ({ host, timeoutMs }) => result(await adb(["connect", host], timeoutMs)),
  );
  
  registerTool(
    "adb_disconnect",
    "Disconnect one TCP/IP device or all TCP/IP devices.",
    { host: z.string().min(1).optional(), timeoutMs: timeoutSchema },
    async ({ host, timeoutMs }) => result(await adb(["disconnect", ...(host ? [host] : [])], timeoutMs)),
  );
  
  registerTool(
    "adb_transport_mode",
    "Switch a target between usb mode and tcpip mode.",
    {
      serial: serialSchema,
      mode: z.enum(["usb", "tcpip"]),
      port: z.number().int().positive().max(65535).default(5555),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, mode, port, timeoutMs }) => {
      const args = mode === "usb" ? ["usb"] : ["tcpip", String(port)];
      return result(await adb([...targetArgs(serial), ...args], timeoutMs));
    },
  );
  
  registerTool(
    "adb_shell",
    "Run an Android shell command on a device.",
    {
      serial: serialSchema,
      command: z.string().min(1),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, command, timeoutMs }) => result(await adb([...targetArgs(serial), "shell", command], timeoutMs)),
  );
  
  registerTool(
    "adb_reboot",
    "Reboot a device into Android, bootloader, recovery, sideload, sideload-auto-reboot, or fastboot.",
    {
      serial: serialSchema,
      mode: z.enum(["system", "bootloader", "recovery", "sideload", "sideload-auto-reboot", "fastboot"]).default("system"),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, mode, timeoutMs }) => {
      const args = mode === "system" ? ["reboot"] : ["reboot", mode];
      return result(await adb([...targetArgs(serial), ...args], timeoutMs));
    },
  );
  
  registerTool(
    "adb_root_remount",
    "Run root, unroot, remount, disable-verity, or enable-verity.",
    {
      serial: serialSchema,
      action: z.enum(["root", "unroot", "remount", "disable-verity", "enable-verity"]),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, action, timeoutMs }) => result(await adb([...targetArgs(serial), action], timeoutMs)),
  );
  
  registerTool(
    "adb_install",
    "Install one or more APK files with common adb install flags.",
    {
      serial: serialSchema,
      apkPaths: z.array(z.string().min(1)).min(1),
      reinstall: optionalBool.describe("Use -r."),
      downgrade: optionalBool.describe("Use -d."),
      grantPermissions: optionalBool.describe("Use -g."),
      testPackage: optionalBool.describe("Use -t."),
      installMultiple: optionalBool.describe("Use install-multiple instead of install."),
      user: z.string().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, apkPaths, reinstall, downgrade, grantPermissions, testPackage, installMultiple, user, timeoutMs }) => {
      const flags = [
        ...(reinstall ? ["-r"] : []),
        ...(downgrade ? ["-d"] : []),
        ...(grantPermissions ? ["-g"] : []),
        ...(testPackage ? ["-t"] : []),
        ...(user ? ["--user", user] : []),
      ];
      return result(await adb([...targetArgs(serial), installMultiple ? "install-multiple" : "install", ...flags, ...apkPaths], timeoutMs ?? 300_000));
    },
  );
  
  registerTool(
    "adb_uninstall",
    "Uninstall a package.",
    {
      serial: serialSchema,
      packageName: z.string().min(1),
      keepData: optionalBool.describe("Use -k to keep data/cache."),
      user: z.string().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, packageName, keepData, user, timeoutMs }) => {
      return result(await adb([...targetArgs(serial), "uninstall", ...(keepData ? ["-k"] : []), ...(user ? ["--user", user] : []), packageName], timeoutMs));
    },
  );
  
  registerTool(
    "adb_pm_packages",
    "List packages via pm list packages.",
    {
      serial: serialSchema,
      allUsers: optionalBool.describe("Use --user all when supported."),
      enabledOnly: optionalBool.describe("Use -e."),
      disabledOnly: optionalBool.describe("Use -d."),
      systemOnly: optionalBool.describe("Use -s."),
      thirdPartyOnly: optionalBool.describe("Use -3."),
      showApkPath: optionalBool.describe("Use -f."),
      includeInstaller: optionalBool.describe("Use -i."),
      filter: z.string().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, allUsers, enabledOnly, disabledOnly, systemOnly, thirdPartyOnly, showApkPath, includeInstaller, filter, timeoutMs }) => {
      const flags = [
        ...(showApkPath ? ["-f"] : []),
        ...(includeInstaller ? ["-i"] : []),
        ...(enabledOnly ? ["-e"] : []),
        ...(disabledOnly ? ["-d"] : []),
        ...(systemOnly ? ["-s"] : []),
        ...(thirdPartyOnly ? ["-3"] : []),
        ...(allUsers ? ["--user", "all"] : []),
        ...(filter ? [filter] : []),
      ];
      return result(await adb([...targetArgs(serial), "shell", "pm", "list", "packages", ...flags], timeoutMs), parsePackageList);
    },
  );
  
  registerTool(
    "adb_package_info",
    "Inspect package path, dump, permissions, or installer.",
    {
      serial: serialSchema,
      packageName: z.string().min(1),
      info: z.enum(["path", "dump", "permissions", "installer", "uid"]).default("dump"),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, packageName, info, timeoutMs }) => {
      const command =
        info === "path"
          ? ["pm", "path", packageName]
          : info === "permissions"
            ? ["dumpsys", "package", packageName, "|", "sed", "-n", "'/requested permissions:/,/install permissions:/p'"]
            : info === "installer"
              ? ["pm", "get-install-location", "&&", "cmd", "package", "get-installer", packageName]
              : info === "uid"
                ? ["cmd", "package", "list", "packages", "-U", packageName]
                : ["dumpsys", "package", packageName];
      return result(await adb([...targetArgs(serial), "shell", command.join(" ")], timeoutMs));
    },
  );
  
  registerTool(
    "adb_app_control",
    "Start, force-stop, clear, enable, disable, suspend, or unsuspend an app package.",
    {
      serial: serialSchema,
      packageName: z.string().min(1),
      action: z.enum(["launch", "force-stop", "clear", "enable", "disable", "suspend", "unsuspend"]),
      user: z.string().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, packageName, action, user, timeoutMs }) => {
      const userArgs = user ? ["--user", user] : [];
      let shellArgs: string[];
      if (action === "launch") shellArgs = ["monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"];
      else if (action === "force-stop") shellArgs = ["am", "force-stop", ...userArgs, packageName];
      else if (action === "clear") shellArgs = ["pm", "clear", ...userArgs, packageName];
      else if (action === "enable") shellArgs = ["pm", "enable", ...userArgs, packageName];
      else if (action === "disable") shellArgs = ["pm", "disable-user", ...userArgs, packageName];
      else shellArgs = ["pm", action === "suspend" ? "suspend" : "unsuspend", ...userArgs, packageName];
      return result(await adb([...targetArgs(serial), "shell", ...shellArgs], timeoutMs));
    },
  );
  
  registerTool(
    "adb_permission",
    "Grant, revoke, reset, or inspect runtime permissions for a package.",
    {
      serial: serialSchema,
      action: z.enum(["grant", "revoke", "reset", "list"]),
      packageName: z.string().min(1),
      permission: z.string().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, action, packageName, permission, timeoutMs }) => {
      if ((action === "grant" || action === "revoke") && !permission) throw new Error("permission is required for grant/revoke");
      const shellArgs =
        action === "list"
          ? ["dumpsys", "package", packageName]
          : action === "reset"
            ? ["pm", "reset-permissions", packageName]
            : ["pm", action, packageName, permission as string];
      return result(await adb([...targetArgs(serial), "shell", ...shellArgs], timeoutMs));
    },
  );
  
  registerTool(
    "adb_file_push",
    "Push a local file or directory to the device.",
    {
      serial: serialSchema,
      localPath: z.string().min(1),
      remotePath: z.string().min(1),
      sync: optionalBool.describe("Use adb sync semantics when available via push --sync."),
      compression: z.enum(["any", "none", "brotli", "lz4", "zstd"]).optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, localPath, remotePath, sync, compression, timeoutMs }) => {
      const flags = [...(sync ? ["--sync"] : []), ...(compression ? ["-z", compression] : [])];
      return result(await adb([...targetArgs(serial), "push", ...flags, localPath, remotePath], timeoutMs ?? 300_000));
    },
  );
  
  registerTool(
    "adb_file_pull",
    "Pull a file or directory from the device.",
    {
      serial: serialSchema,
      remotePath: z.string().min(1),
      localPath: z.string().min(1),
      preserveTimestamp: optionalBool.describe("Use -a."),
      compression: z.enum(["any", "none", "brotli", "lz4", "zstd"]).optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, remotePath, localPath, preserveTimestamp, compression, timeoutMs }) => {
      await mkdir(dirname(resolve(localPath)), { recursive: true });
      const flags = [...(preserveTimestamp ? ["-a"] : []), ...(compression ? ["-z", compression] : [])];
      return result(await adb([...targetArgs(serial), "pull", ...flags, remotePath, localPath], timeoutMs ?? 300_000));
    },
  );
  
  registerTool(
    "adb_file_shell",
    "Run common file operations through adb shell.",
    {
      serial: serialSchema,
      action: z.enum(["ls", "cat", "rm", "mkdir", "touch", "stat", "chmod", "chown"]),
      path: z.string().min(1),
      recursive: optionalBool,
      mode: z.string().optional(),
      owner: z.string().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, action, path, recursive, mode, owner, timeoutMs }) => {
      const quotedPath = shellQuote(path);
      const command =
        action === "ls"
          ? `ls -la ${recursive ? "-R " : ""}${quotedPath}`
          : action === "cat"
            ? `cat ${quotedPath}`
            : action === "rm"
              ? `rm ${recursive ? "-rf" : "-f"} ${quotedPath}`
              : action === "mkdir"
                ? `mkdir ${recursive ? "-p" : ""} ${quotedPath}`
                : action === "touch"
                  ? `touch ${quotedPath}`
                  : action === "stat"
                    ? `stat ${quotedPath}`
                    : action === "chmod"
                      ? `chmod ${mode ?? "644"} ${quotedPath}`
                      : `chown ${owner ?? "shell:shell"} ${quotedPath}`;
      return result(await adb([...targetArgs(serial), "shell", command], timeoutMs));
    },
  );
  
  registerTool(
    "adb_screencap",
    "Capture a device screenshot to a local PNG file.",
    {
      serial: serialSchema,
      outputPath: z.string().optional().describe("Local output path. Defaults to a temp PNG."),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, outputPath, timeoutMs }) => {
      const destination = resolveOutputPath(outputPath, ".png");
      await mkdir(dirname(destination), { recursive: true });
      const remote = `/sdcard/adb-mcp-${randomUUID()}.png`;
      const capture = await adb([...targetArgs(serial), "shell", "screencap", "-p", remote], timeoutMs);
      const pulled = capture.exitCode === 0 ? await adb([...targetArgs(serial), "pull", remote, destination], timeoutMs ?? 120_000) : undefined;
      const cleanup = await adb([...targetArgs(serial), "shell", "rm", "-f", remote], 15_000);
      const stats = pulled?.exitCode === 0 ? await stat(destination) : undefined;
      return toolText({ capture, pulled, cleanup, outputPath: destination, bytes: stats?.size });
    },
  );
  
  registerTool(
    "adb_screenrecord",
    "Record the screen to a local MP4 by recording on-device then pulling it.",
    {
      serial: serialSchema,
      outputPath: z.string().optional().describe("Local output path. Defaults to a temp MP4."),
      durationSeconds: z.number().int().positive().max(180).default(10),
      bitRate: z.number().int().positive().optional(),
      size: z.string().optional().describe("WIDTHxHEIGHT, for example 1280x720."),
      displayId: z.number().int().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, outputPath, durationSeconds, bitRate, size, displayId, timeoutMs }) => {
      const destination = resolveOutputPath(outputPath, ".mp4");
      await mkdir(dirname(destination), { recursive: true });
      const remote = `/sdcard/adb-mcp-${randomUUID()}.mp4`;
      const recordArgs = [
        "shell",
        "screenrecord",
        "--time-limit",
        String(durationSeconds),
        ...(bitRate ? ["--bit-rate", String(bitRate)] : []),
        ...(size ? ["--size", size] : []),
        ...(displayId !== undefined ? ["--display-id", String(displayId)] : []),
        remote,
      ];
      const record = await adb([...targetArgs(serial), ...recordArgs], timeoutMs ?? (durationSeconds + 15) * 1000);
      const pulled = record.exitCode === 0 ? await adb([...targetArgs(serial), "pull", remote, destination], timeoutMs ?? 120_000) : undefined;
      const cleanup = await adb([...targetArgs(serial), "shell", "rm", "-f", remote], 15_000);
      return toolText({ record, pulled, cleanup, outputPath: destination });
    },
  );
  
  registerTool(
    "adb_logcat",
    "Read, clear, dump, or save logcat.",
    {
      serial: serialSchema,
      action: z.enum(["read", "dump", "clear"]).default("read"),
      filterSpecs: z.array(z.string()).optional().describe("Logcat filter specs such as ActivityManager:I *:S."),
      format: z.enum(["brief", "process", "tag", "thread", "raw", "time", "threadtime", "long"]).optional(),
      lines: z.number().int().positive().max(10000).default(500),
      outputPath: z.string().optional().describe("Optional local output file."),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, action, filterSpecs, format, lines, outputPath, timeoutMs }) => {
      const args = [
        ...targetArgs(serial),
        "logcat",
        ...(action === "clear" ? ["-c"] : action === "dump" ? ["-d"] : ["-d", "-t", String(lines)]),
        ...(format ? ["-v", format] : []),
        ...(filterSpecs ?? []),
      ];
      const out = await adb(args, timeoutMs);
      if (outputPath && out.exitCode === 0) {
        const destination = isAbsolute(outputPath) ? outputPath : resolve(outputPath);
        await mkdir(dirname(destination), { recursive: true });
        await import("node:fs/promises").then(({ writeFile }) => writeFile(destination, out.stdout));
        return toolText({ ...out, outputPath: destination });
      }
      return result(out);
    },
  );
  
  registerTool(
    "adb_dumpsys",
    "Run dumpsys, optionally for one service.",
    {
      serial: serialSchema,
      service: z.string().optional(),
      args: z.array(z.string()).optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, service, args, timeoutMs }) => result(await adb([...targetArgs(serial), "shell", "dumpsys", ...(service ? [service] : []), ...(args ?? [])], timeoutMs)),
  );
  
  registerTool(
    "adb_getprop",
    "Get one Android system property or all properties.",
    {
      serial: serialSchema,
      property: z.string().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, property, timeoutMs }) => result(await adb([...targetArgs(serial), "shell", "getprop", ...(property ? [property] : [])], timeoutMs)),
  );
  
  registerTool(
    "adb_setprop",
    "Set an Android system property. Requires suitable privileges for protected properties.",
    {
      serial: serialSchema,
      property: z.string().min(1),
      value: z.string(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, property, value, timeoutMs }) => result(await adb([...targetArgs(serial), "shell", "setprop", property, value], timeoutMs)),
  );
  
  registerTool(
    "adb_settings",
    "Get, put, delete, or list Android settings values.",
    {
      serial: serialSchema,
      action: z.enum(["get", "put", "delete", "list"]),
      namespace: z.enum(["system", "secure", "global"]),
      key: z.string().optional(),
      value: z.string().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, action, namespace, key, value, timeoutMs }) => {
      if (action !== "list" && !key) throw new Error("key is required unless action is list");
      if (action === "put" && value === undefined) throw new Error("value is required for put");
      return result(await adb([...targetArgs(serial), "shell", "settings", action, namespace, ...(key ? [key] : []), ...(value !== undefined ? [value] : [])], timeoutMs));
    },
  );
  
  registerTool(
    "adb_input",
    "Send key, text, tap, swipe, roll, or press input events.",
    {
      serial: serialSchema,
      type: z.enum(["keyevent", "text", "tap", "swipe", "roll", "press"]),
      text: z.string().optional(),
      keycode: z.string().optional(),
      x: z.number().int().optional(),
      y: z.number().int().optional(),
      x2: z.number().int().optional(),
      y2: z.number().int().optional(),
      durationMs: z.number().int().positive().optional(),
      dx: z.number().int().optional(),
      dy: z.number().int().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, type, text, keycode, x, y, x2, y2, durationMs, dx, dy, timeoutMs }) => {
      let inputArgs: string[];
      if (type === "keyevent") inputArgs = ["keyevent", keycode ?? "KEYCODE_HOME"];
      else if (type === "text") inputArgs = ["text", (text ?? "").replaceAll(" ", "%s")];
      else if (type === "tap") inputArgs = ["tap", String(x ?? 0), String(y ?? 0)];
      else if (type === "swipe") inputArgs = ["swipe", String(x ?? 0), String(y ?? 0), String(x2 ?? x ?? 0), String(y2 ?? y ?? 0), ...(durationMs ? [String(durationMs)] : [])];
      else if (type === "roll") inputArgs = ["roll", String(dx ?? 0), String(dy ?? 0)];
      else inputArgs = ["press"];
      return result(await adb([...targetArgs(serial), "shell", "input", ...inputArgs], timeoutMs));
    },
  );
  
  registerTool("adb_intent", "Start an activity/service/foreground service or send a broadcast with intent fields and extras.", intentSchema, async (input) => {
    const { serial, intentType, wait, timeoutMs, ...rest } = input;
    const verb = intentType === "start-activity" ? "start" : intentType;
    const waitArgs = wait && verb === "start" ? ["-W"] : [];
    return result(await adb([...targetArgs(serial), "shell", "am", verb, ...waitArgs, ...intentArgs(rest)], timeoutMs));
  });
  
  registerTool(
    "adb_ports",
    "Manage adb forward and reverse socket mappings.",
    {
      serial: serialSchema,
      direction: z.enum(["forward", "reverse"]),
      action: z.enum(["list", "add", "remove", "remove-all"]),
      local: z.string().optional().describe("Endpoint such as tcp:8080, localabstract:name, jdwp:pid."),
      remote: z.string().optional().describe("Endpoint such as tcp:8080 or localabstract:name."),
      noRebind: optionalBool.describe("Use --no-rebind for add."),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, direction, action, local, remote, noRebind, timeoutMs }) => {
      const args =
        action === "list"
          ? [direction, "--list"]
          : action === "remove-all"
            ? [direction, "--remove-all"]
            : action === "remove"
              ? [direction, "--remove", local ?? ""]
              : [direction, ...(noRebind ? ["--no-rebind"] : []), local ?? "", remote ?? ""];
      return result(await adb([...targetArgs(serial), ...args], timeoutMs));
    },
  );
  
  registerTool(
    "adb_network",
    "Toggle wifi/data, inspect network state, or run ifconfig/ip commands.",
    {
      serial: serialSchema,
      action: z.enum(["wifi", "data", "airplane", "status", "ip-addr", "ip-route"]),
      enabled: z.boolean().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, action, enabled, timeoutMs }) => {
      let command: string;
      if (action === "wifi" || action === "data") command = `svc ${action} ${boolArg(enabled) ?? "enable"}`;
      else if (action === "airplane") command = `settings put global airplane_mode_on ${enabled ? 1 : 0}; am broadcast -a android.intent.action.AIRPLANE_MODE --ez state ${enabled ? "true" : "false"}`;
      else if (action === "ip-addr") command = "ip addr";
      else if (action === "ip-route") command = "ip route";
      else command = "dumpsys connectivity";
      return result(await adb([...targetArgs(serial), "shell", command], timeoutMs));
    },
  );
  
  registerTool(
    "adb_battery_power",
    "Inspect or manipulate battery/power state through dumpsys battery and cmd power.",
    {
      serial: serialSchema,
      action: z.enum(["status", "set-level", "set-status", "set-usb", "reset", "stay-on", "reboot-reason"]),
      value: z.string().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, action, value, timeoutMs }) => {
      const command =
        action === "status"
          ? "dumpsys battery"
          : action === "set-level"
            ? `dumpsys battery set level ${value ?? "100"}`
            : action === "set-status"
              ? `dumpsys battery set status ${value ?? "2"}`
              : action === "set-usb"
                ? `dumpsys battery set usb ${value ?? "1"}`
                : action === "reset"
                  ? "dumpsys battery reset"
                  : action === "stay-on"
                    ? `svc power stayon ${value ?? "true"}`
                    : "getprop sys.boot.reason";
      return result(await adb([...targetArgs(serial), "shell", command], timeoutMs));
    },
  );
  
  registerTool(
    "adb_display",
    "Inspect or set display/window manager properties.",
    {
      serial: serialSchema,
      action: z.enum(["size", "density", "overscan", "reset-size", "reset-density", "rotation", "status"]),
      value: z.string().optional().describe("For size use WIDTHxHEIGHT, density use DPI, rotation use 0-3."),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, action, value, timeoutMs }) => {
      const command =
        action === "size"
          ? `wm size ${value ?? ""}`.trim()
          : action === "density"
            ? `wm density ${value ?? ""}`.trim()
            : action === "overscan"
              ? `wm overscan ${value ?? "reset"}`
              : action === "reset-size"
                ? "wm size reset"
                : action === "reset-density"
                  ? "wm density reset"
                  : action === "rotation"
                    ? `settings put system user_rotation ${value ?? "0"}; settings put system accelerometer_rotation 0`
                    : "dumpsys display; wm size; wm density";
      return result(await adb([...targetArgs(serial), "shell", command], timeoutMs));
    },
  );
  
  registerTool(
    "adb_content",
    "Use Android content provider CLI for query, insert, update, delete, or call.",
    {
      serial: serialSchema,
      action: z.enum(["query", "insert", "update", "delete", "call"]),
      uri: z.string().min(1),
      where: z.string().optional(),
      projection: z.array(z.string()).optional(),
      bind: z.array(z.string()).optional().describe("Bind args such as name:s:value."),
      method: z.string().optional(),
      arg: z.string().optional(),
      extras: z.array(z.string()).optional().describe("Extras in content CLI format."),
      user: z.string().optional(),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, action, uri, where, projection, bind, method, arg, extras, user, timeoutMs }) => {
      const shellArgs = [
        "content",
        action,
        "--uri",
        uri,
        ...(user ? ["--user", user] : []),
        ...(where ? ["--where", where] : []),
        ...((projection ?? []).flatMap((p) => ["--projection", p])),
        ...((bind ?? []).flatMap((b) => ["--bind", b])),
        ...(method ? ["--method", method] : []),
        ...(arg ? ["--arg", arg] : []),
        ...(extras ?? []),
      ];
      return result(await adb([...targetArgs(serial), "shell", ...shellArgs], timeoutMs));
    },
  );
  
  registerTool(
    "adb_bugreport",
    "Create a bugreport ZIP or plain bugreport at a local path.",
    {
      serial: serialSchema,
      outputPath: z.string().optional().describe("Local path or directory. Defaults to a temp zip path."),
      zipped: z.boolean().default(true),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, outputPath, zipped, timeoutMs }) => {
      const destination = resolveOutputPath(outputPath, zipped ? ".zip" : ".txt");
      await mkdir(dirname(destination), { recursive: true });
      const args = zipped ? ["bugreport", destination] : ["bugreport"];
      const out = await adb([...targetArgs(serial), ...args], timeoutMs ?? 600_000);
      if (!zipped && out.exitCode === 0) {
        await import("node:fs/promises").then(({ writeFile }) => writeFile(destination, out.stdout));
      }
      return toolText({ ...out, outputPath: destination });
    },
  );
  
  registerTool(
    "adb_emulator_console",
    "Send an adb emu console command to an emulator.",
    {
      serial: serialSchema,
      args: z.array(z.string()).min(1).describe("Arguments after adb emu, for example ['avd', 'name'] or ['geo', 'fix', '77.2', '28.6']."),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, args, timeoutMs }) => result(await adb([...targetArgs(serial), "emu", ...args], timeoutMs)),
  );
  
  registerTool(
    "adb_backup_restore",
    "Run legacy adb backup or restore commands on devices that still support them.",
    {
      serial: serialSchema,
      action: z.enum(["backup", "restore"]),
      localPath: z.string().min(1),
      packages: z.array(z.string()).optional(),
      includeApks: optionalBool,
      includeObbs: optionalBool,
      includeShared: optionalBool,
      all: optionalBool,
      system: optionalBool,
      timeoutMs: timeoutSchema,
    },
    async ({ serial, action, localPath, packages, includeApks, includeObbs, includeShared, all, system, timeoutMs }) => {
      const destination = isAbsolute(localPath) ? localPath : resolve(localPath);
      await mkdir(dirname(destination), { recursive: true });
      const args =
        action === "restore"
          ? ["restore", destination]
          : [
              "backup",
              "-f",
              destination,
              includeApks ? "-apk" : "-noapk",
              includeObbs ? "-obb" : "-noobb",
              includeShared ? "-shared" : "-noshared",
              system ? "-system" : "-nosystem",
              ...(all ? ["-all"] : []),
              ...(packages ?? []),
            ];
      return result(await adb([...targetArgs(serial), ...args], timeoutMs ?? 600_000));
    },
  );
  
  registerTool(
    "adb_diagnostics",
    "Collect a compact diagnostic snapshot: devices, props, package focus, battery, display, connectivity, storage, and recent logs.",
    {
      serial: serialSchema,
      packageName: z.string().optional(),
      logLines: z.number().int().positive().max(2000).default(300),
      timeoutMs: timeoutSchema,
    },
    async ({ serial, packageName, logLines, timeoutMs }) => {
      const commands: Record<string, string[]> = {
        devices: ["devices", "-l"],
        props: [...targetArgs(serial), "shell", "getprop"],
        battery: [...targetArgs(serial), "shell", "dumpsys battery"],
        display: [...targetArgs(serial), "shell", "wm size; wm density; dumpsys display | head -120"],
        connectivity: [...targetArgs(serial), "shell", "dumpsys connectivity | head -160"],
        storage: [...targetArgs(serial), "shell", "df -h"],
        logcat: [...targetArgs(serial), "logcat", "-d", "-t", String(logLines), "-v", "threadtime"],
      };
      if (packageName) {
        commands.package = [...targetArgs(serial), "shell", "dumpsys package", packageName];
        commands.proc = [...targetArgs(serial), "shell", "pidof", packageName];
      }
      const entries = await Promise.all(Object.entries(commands).map(async ([name, args]) => [name, await adb(args, timeoutMs ?? 60_000)] as const));
      return toolText(Object.fromEntries(entries));
    },
  );
}
