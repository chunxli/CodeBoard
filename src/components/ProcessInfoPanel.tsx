"use client";

import { useEffect, useState } from "react";

interface ProcessInfo {
  pid: number | null;
  command: string | null;
  cpuTimeMs: number | null;
  memoryMb: number | null;
}

function formatCpuTime(ms: number | null): string {
  if (ms == null) return "-";
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

/** Process info panel: static for finished runs, polls the process endpoint every 3s while live. */
export default function ProcessInfoPanel({
  runId,
  initial,
  isLive,
}: {
  runId: string;
  initial: ProcessInfo;
  isLive: boolean;
}) {
  const [info, setInfo] = useState<ProcessInfo>(initial);

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/runs/${runId}/process`);
      if (res.ok) setInfo(await res.json());
    }, 3000);
    return () => clearInterval(id);
  }, [runId, isLive]);

  if (!info.pid && !info.command) return null;

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
      <h2 className="mb-3 text-lg font-semibold">Process info</h2>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="text-neutral-500">PID</div>
          <div className="font-mono">{info.pid ?? "-"}</div>
        </div>
        <div>
          <div className="text-neutral-500">进程名称</div>
          <div className="font-mono">copilot</div>
        </div>
        <div>
          <div className="text-neutral-500">CPU 时间</div>
          <div>{formatCpuTime(info.cpuTimeMs)}</div>
        </div>
        <div>
          <div className="text-neutral-500">内存占用</div>
          <div>{info.memoryMb != null ? `${info.memoryMb.toFixed(1)} MB` : "-"}</div>
        </div>
      </div>
      {info.command && (
        <div className="mt-3">
          <div className="text-neutral-500 text-sm">命令</div>
          <div className="truncate font-mono text-xs text-neutral-300" title={info.command}>
            {info.command}
          </div>
        </div>
      )}
    </div>
  );
}
