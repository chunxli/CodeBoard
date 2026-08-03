"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Repo, Task } from "@/generated/prisma/client";
import CronScheduleInput from "@/components/CronScheduleInput";
import WebhookEventsInput from "@/components/WebhookEventsInput";

export default function EditTaskForm({ task, repos }: { task: Task; repos: Repo[] }) {
  const router = useRouter();
  const [name, setName] = useState(task.name);
  const [repoId, setRepoId] = useState(task.repoId);
  const [prompt, setPrompt] = useState(task.prompt);
  const [agent, setAgent] = useState(task.agent ?? "");
  const [model, setModel] = useState(task.model ?? "");
  const [contextTier, setContextTier] = useState<"" | "default" | "long_context">(
    (task.contextTier as "default" | "long_context" | null) ?? ""
  );
  const [reasoningEffort, setReasoningEffort] = useState<
    "" | "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"
  >(
    (task.reasoningEffort as
      | "none"
      | "minimal"
      | "low"
      | "medium"
      | "high"
      | "xhigh"
      | "max"
      | null) ?? ""
  );
  const [permissionMode, setPermissionMode] = useState<"default" | "full">(
    task.permissionMode as "default" | "full"
  );
  const [outputFormat, setOutputFormat] = useState<"text" | "json">(
    task.outputFormat === "json" ? "json" : "text"
  );
  const [triggerType, setTriggerType] = useState<"MANUAL" | "SCHEDULE" | "WEBHOOK" | "API">(
    task.triggerType as "MANUAL" | "SCHEDULE" | "WEBHOOK" | "API"
  );
  const [cronExpression, setCronExpression] = useState(task.cronExpression ?? "");
  const [webhookEvents, setWebhookEvents] = useState(task.webhookEvents ?? "");
  const [enabled, setEnabled] = useState(task.enabled);
  const [useSafeBranch, setUseSafeBranch] = useState(task.useSafeBranch);
  const [timeoutSeconds, setTimeoutSeconds] = useState(task.timeoutSeconds);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/copilot/models")
      .then((res) => (res.ok ? res.json() : { models: [] }))
      .then((data: { models?: string[] }) => setAvailableModels(data.models ?? []))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          repoId,
          prompt,
          agent: agent || null,
          model: model || null,
          contextTier: contextTier || null,
          reasoningEffort: reasoningEffort || null,
          permissionMode,
          outputFormat,
          triggerType,
          cronExpression: triggerType === "SCHEDULE" ? cronExpression : null,
          webhookEvents: triggerType === "WEBHOOK" ? webhookEvents : null,
          enabled,
          useSafeBranch,
          timeoutSeconds,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ? JSON.stringify(body.error) : "Failed to update task");
      }
      router.push(`/tasks/${task.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-neutral-700 bg-neutral-800 p-5">
      <div className="grid grid-cols-2 gap-3">
        <input
          className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
          placeholder="Task name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select
          className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
          value={repoId}
          onChange={(e) => setRepoId(e.target.value)}
        >
          {repos.map((repo) => (
            <option key={repo.id} value={repo.id}>
              {repo.name}
            </option>
          ))}
        </select>
      </div>

      <textarea
        className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
        placeholder="Prompt for Copilot CLI, e.g. 'Fix failing tests and open a summary of changes'"
        rows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        required
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

      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enabled (schedule/webhook triggers only fire while enabled)
      </label>

      <details className="rounded border border-neutral-600 bg-neutral-900/40 p-3">
        <summary className="cursor-pointer select-none text-sm font-medium text-neutral-300">
          高级选项（Agent / Model / Context / Effort / 权限 / 分支策略 / 超时）
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
              placeholder="Agent (optional)"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
            />
            <select
              className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="">Model：auto（让 Copilot 自动选择）</option>
              {model && !availableModels.includes(model) && (
                <option value={model}>Model：{model}（当前值，已不在支持列表中）</option>
              )}
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  Model：{m}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
              value={contextTier}
              onChange={(e) => setContextTier(e.target.value as typeof contextTier)}
            >
              <option value="">Context Size：默认</option>
              <option value="default">Context Size：default</option>
              <option value="long_context">Context Size：long_context</option>
            </select>
            <select
              className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
              value={reasoningEffort}
              onChange={(e) => setReasoningEffort(e.target.value as typeof reasoningEffort)}
            >
              <option value="">Think Effort：默认</option>
              <option value="none">Think Effort：none</option>
              <option value="minimal">Think Effort：minimal</option>
              <option value="low">Think Effort：low</option>
              <option value="medium">Think Effort：medium</option>
              <option value="high">Think Effort：high</option>
              <option value="xhigh">Think Effort：xhigh</option>
              <option value="max">Think Effort：max</option>
            </select>
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
        {submitting ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
