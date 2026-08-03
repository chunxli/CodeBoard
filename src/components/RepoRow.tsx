"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DeleteButton from "@/components/DeleteButton";

interface Repo {
  id: string;
  name: string;
  sourceType: "LOCAL_PATH" | "GIT_URL";
  location: string;
  defaultBranch: string;
  hostname: string | null;
}

export default function RepoRow({ repo, taskCount }: { repo: Repo; taskCount: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(repo.name);
  const [sourceType, setSourceType] = useState(repo.sourceType);
  const [location, setLocation] = useState(repo.location);
  const [defaultBranch, setDefaultBranch] = useState(repo.defaultBranch);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSave() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/repos/${repo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sourceType, location, defaultBranch }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ? JSON.stringify(body.error) : "Failed to save repo");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function onCancel() {
    setName(repo.name);
    setSourceType(repo.sourceType);
    setLocation(repo.location);
    setDefaultBranch(repo.defaultBranch);
    setError(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <tr className="border-t border-neutral-700 bg-neutral-800/50">
        <td className="px-4 py-2" colSpan={6}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <select
                className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as "LOCAL_PATH" | "GIT_URL")}
              >
                <option value="LOCAL_PATH">Local path</option>
                <option value="GIT_URL">Git URL</option>
              </select>
            </div>
            <input
              className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm font-mono"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <input
              className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={onSave}
                disabled={submitting}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
              <button
                onClick={onCancel}
                className="rounded border border-neutral-600 px-3 py-1.5 text-xs hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-neutral-700">
      <td className="px-4 py-2">{repo.name}</td>
      <td className="px-4 py-2 text-neutral-400">{repo.sourceType}</td>
      <td className="px-4 py-2 font-mono text-xs text-neutral-400">{repo.location}</td>
      <td className="px-4 py-2 text-neutral-400">
        {repo.defaultBranch}
        <span className="ml-2 text-xs text-neutral-500">
          · {taskCount} task{taskCount === 1 ? "" : "s"}
        </span>
      </td>
      <td className="px-4 py-2 font-mono text-xs text-neutral-400">{repo.hostname ?? "-"}</td>
      <td className="px-4 py-2 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded border border-neutral-600 px-2 py-1 text-xs hover:bg-neutral-800"
          >
            Edit
          </button>
          <DeleteButton url={`/api/repos/${repo.id}`} />
        </div>
      </td>
    </tr>
  );
}
