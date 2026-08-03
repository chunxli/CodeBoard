"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelRunButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onClick() {
    if (!confirm("Cancel this run?")) return;
    setSubmitting(true);
    try {
      await fetch(`/api/runs/${runId}/cancel`, { method: "POST" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={submitting}
      className="rounded border border-amber-700 px-2 py-1 text-xs text-amber-400 hover:bg-amber-950 disabled:opacity-50"
    >
      {submitting ? "Cancelling..." : "Cancel run"}
    </button>
  );
}
