import test from "node:test";
import assert from "node:assert/strict";
import { buildAgenda } from "../src/lib/agenda.js";

const e=(id,date,time,title="Event")=>({id,kind:"event",data:{date,time,title}});
test("day agenda includes only selected day, all-day first then chronological events",()=>{
  const source=[e("late","2026-11-15","17:30"),e("outside","2026-11-16","09:00"),e("all","2026-11-15","", "All day"),e("early","2026-11-15","08:00")];
  const r=buildAgenda(source,"2026-11-15","day");
  assert.equal(r.length,1);
  assert.deepEqual(r[0].items.map(x=>x.id),["all","early","late"]);
  assert.equal(source[0].id,"late");
});
test("agenda shows next 14 local calendar dates across month, year and DST",()=>{
  const previous=process.env.TZ;
  try {
    process.env.TZ="America/Chicago";
    const r=buildAgenda([e("new","2027-01-01","12:00")],"2026-12-28","agenda");
    assert.equal(r.length,14);
    assert.equal(r[0].date,"2026-12-28");
    assert.equal(r[13].date,"2027-01-10");
    assert.equal(r[4].items[0].id,"new");
    const dst=buildAgenda([],"2027-03-11","agenda");
    assert.equal(dst[3].date,"2027-03-14");
  } finally { if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous; }
});
test("agenda validates input and ignores non-event items",()=>{
  assert.throws(()=>buildAgenda([],"2026-02-30"),RangeError);
  assert.throws(()=>buildAgenda([],"2026-11-15","month"),RangeError);
  assert.equal(buildAgenda([{id:"1",kind:"chore",data:{date:"2026-11-15"}}],"2026-11-15")[0].items.length,0);
});
