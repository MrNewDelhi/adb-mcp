import { spawn } from "node:child_process";

export const DEFAULT_TIMEOUT_MS = 60_000;

export type RunResult = {
  command: string;
  args: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export async function runProcess(command: string, args: string[], timeoutMs = DEFAULT_TIMEOUT_MS, env?: Record<string, string>): Promise<RunResult> {
  return await new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2_000).unref();
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({
        command,
        args,
        exitCode: 127,
        stdout,
        stderr: stderr || error.message,
        timedOut,
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({
        command,
        args,
        exitCode: code,
        stdout,
        stderr,
        timedOut,
      });
    });
  });
}

export function createAdbRunner(adbBinary = process.env.ADB_PATH || "adb") {
  return (args: string[], timeoutMs?: number, env?: Record<string, string>) => runProcess(adbBinary, args, timeoutMs, env);
}
