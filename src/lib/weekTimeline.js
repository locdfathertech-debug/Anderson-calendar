import { dateKey, shiftDate } from "./planner.js";

function validDate(key) {
  return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key)
    && dateKey(new Date(`${key}T12:00:00`)) === key;
}

export function weekDays(anchor) {
  if (!validDate(anchor)) throw new RangeError("Week anchor must be a valid YYYY-MM-DD date");
  const start = shiftDate(anchor, -new Date(`${anchor}T12:00:00`).getDay());
  return Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
}

export function shiftWeek(anchor, offset) {
  if (!validDate(anchor) || !Number.isInteger(offset)) throw new RangeError("Use a valid date and an integer week offset");
  return shiftDate(anchor, offset * 7);
}

function minutes(time) {
  if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}

// A connected overlap group shares a lane count; adjacent events may reuse lanes.
function assignLanes(items) {
  let group = [];
  let groupEnd = -1;
  const flush = () => {
    const laneEnds = [];
    for (const item of group) {
      let lane = laneEnds.findIndex(end => end <= item.displayStart);
      if (lane < 0) lane = laneEnds.length;
      item.lane = lane;
      laneEnds[lane] = item.displayEnd;
    }
    for (const item of group) item.laneCount = laneEnds.length;
    group = [];
  };
  for (const item of items) {
    if (group.length && item.displayStart >= groupEnd) flush();
    if (!group.length) groupEnd = item.displayEnd;
    else groupEnd = Math.max(groupEnd, item.displayEnd);
    group.push(item);
  }
  flush();
}

export function buildWeekTimeline(records, anchor) {
  const days = weekDays(anchor);
  const dayIndexByDate = new Map(days.map((day, index) => [day, index]));
  const items = [], allDay = [];
  for (const record of records) {
    const dayIndex = dayIndexByDate.get(record?.data?.date);
    if (dayIndex === undefined) continue;
    const start = minutes(record.data.time);
    if (start === null) { allDay.push({ record, dayIndex }); continue; }
    const suppliedEnd = minutes(record.data.end_time);
    const end = suppliedEnd !== null && suppliedEnd > start ? suppliedEnd : Math.min(1440, start + 60);
    // At 80px/hour, 36 minutes gives each event a 48px touch target. The
    // actual start/end stay intact for labels; the visual box stays in its day.
    const displayStart = Math.min(start, 1440 - 36);
    const displayEnd = Math.max(end, displayStart + 36);
    items.push({ record, dayIndex, start, end, displayStart, displayEnd, lane: 0, laneCount: 1 });
  }
  items.sort((a, b) => a.dayIndex - b.dayIndex || a.displayStart - b.displayStart || a.start - b.start || a.end - b.end
    || String(a.record.id).localeCompare(String(b.record.id)));
  for (let day = 0; day < 7; day++) assignLanes(items.filter(item => item.dayIndex === day));
  return {
    days,
    startMinute: Math.floor(Math.min(420, ...items.map(item => item.displayStart)) / 60) * 60,
    endMinute: Math.ceil(Math.max(1260, ...items.map(item => item.displayEnd)) / 60) * 60,
    items,
    allDay,
  };
}
