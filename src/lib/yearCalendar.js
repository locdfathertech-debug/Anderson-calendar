import { dateKey } from "./planner.js";

export function yearMonths(year) {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new RangeError("Calendar year must be a four-digit integer");
  }
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
}

// Count once, without mutating or exposing event titles in the macro view.
export function eventCountsByDay(events, year) {
  const prefix = `${year}-`;
  const counts = new Map();
  for (const record of events) {
    const key = record?.data?.date;
    if (typeof key !== "string" || !key.startsWith(prefix)
      || !/^\d{4}-\d{2}-\d{2}$/.test(key)
      || dateKey(new Date(`${key}T12:00:00`)) !== key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}
