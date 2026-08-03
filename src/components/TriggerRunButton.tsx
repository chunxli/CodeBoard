"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TriggerRunButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onClick() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/run`, { method: "POST" });
      const body = await res.json();
      if (res.ok && body.runId) {
        router.push(`/runs/${body.runId}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={submitting}
      className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
    >
      {submitting ? "Starting..." : "Run now"}
    </button>
  );
}
