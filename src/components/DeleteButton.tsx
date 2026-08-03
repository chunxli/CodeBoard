"use client";

import { useRouter } from "next/navigation";

export default function DeleteButton({ url, label = "Delete" }: { url: string; label?: string }) {
  const router = useRouter();

  async function onClick() {
    if (!confirm("Are you sure?")) return;
    await fetch(url, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      className="rounded border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-950"
    >
      {label}
    </button>
  );
}
