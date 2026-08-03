"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = ["PENDING", "RUNNING", "SUCCESS", "FAILED", "TIMED_OUT", "CANCELLED"];

export default function RunStatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("status", next);
    } else {
      params.delete("status");
    }
    params.delete("page");
    router.push(`/runs?${params.toString()}`);
  }

  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
    >
      <option value="">All statuses</option>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
