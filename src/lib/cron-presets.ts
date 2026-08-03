export const CRON_PRESETS: { label: string; value: string }[] = [
  { label: "每 15 分钟", value: "*/15 * * * *" },
  { label: "每 30 分钟", value: "*/30 * * * *" },
  { label: "每小时", value: "0 * * * *" },
  { label: "每 3 小时", value: "0 */3 * * *" },
  { label: "每 6 小时", value: "0 */6 * * *" },
  { label: "每天 09:00", value: "0 9 * * *" },
  { label: "每天午夜", value: "0 0 * * *" },
  { label: "每周一 09:00", value: "0 9 * * 1" },
  { label: "工作日 09:00", value: "0 9 * * 1-5" },
];

/** Common GitHub webhook event types users are likely to want, for a checkbox UI instead of free text. */
export const COMMON_WEBHOOK_EVENTS = ["push", "pull_request", "issues", "issue_comment", "release"];
