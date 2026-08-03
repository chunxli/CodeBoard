const colors: Record<string, string> = {
  PENDING: "bg-neutral-700 text-neutral-200",
  RUNNING: "bg-blue-600 text-white",
  SUCCESS: "bg-emerald-600 text-white",
  FAILED: "bg-red-600 text-white",
  TIMED_OUT: "bg-amber-600 text-white",
  CANCELLED: "bg-neutral-600 text-white",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-neutral-700"}`}>
      {status}
    </span>
  );
}
