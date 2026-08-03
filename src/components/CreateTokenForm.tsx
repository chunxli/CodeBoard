"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateTokenForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setToken(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ? JSON.stringify(body.error) : "Failed");
      setToken(body.token);
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-neutral-700 bg-neutral-800 p-4">
      <div className="flex gap-3">
        <input
          className="flex-1 rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
          placeholder="Token name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create token"}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {token && (
        <div className="rounded border border-emerald-800 bg-emerald-950/50 p-3 text-xs">
          <p className="mb-1 text-emerald-300">
            Save this token now — it won&apos;t be shown again. Use it as{" "}
            <code>Authorization: Bearer &lt;token&gt;</code> against{" "}
            <code>POST /api/external/trigger</code>.
          </p>
          <code className="break-all text-neutral-200">{token}</code>
        </div>
      )}
    </form>
  );
}
