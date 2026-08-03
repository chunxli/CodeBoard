import { spawn } from "node:child_process";
import os from "node:os";

let caffeinate: ReturnType<typeof spawn> | null = null;

/**
 * Best-effort: prevents the machine from sleeping/hibernating while this server process is
 * alive, since a sleeping machine suspends the node-cron scheduler (see README "Scheduling
 * notes"). Currently only implemented for macOS (via the built-in `caffeinate` CLI); a no-op
 * elsewhere. Opt out with `CODEBOARD_PREVENT_SLEEP=false`.
 */
export function preventSystemSleep(): void {
  if (caffeinate) return;
  if (process.env.CODEBOARD_PREVENT_SLEEP === "false") return;

  if (os.platform() !== "darwin") {
    console.log(`[keep-awake] not supported on ${os.platform()}; the machine may sleep and pause scheduled runs.`);
    return;
  }

  try {
    // -d/-i/-m/-s: prevent display/idle/disk/system sleep. -w <pid>: caffeinate exits on its
    // own once that pid exits, so it's automatically tied to this server's lifetime.
    caffeinate = spawn("caffeinate", ["-dims", "-w", String(process.pid)], { stdio: "ignore" });
    caffeinate.on("error", (err) => {
      console.error("[keep-awake] failed to start caffeinate:", err.message);
      caffeinate = null;
    });
    console.log("[keep-awake] caffeinate running — the machine won't sleep while this server is up.");
  } catch (err) {
    console.error("[keep-awake] failed to start caffeinate:", err);
  }
}
