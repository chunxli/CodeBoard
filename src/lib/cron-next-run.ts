import { CronExpressionParser } from "cron-parser";

/** Returns the next fire time for a 5-field cron expression, or null if it can't be parsed. */
export function getNextRunDate(expression: string, from: Date = new Date()): Date | null {
  try {
    const interval = CronExpressionParser.parse(expression, { currentDate: from });
    return interval.next().toDate();
  } catch {
    return null;
  }
}
