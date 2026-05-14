import type { RunResult } from "./adb.js";

export function toolText(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

export function result(resultValue: RunResult, parse?: (stdout: string) => unknown) {
  const parsed = parse && resultValue.exitCode === 0 ? parse(resultValue.stdout) : undefined;
  return toolText({ ...resultValue, parsed });
}
