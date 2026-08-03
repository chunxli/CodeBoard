"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "即将触发";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days} 天 ${hours} 小时后`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟后`;
  if (minutes > 0) return `${minutes} 分 ${seconds} 秒后`;
  return `${seconds} 秒后`;
}

/** Live-ticking "time until next scheduled run" display, computed from a server-provided next-run timestamp. */
export default function NextRunCountdown({ nextRun }: { nextRun: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  // toLocaleString() renders differently on the server (Node's default locale) vs the browser's
  // locale, so the title attribute is left unset until after mount to avoid a hydration mismatch.
  const [title, setTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!nextRun) return;
    setTitle(new Date(nextRun).toLocaleString());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [nextRun]);

  if (!nextRun) return <span className="text-neutral-500">-</span>;

  const target = new Date(nextRun).getTime();

  return (
    <span className="text-neutral-300" title={title}>
      {formatRemaining(target - now)}
    </span>
  );
}
