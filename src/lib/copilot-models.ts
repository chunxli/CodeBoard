import { spawn } from "node:child_process";

let cachedModels: string[] | null = null;

function runCopilotHelpConfig(): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("copilot", ["help", "config"], { windowsHide: true });
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.on("error", reject);
    child.on("close", () => resolve(stdout));
  });
}

/**
 * Model IDs the installed Copilot CLI currently supports, parsed out of its own `help config`
 * output (there's no dedicated "list models" command). This keeps the list in sync with
 * whatever CLI version is actually installed instead of hardcoding one that can go stale.
 * Cached for the life of the process since it only changes when the CLI itself is updated.
 */
export async function getSupportedModels(): Promise<string[]> {
  if (cachedModels) return cachedModels;
  try {
    const output = await runCopilotHelpConfig();
    const modelSection = output.split(/`model`:/)[1]?.split(/`\w+`:/)[0] ?? "";
    const models = [...modelSection.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    cachedModels = models;
    return models;
  } catch {
    return [];
  }
}
