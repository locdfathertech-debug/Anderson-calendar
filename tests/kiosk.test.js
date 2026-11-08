import test from "node:test";
import assert from "node:assert/strict";
import { monthDays, shiftMonth, upcomingEvents, kioskMemberStyle, isBounty } from "../src/lib/kiosk.js";

test("monthly grid uses real dates and complete weeks, including leap years", () => {
  assert.equal(monthDays("2026-02").length, 28);
  const leap = monthDays("2028-02");
  assert.equal(leap.length, 35);
  assert.ok(leap.includes("2028-02-29"));
  const sixWeeks = monthDays("2026-08");
  assert.equal(sixWeeks.length, 42);
  assert.equal(sixWeeks[0], "2026-07-26");
  assert.equal(sixWeeks.at(-1), "2026-09-05");
  for (const month of ["2026-02", "2028-02", "2026-08", "2027-01"]) {
    const days = monthDays(month);
    assert.equal(new Date(`${days[0]}T12:00:00`).getDay(), 0);
    assert.equal(new Date(`${days.at(-1)}T12:00:00`).getDay(), 6);
    assert.equal(new Set(days).size, days.length);
  }
});

test("month navigation crosses years without overflowing the selected day", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2027-01", -1), "2026-12");
  assert.equal(shiftMonth("2026-12", 2), "2027-02");
  assert.throws(() => monthDays("2026-13"), RangeError);
  assert.throws(() => shiftMonth("2026-01", 0.5), RangeError);
});

test("up next excludes past and malformed events and sorts actual date/time", () => {
  const event = (id, date, time) => ({ id, data: { date, time, title: id } });
  const records = [
    event("tomorrow", "2026-11-09", "08:00"),
    event("later", "2026-11-08", "15:00"),
    event("past", "2026-11-08", "09:00"),
    event("yesterday", "2026-11-07"),
    event("all-day", "2026-11-08"),
    event("next", "2026-11-08", "11:00"),
    event("bad-time", "2026-11-08", "28:00"),
    event("bad-date", "2026-11-31", "12:00"),
    event("missing-date", undefined, "12:00"),
  ];
  assert.deepEqual(upcomingEvents(records, new Date(2026, 10, 8, 10)).map(e => e.id),
    ["all-day", "next", "later", "tomorrow"]);
  assert.equal(records[0].id, "tomorrow", "sorting must not mutate source records");
});

test("bounty board never treats an assigned account as unassigned", () => {
  assert.equal(isBounty({ member: "Family", assigned_user_id: "child-id" }), false);
  assert.equal(isBounty({ member: "Mia" }), false);
  assert.equal(isBounty({ member: "Family" }), true);
  assert.equal(isBounty({}), true);
});

test("member styles match reference colors and keep dark text on light cards", () => {
  assert.deepEqual(kioskMemberStyle("purple"), { "--member-color": "#ffffff", "--member-ink": "#080808" });
  assert.deepEqual(kioskMemberStyle("unknown"), kioskMemberStyle("teal"));
  assert.equal(kioskMemberStyle("amber")["--member-color"], "#ffd426");
});
