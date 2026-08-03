"use client";

import { COMMON_WEBHOOK_EVENTS } from "@/lib/cron-presets";

/** Checkbox group for common GitHub webhook events, stored as a comma-separated string to match the API. */
export default function WebhookEventsInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  function toggle(event: string) {
    const next = selected.includes(event)
      ? selected.filter((e) => e !== event)
      : [...selected, event];
    onChange(next.join(","));
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm">
      {COMMON_WEBHOOK_EVENTS.map((event) => (
        <label key={event} className="flex items-center gap-1.5 text-neutral-200">
          <input type="checkbox" checked={selected.includes(event)} onChange={() => toggle(event)} />
          {event}
        </label>
      ))}
    </div>
  );
}
