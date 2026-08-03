"use client";

import { useState } from "react";
import { CRON_PRESETS } from "@/lib/cron-presets";

/** Cron picker: a friendly preset dropdown that hides raw cron syntax unless the user opts into "custom". */
export default function CronScheduleInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const matchedPreset = CRON_PRESETS.find((p) => p.value === value);
  const [customMode, setCustomMode] = useState(!matchedPreset);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <select
        className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
        value={customMode ? "custom" : matchedPreset?.value ?? "custom"}
        onChange={(e) => {
          if (e.target.value === "custom") {
            setCustomMode(true);
          } else {
            setCustomMode(false);
            onChange(e.target.value);
          }
        }}
      >
        {CRON_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
        <option value="custom">自定义 cron 表达式...</option>
      </select>
      {customMode && (
        <input
          className="flex-1 rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm font-mono"
          placeholder="自定义 cron，例如 0 9 * * 1-5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
      )}
    </div>
  );
}
