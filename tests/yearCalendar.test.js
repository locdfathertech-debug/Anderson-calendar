import test from "node:test";
import assert from "node:assert/strict";
import { yearMonths, eventCountsByDay } from "../src/lib/yearCalendar.js";
import { monthDays } from "../src/lib/kiosk.js";

test("year calendar has all twelve actual months and includes leap day only in leap years", () => {
  const months = yearMonths(2028);
  assert.equal(months.length, 12);
  assert.equal(months[0], "2028-01");
  assert.equal(months.at(-1), "2028-12");
  assert.ok(monthDays(months[1]).includes("2028-02-29"));
  assert.ok(!monthDays(yearMonths(2027)[1]).includes("2027-02-29"));
  assert.throws(() => yearMonths(2028.5), RangeError);
});

test("macro count includes valid dates in chosen year only and never mutates records", () => {
  const dates = ["2027-12-31", "2028-01-01", "2028-01-01", "2028-02-29", "2028-02-30", "2028-13-01", "2028-2-01", "2029-01-01", null];
  const records = dates.map((date, id) => Object.freeze({ id, data: Object.freeze({ date, title: "Private detail" }) }));
  Object.freeze(records);
  const counts = eventCountsByDay(records, 2028);
  assert.deepEqual([...counts], [["2028-01-01", 2], ["2028-02-29", 1]]);
  assert.equal(records[0].data.date, "2027-12-31");
});

test("outside dates retain full date keys across year boundaries", () => {
  const jan = monthDays("2028-01");
  const dec = monthDays("2028-12");
  assert.equal(jan[0], "2027-12-26");
  assert.equal(dec.at(-1), "2029-01-06");
  assert.deepEqual([...eventCountsByDay([{ data: { date: "2029-01-01" } }], 2028)], []);
});
