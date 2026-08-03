"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Repo } from "@/generated/prisma/client";
import CronScheduleInput from "@/components/CronScheduleInput";
import WebhookEventsInput from "@/components/WebhookEventsInput";

function deriveNameFromPrompt(prompt: string): string {
  const clean = prompt.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean;
}

export default function CreateTaskForm({ repos }: { repos: Repo[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [repoId, setRepoId] = useState(repos[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState("");
  const [model, setModel] = useState("");
  const [permissionMode, setPermissionMode] = useState<"default" | "full">("default");
  const [outputFormat, setOutputFormat] = useState<"text" | "json">("text");
  const [triggerType, setTriggerType] = useState<"MANUAL" | "SCHEDULE" | "WEBHOOK" | "API">("MANUAL");
  const [cronExpression, setCronExpression] = useState("0 * * * *");
  const [webhookEvents, setWebhookEvents] = useState("");
  const [useSafeBranch, setUseSafeBranch] = useState(true);
  const [timeoutSeconds, setTimeoutSeconds] = useState(1800);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onPromptChange(next: string) {
    setPrompt(next);
    if (!nameTouched) setName(deriveNameFromPrompt(next));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || deriveNameFromPrompt(prompt) || "Untitled task",
          repoId,
          prompt,
          agent: agent || null,
          model: model || null,
          permissionMode,
          outputFormat,
          triggerType,
          cronExpression: triggerType === "SCHEDULE" ? cronExpression : null,
          webhookEvents: triggerType === "WEBHOOK" ? webhookEvents : null,
          useSafeBranch,
          timeoutSeconds,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ? JSON.stringify(body.error) : "Failed to create task");
      }
      const task = await res.json();
      router.push(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (repos.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        You need to add a repo first before creating a task.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-neutral-700 bg-neutral-800 p-5">
      <select
        className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
        value={repoId}
        onChange={(e) => setRepoId(e.target.value)}
      >
        {repos.map((repo) => (
          <option key={repo.id} value={repo.id}>
            {repo.name}
          </option>
        ))}
      </select>

      <textarea
        className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
        placeholder="告诉 Copilot 做什么，例如 '修复失败的测试并总结改动'"
        rows={4}
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        required
      />

      <input
        className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
        placeholder="任务名称（留空自动根据 prompt 生成）"
        value={name}
        onChange={(e) => {
          setNameTouched(true);
          setName(e.target.value);
        }}
      />

      <div className="space-y-2">
        <select
          className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm sm:w-auto"
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value as typeof triggerType)}
        >
          <option value="MANUAL">手动触发</option>
          <option value="SCHEDULE">定时任务</option>
          <option value="WEBHOOK">GitHub webhook</option>
          <option value="API">外部 API</option>
        </select>
        {triggerType === "SCHEDULE" && (
          <CronScheduleInput value={cronExpression} onChange={setCronExpression} />
        )}
        {triggerType === "WEBHOOK" && (
          <WebhookEventsInput value={webhookEvents} onChange={setWebhookEvents} />
        )}
      </div>

      <details className="rounded border border-neutral-600 bg-neutral-900/40 p-3">
        <summary className="cursor-pointer select-none text-sm font-medium text-neutral-300">
          高级选项（Agent / Model / 权限 / 分支策略 / 超时）
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
              placeholder="Agent (optional)"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
            />
            <input
              className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
              placeholder="Model (optional)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
          <select
            className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
            value={permissionMode}
            onChange={(e) => setPermissionMode(e.target.value as "default" | "full")}
          >
            <option value="default">权限：仅工具调用（--allow-all-tools）</option>
            <option value="full">权限：完全放开（--allow-all，风险更高）</option>
          </select>
          <select
            className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as "text" | "json")}
          >
            <option value="text">输出格式：text（可读文本，推荐）</option>
            <option value="json">输出格式：json（原始事件流，适合高级调试）</option>
          </select>
          <input
            type="number"
            className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
            placeholder="超时（秒）"
            value={timeoutSeconds}
            onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
            min={30}
          />
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={useSafeBranch}
              onChange={(e) => setUseSafeBranch(e.target.checked)}
            />
            每次运行创建新分支，而不是直接改动默认分支
          </label>
        </div>
      </details>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create task"}
      </button>
    </form>
  );
}
