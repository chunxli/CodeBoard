import { spawn } from "node:child_process";
import os from "node:os";

let keepAwakeProcess: ReturnType<typeof spawn> | null = null;

export function preventSystemSleep(): void {
  if (keepAwakeProcess) return;
  if (process.env.CODEBOARD_PREVENT_SLEEP === "false") return;

  const platform = os.platform();
  if (platform === "win32") {
    const script = [
      "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class CodeBoardPower { [DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint flags); }'",
      "[CodeBoardPower]::SetThreadExecutionState(0x80000001) | Out-Null",
      `try { Wait-Process -Id ${process.pid} } finally { [CodeBoardPower]::SetThreadExecutionState(0x80000000) | Out-Null }`,
    ].join("; ");

    keepAwakeProcess = spawn(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { stdio: "ignore", windowsHide: true }
    );
    keepAwakeProcess.on("error", handleStartError);
    keepAwakeProcess.on("exit", () => {
      keepAwakeProcess = null;
    });
    console.log("[keep-awake] Windows system sleep prevention active while this server is running.");
    return;
  }

  if (platform === "darwin") {
    keepAwakeProcess = spawn("caffeinate", ["-dims", "-w", String(process.pid)], { stdio: "ignore" });
    keepAwakeProcess.on("error", handleStartError);
    keepAwakeProcess.on("exit", () => {
      keepAwakeProcess = null;
    });
    console.log("[keep-awake] caffeinate running — the machine won't sleep while this server is up.");
    return;
  }

  console.log(`[keep-awake] not supported on ${platform}; the machine may sleep and pause scheduled runs.`);
}

function handleStartError(err: Error): void {
  console.error("[keep-awake] failed to start:", err.message);
  keepAwakeProcess = null;
}
