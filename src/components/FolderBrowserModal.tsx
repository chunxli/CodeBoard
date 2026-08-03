"use client";

import { useEffect, useState } from "react";

interface BrowseEntry {
  name: string;
  path: string;
}

interface BrowseResponse {
  current: string | null;
  parent: string | null;
  entries: BrowseEntry[];
  roots: BrowseEntry[];
  error?: string;
}

export default function FolderBrowserModal({
  onSelect,
  onClose,
}: {
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(dirPath?: string) {
    setLoading(true);
    try {
      const url = dirPath ? `/api/fs/browse?path=${encodeURIComponent(dirPath)}` : "/api/fs/browse";
      const res = await fetch(url);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = setTimeout(() => load(), 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg border border-neutral-700 bg-neutral-800 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">选择本地文件夹</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            ✕
          </button>
        </div>

        <p className="mb-2 truncate rounded border border-neutral-600 bg-neutral-900 px-2 py-1 font-mono text-xs text-neutral-300">
          {data?.current ?? "..."}
        </p>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {data?.roots.map((root) => (
            <button
              key={root.path}
              onClick={() => load(root.path)}
              className="rounded border border-neutral-600 px-2 py-1 text-xs hover:bg-neutral-700"
            >
              {root.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto rounded border border-neutral-700">
          {loading && <p className="p-3 text-sm text-neutral-500">加载中...</p>}
          {!loading && data?.error && <p className="p-3 text-sm text-red-400">{data.error}</p>}
          {!loading && data && !data.error && (
            <ul className="divide-y divide-neutral-700 text-sm">
              {data.parent && (
                <li>
                  <button
                    onClick={() => load(data.parent!)}
                    className="block w-full px-3 py-2 text-left text-neutral-300 hover:bg-neutral-700"
                  >
                    .. 上一级
                  </button>
                </li>
              )}
              {data.entries.map((entry) => (
                <li key={entry.path}>
                  <button
                    onClick={() => load(entry.path)}
                    className="block w-full px-3 py-2 text-left hover:bg-neutral-700"
                  >
                    📁 {entry.name}
                  </button>
                </li>
              ))}
              {data.entries.length === 0 && !data.parent && (
                <li className="px-3 py-2 text-neutral-500">空文件夹</li>
              )}
            </ul>
          )}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-neutral-600 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            取消
          </button>
          <button
            onClick={() => data?.current && onSelect(data.current)}
            disabled={!data?.current}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            使用此文件夹
          </button>
        </div>
      </div>
    </div>
  );
}
