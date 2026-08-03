"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchResults {
  repos: { id: string; name: string }[];
  tasks: { id: string; name: string }[];
  runs: { id: string; status: string; task: { name: string } }[];
}

const EMPTY: SearchResults = { repos: [], tasks: [], runs: [] };

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = setTimeout(async () => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setResults(EMPTY);
        return;
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) setResults(await res.json());
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const hasResults = results.repos.length + results.tasks.length + results.runs.length > 0;

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative ml-auto w-64">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search repos, tasks, runs..."
        className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-1.5 text-sm"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 z-10 mt-1 w-80 rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-sm shadow-lg">
          {!hasResults && <p className="px-2 py-1 text-neutral-500">No matches.</p>}
          {results.repos.length > 0 && (
            <div className="mb-1">
              <p className="px-2 py-1 text-xs font-semibold text-neutral-500">Repos</p>
              {results.repos.map((r) => (
                <button
                  key={r.id}
                  onClick={() => goTo("/repos")}
                  className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-700"
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
          {results.tasks.length > 0 && (
            <div className="mb-1">
              <p className="px-2 py-1 text-xs font-semibold text-neutral-500">Tasks</p>
              {results.tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => goTo(`/tasks/${t.id}`)}
                  className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-700"
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
          {results.runs.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-semibold text-neutral-500">Runs</p>
              {results.runs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => goTo(`/runs/${r.id}`)}
                  className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-700"
                >
                  {r.task.name} · {r.id.slice(0, 8)} ({r.status})
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
