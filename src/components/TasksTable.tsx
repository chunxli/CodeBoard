"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import NextRunCountdown from "@/components/NextRunCountdown";

interface TaskRow {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: string;
  cronExpression: string | null;
  nextRunAt: string | null;
  repo: { name: string; hostname: string | null };
  runs: { status: string }[];
}

const TRIGGER_TYPES = ["MANUAL", "SCHEDULE", "WEBHOOK", "API"];

export default function TasksTable({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (triggerFilter && task.triggerType !== triggerFilter) return false;
      if (!q) return true;
      return task.name.toLowerCase().includes(q) || task.repo.name.toLowerCase().includes(q);
    });
  }, [tasks, query, triggerFilter]);

  async function toggleEnabled(task: TaskRow) {
    setTogglingId(task.id);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !task.enabled }),
      });
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by task or repo name..."
          className="min-w-64 flex-1 rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
        />
        <select
          value={triggerFilter}
          onChange={(e) => setTriggerFilter(e.target.value)}
          className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
        >
          <option value="">All triggers</option>
          {TRIGGER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-hidden rounded-lg border border-neutral-700">
        <table className="w-full text-sm">
          <thead className="bg-neutral-800 text-left text-neutral-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Repo</th>
              <th className="px-4 py-2">Machine</th>
              <th className="px-4 py-2">Trigger</th>
              <th className="px-4 py-2">Enabled</th>
              <th className="px-4 py-2">Next run</th>
              <th className="px-4 py-2">Last run</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => (
              <tr key={task.id} className="border-t border-neutral-700 hover:bg-neutral-800/50">
                <td className="px-4 py-2">
                  <Link href={`/tasks/${task.id}`} className="text-blue-400 hover:underline">
                    {task.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-400">{task.repo.name}</td>
                <td className="px-4 py-2 font-mono text-xs text-neutral-400">{task.repo.hostname ?? "-"}</td>
                <td className="px-4 py-2 text-neutral-400">
                  {task.triggerType}
                  {task.triggerType === "SCHEDULE" && task.cronExpression && (
                    <span className="ml-1 font-mono text-xs">({task.cronExpression})</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleEnabled(task)}
                    disabled={togglingId === task.id}
                    className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                      task.enabled
                        ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                        : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                    }`}
                  >
                    {task.enabled ? "Yes" : "No"}
                  </button>
                </td>
                <td className="px-4 py-2">
                  <NextRunCountdown nextRun={task.nextRunAt} />
                </td>
                <td className="px-4 py-2">
                  {task.runs[0] ? <StatusBadge status={task.runs[0].status} /> : "-"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                  No tasks match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
