import { dateKey, shiftDate } from "./planner.js";

function validDay(day) {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)
    && dateKey(new Date(`${day}T12:00:00`)) === day;
}
function eventOrder(a,b) {
  return (a.data.time || "").localeCompare(b.data.time || "")
    || String(a.data.title || "").localeCompare(String(b.data.title || ""))
    || String(a.id).localeCompare(String(b.id));
}

/** Return a bounded date-scoped agenda, with all-day records before timed records.
 * Input records must already be household-authorized and member/search-filtered. */
export function buildAgenda(records, anchor, mode = "day") {
  if (!validDay(anchor)) throw new RangeError("Agenda requires a real YYYY-MM-DD day");
  if (mode !== "day" && mode !== "agenda") throw new RangeError("Agenda mode must be day or agenda");
  const dates = Array.from({ length: mode === "day" ? 1 : 14 }, (_, i) => shiftDate(anchor, i));
  const byDay = new Map(dates.map(day => [day, []]));
  for (const record of records) {
    if (record?.kind !== "event" || !byDay.has(record.data?.date)) continue;
    byDay.get(record.data.date).push(record);
  }
  return dates.map(day => ({ date:day, items:byDay.get(day).sort(eventOrder) }));
}
