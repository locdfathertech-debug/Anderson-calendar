import test from "node:test";
import assert from "node:assert/strict";
import { buildWeekTimeline, shiftWeek, weekDays } from "../src/lib/weekTimeline.js";

const event = (id, date, time, end_time) => ({ id, data: { date, time, end_time } });

test("weeks use Sunday through Saturday across years, leap days and local DST", () => {
  assert.deepEqual(weekDays("2027-01-01"), ["2026-12-27", "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  assert.ok(weekDays("2028-02-29").includes("2028-02-29"));
  const previousTimezone = process.env.TZ;
  try {
    process.env.TZ = "America/Chicago";
    assert.deepEqual(weekDays("2026-03-08"), ["2026-03-08", "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14"]);
    assert.equal(shiftWeek("2026-03-07", 1), "2026-03-14");
    assert.equal(shiftWeek("2026-11-07", -1), "2026-10-31");
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
  assert.throws(() => weekDays("2026-02-30"), RangeError);
  assert.throws(() => shiftWeek("2026-11-08", 0.5), RangeError);
});

test("timeline uses exact dates and minutes, preserves source records and retains untimed entries", () => {
  const records = [event("half-hour", "2026-11-09", "07:30", "08:15"), event("all-day", "2026-11-10"), event("invalid-time", "2026-11-11", "25:00"), event("other-week", "2026-12-09", "07:30")];
  const result = buildWeekTimeline(records, "2026-11-09");
  assert.deepEqual(result.items.map(({ record, dayIndex, start, end }) => [record.id, dayIndex, start, end]), [["half-hour", 1, 450, 495]]);
  assert.deepEqual(result.allDay.map(({ record }) => record.id), ["all-day", "invalid-time"]);
  assert.equal(result.startMinute, 420);
  assert.equal(result.endMinute, 1260);
  assert.equal(result.items[0].record, records[0]);
  assert.equal(records[0].lane, undefined);
});

test("overlap groups use side-by-side lanes and release them at adjacent boundaries", () => {
  const result = buildWeekTimeline([
    event("a", "2026-11-08", "08:00", "09:00"),
    event("b", "2026-11-08", "08:30", "09:30"),
    event("c", "2026-11-08", "09:00", "10:00"),
    event("d", "2026-11-08", "10:00", "11:00"),
    event("another-day", "2026-11-09", "08:00", "09:00"),
  ], "2026-11-08");
  assert.deepEqual(result.items.map(item => [item.record.id, item.lane, item.laneCount]), [["a", 0, 2], ["b", 1, 2], ["c", 0, 2], ["d", 0, 1], ["another-day", 0, 1]]);
  for (const a of result.items) for (const b of result.items) {
    if (a === b || a.dayIndex !== b.dayIndex || a.end <= b.start || b.end <= a.start) continue;
    assert.notEqual(a.lane, b.lane);
  }
});

test("early and late plans expand the visible range without spilling past midnight", () => {
  const result = buildWeekTimeline([event("early", "2026-11-08", "05:15"), event("late", "2026-11-08", "23:45"), event("bad-end", "2026-11-09", "12:00", "11:00")], "2026-11-08");
  assert.equal(result.startMinute, 300);
  assert.equal(result.endMinute, 1440);
  assert.equal(result.items.find(item => item.record.id === "late").end, 1440);
  assert.equal(result.items.find(item => item.record.id === "bad-end").end, 780);
  const empty = buildWeekTimeline([], "2026-11-08");
  assert.equal(empty.startMinute, 420);
  assert.equal(empty.endMinute, 1260);
});

test("short or late visual touch targets receive lanes without changing actual event times", () => {
  const result = buildWeekTimeline([
    event("short-a", "2026-11-08", "08:00", "08:05"),
    event("short-b", "2026-11-08", "08:15", "08:20"),
    event("late-a", "2026-11-08", "23:45", "23:50"),
    event("late-b", "2026-11-08", "23:59"),
  ], "2026-11-08");
  const [a,b,c,d] = result.items;
  assert.deepEqual([a.start,a.end,a.displayStart,a.displayEnd], [480,485,480,516]);
  assert.deepEqual([a.laneCount,b.laneCount], [2,2]);
  assert.notEqual(a.lane,b.lane);
  assert.deepEqual([c.start,c.end,c.displayStart,c.displayEnd], [1425,1430,1404,1440]);
  assert.deepEqual([d.start,d.end,d.displayStart,d.displayEnd], [1439,1440,1404,1440]);
  assert.notEqual(c.lane,d.lane);
  assert.ok(result.items.every(item => item.displayEnd-item.displayStart >= 36 && item.displayEnd<=1440));
});
