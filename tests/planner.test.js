import test from "node:test";
import assert from "node:assert/strict";
import {
  weekDates,
  shiftDate,
  budgetTotals,
  nextChoreStatus,
  icsExport,
} from "../src/lib/planner.js";
test("calendar handles year and leap day boundaries using local dates", () => {
  assert.deepEqual(weekDates("2027-01-01"), [
    "2026-12-27",
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
  ]);
  assert.equal(shiftDate("2028-02-28", 1), "2028-02-29");
});
test("budgets exclude income and other months and expose overspending", () => {
  const [b] = budgetTotals(
    [
      { id: "b", kind: "budget", data: { amount: 100 } },
      {
        kind: "transaction",
        data: {
          category: "b",
          date: "2026-11-03",
          amount: 125,
          type: "expense",
        },
      },
      {
        kind: "transaction",
        data: { category: "b", date: "2026-11-03", amount: 50, type: "income" },
      },
      {
        kind: "transaction",
        data: {
          category: "b",
          date: "2026-10-03",
          amount: 50,
          type: "expense",
        },
      },
    ],
    "2026-11",
  );
  assert.equal(b.spent, 125);
  assert.equal(b.remaining, -25);
});
test("child cannot approve or pay a chore", () => {
  assert.equal(nextChoreStatus("open", false), "submitted");
  assert.equal(nextChoreStatus("submitted", false), null);
  assert.equal(nextChoreStatus("approved", false), null);
  assert.equal(nextChoreStatus("submitted", true), "approved");
  assert.equal(nextChoreStatus("approved", true), "paid");
});
test("calendar export escapes user text and has exclusive end date", () => {
  const ics = icsExport([
    {
      id: "e",
      data: { date: "2026-12-31", title: "Family, dinner;\nNew year" },
    },
  ]);
  assert.match(ics, /DTEND;VALUE=DATE:20270101/);
  assert.match(ics, /SUMMARY:Family\\, dinner\\;\\nNew year/);
  assert.ok(ics.endsWith("\r\n"));
});

test("holiday dates stay valid across years", async () => {
  const { holidays } = await import("../src/lib/planner.js");
  assert.equal(
    holidays(2026).find((r) => r.data.title === "Thanksgiving").data.date,
    "2026-11-26",
  );
  assert.equal(
    holidays(2027).find((r) => r.data.title === "Memorial Day").data.date,
    "2027-05-31",
  );
});
