"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FolderBrowserModal from "@/components/FolderBrowserModal";

function guessSourceType(location: string): "LOCAL_PATH" | "GIT_URL" {
  const trimmed = location.trim();
  if (/^https?:\/\//i.test(trimmed) || /^git@/i.test(trimmed) || /\.git$/i.test(trimmed)) {
    return "GIT_URL";
  }
  return "LOCAL_PATH";
}

function guessName(location: string): string {
  const trimmed = location.trim().replace(/[\\/]+$/, "");
  const segment = trimmed.split(/[\\/]/).pop() ?? trimmed;
  return segment.replace(/\.git$/i, "");
}

export default function AddRepoForm() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [branchTouched, setBranchTouched] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sourceType = guessSourceType(location);

  async function detectLocation(loc: string) {
    if (!loc.trim()) return;
    setDetecting(true);
    setDetectedNote(null);
    try {
      const res = await fetch("/api/repos/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: loc }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!nameTouched && data.name) setName(data.name);
        if (!branchTouched && data.defaultBranch) setDefaultBranch(data.defaultBranch);
        if (data.sourceType === "LOCAL_PATH" && data.exists === false) {
          setDetectedNote("⚠ 该本地路径不存在，请检查");
        } else {
          setDetectedNote(
            `已识别为${data.sourceType === "GIT_URL" ? " Git 仓库" : "本地路径"} · 默认分支：${data.defaultBranch}`
          );
        }
      }
    } catch {
      // Best-effort only — user can still fill in the fields manually.
    } finally {
      setDetecting(false);
    }
  }

  async function onLocationBlur() {
    await detectLocation(location);
  }

  function onFolderSelected(path: string) {
    setLocation(path);
    setBrowserOpen(false);
    void detectLocation(path);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || guessName(location) || "Untitled repo",
          sourceType,
          location,
          defaultBranch: defaultBranch.trim() || "main",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ? JSON.stringify(body.error) : "Failed to create repo");
      }
      setLocation("");
      setName("");
      setNameTouched(false);
      setDefaultBranch("main");
      setBranchTouched(false);
      setDetectedNote(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-neutral-700 bg-neutral-800 p-4">
      <h3 className="font-semibold">Add repo</h3>
      <div className="flex gap-2">
        <input
          className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
          placeholder="本地路径或 Git 地址，例如 C:\path\to\repo 或 https://github.com/org/repo.git"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onBlur={onLocationBlur}
          required
        />
        <button
          type="button"
          onClick={() => setBrowserOpen(true)}
          className="shrink-0 rounded border border-neutral-600 px-3 py-2 text-sm hover:bg-neutral-700"
        >
          浏览...
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        {detecting
          ? "正在识别..."
          : detectedNote ?? `将识别为：${sourceType === "GIT_URL" ? "Git 仓库" : "本地路径"}`}
      </p>

      {browserOpen && (
        <FolderBrowserModal onSelect={onFolderSelected} onClose={() => setBrowserOpen(false)} />
      )}

      <details className="rounded border border-neutral-600 bg-neutral-900/40 p-3">
        <summary className="cursor-pointer select-none text-sm font-medium text-neutral-300">
          高级选项（名称 / 默认分支，一般无需修改）
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input
            className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
            placeholder="名称（留空自动生成）"
            value={name}
            onChange={(e) => {
              setNameTouched(true);
              setName(e.target.value);
            }}
          />
          <input
            className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
            placeholder="默认分支"
            value={defaultBranch}
            onChange={(e) => {
              setBranchTouched(true);
              setDefaultBranch(e.target.value);
            }}
          />
        </div>
      </details>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {submitting ? "Adding..." : "Add repo"}
      </button>
    </form>
  );
}
