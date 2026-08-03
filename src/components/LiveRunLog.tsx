"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { summarizeCopilotJsonLine } from "@/lib/parse-copilot-json-line";

interface CopilotRunEvent {
  type: "line" | "exit" | "error";
  data?: string;
  code?: number | null;
  timedOut?: boolean;
  cancelled?: boolean;
  message?: string;
}

export default function LiveRunLog({
  runId,
  initialLog,
  isLive,
  outputFormat = "text",
}: {
  runId: string;
  initialLog: string;
  isLive: boolean;
  outputFormat?: "text" | "json";
}) {
  const [lines, setLines] = useState<string[]>(initialLog ? initialLog.split("\n").filter(Boolean) : []);
  const [finished, setFinished] = useState(!isLive);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isLive) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }

    let source: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    function connect() {
      source = new EventSource(`/api/runs/${runId}/stream`);

      source.onmessage = (e) => {
        const event: CopilotRunEvent = JSON.parse(e.data);
        if (event.type === "line" && event.data) {
          setLines((prev) => [...prev, event.data!]);
        } else if (event.type === "exit" || event.type === "error") {
          stopped = true;
          setFinished(true);
          source.close();
          router.refresh();

          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            const title =
              event.type === "error"
                ? "CodeBoard run failed to start"
                : event.cancelled
                  ? "CodeBoard run cancelled"
                  : event.timedOut
                    ? "CodeBoard run timed out"
                    : event.code === 0
                      ? "CodeBoard run succeeded"
                      : "CodeBoard run failed";
            new Notification(title, { body: `Run ${runId.slice(0, 8)}` });
          }
        }
      };

      // A dropped connection (network blip, laptop sleep, etc.) isn't the same as the run
      // finishing — reconnect instead of leaving the UI stuck on "Live" forever.
      source.onerror = () => {
        source.close();
        if (!stopped) reconnectTimer = setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      source.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, isLive]);


  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight });
  }, [lines]);

  const displayLines =
    outputFormat === "json"
      ? lines.map((line) => summarizeCopilotJsonLine(line)).filter((line): line is string => line !== null)
      : lines;

  return (
    <div>
      {!finished && <p className="mb-2 text-xs text-emerald-400">● Live</p>}
      <div
        ref={containerRef}
        className="max-h-[500px] overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-950 p-4 font-mono text-xs text-neutral-200"
      >
        {displayLines.length === 0 && <p className="text-neutral-500">Waiting for output...</p>}
        {displayLines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
