import { randomUUID } from "node:crypto";
import { isAbsolute, join, resolve } from "node:path";
import { tmpdir } from "node:os";

export function targetArgs(serial?: string): string[] {
  return serial ? ["-s", serial] : [];
}

export function nonEmptyLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseDevices(stdout: string) {
  return nonEmptyLines(stdout)
    .filter((line) => !line.startsWith("List of devices attached"))
    .map((line) => {
      const [serial, state, ...rest] = line.split(/\s+/);
      const details = Object.fromEntries(
        rest
          .map((part) => part.split(":"))
          .filter((parts): parts is [string, string] => parts.length === 2),
      );
      return { serial, state, details };
    });
}

export function parsePackageList(stdout: string) {
  return nonEmptyLines(stdout).map((line) => line.replace(/^package:/, ""));
}

export function boolArg(enabled?: boolean): "enable" | "disable" | undefined {
  if (enabled === undefined) return undefined;
  return enabled ? "enable" : "disable";
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function resolveOutputPath(path: string | undefined, extension: string): string {
  if (path) return isAbsolute(path) ? path : resolve(path);
  return join(tmpdir(), `adb-mcp-${randomUUID()}${extension}`);
}

export function intentArgs(input: {
  action?: string;
  data?: string;
  mimeType?: string;
  component?: string;
  packageName?: string;
  categories?: string[];
  flags?: string[];
  extras?: Record<string, string | number | boolean>;
  user?: string;
}) {
  const args: string[] = [];
  if (input.user) args.push("--user", input.user);
  if (input.action) args.push("-a", input.action);
  if (input.data) args.push("-d", input.data);
  if (input.mimeType) args.push("-t", input.mimeType);
  if (input.component) args.push("-n", input.component);
  if (input.packageName) args.push("-p", input.packageName);
  for (const category of input.categories ?? []) args.push("-c", category);
  for (const flag of input.flags ?? []) args.push("-f", flag);
  for (const [key, value] of Object.entries(input.extras ?? {})) {
    if (typeof value === "boolean") args.push("--ez", key, String(value));
    else if (typeof value === "number" && Number.isInteger(value)) args.push("--ei", key, String(value));
    else if (typeof value === "number") args.push("--ef", key, String(value));
    else args.push("--es", key, value);
  }
  return args;
}
