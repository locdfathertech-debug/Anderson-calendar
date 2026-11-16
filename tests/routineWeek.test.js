import test from "node:test";
import assert from "node:assert/strict";
import {weeklyRoutineOverview,canGenerateRoutineWeek} from "../src/lib/routineWeek.js";

const templates=[{id:"a",title:"Brush teeth",assigned_user_id:"child-a",weekdays:[0,1,2,3,4,5,6],enabled:true,begins_on:"2026-11-01",ends_on:null,points:3,amount:1},
{id:"b",title:"Walk dog",assigned_user_id:"child-b",weekdays:[0,1,2,3,4,5,6],enabled:true,begins_on:"2026-11-01",ends_on:null,points:10,amount:4}];
const task=(id,day,status,who="child-a")=>({kind:"chore",id, data:{routine_template_id:who==="child-a"?"a":"b",date:day,status,assigned_user_id:who,points:3,amount:1}});
test("weekly overview distinguishes scheduled, open, submitted and approved",()=>{
  const w=weeklyRoutineOverview(templates,[task("1","2026-11-15","open"),task("2","2026-11-16","submitted"),task("3","2026-11-17","approved"),task("4","2026-11-18","paid")],"2026-11-15",7,"child-a");
  assert.equal(w.total,7);
  assert.equal(w.scheduled,3);
  assert.equal(w.open,1);
  assert.equal(w.awaiting,1);
  assert.equal(w.approved,1);
  assert.equal(w.paid,1);
  assert.equal(w.earnedPoints,6);
  assert.equal(w.approvedRewards,2);
  assert.equal(w.rows[0].entries.length,1);
});
test("unapproved tasks never count as earned reward",()=>{
  const r=weeklyRoutineOverview(templates,[task("1","2026-11-15","submitted")],"2026-11-15",1,"child-a");
  assert.equal(r.earnedPoints,0);
  assert.equal(r.approvedRewards,0);
});
test("batch generation preview rejects invalid and outside server RPC bounds",()=>{
  assert.equal(canGenerateRoutineWeek("2026-11-15","2026-11-15"),true);
  assert.equal(canGenerateRoutineWeek("2026-11-14","2026-11-15"),true);
  assert.equal(canGenerateRoutineWeek("2026-12-10","2026-11-15"),true);
  assert.equal(canGenerateRoutineWeek("2026-12-11","2026-11-15"),false);
  assert.equal(canGenerateRoutineWeek("2026-11-13","2026-11-15"),false);
  assert.equal(canGenerateRoutineWeek("2026-02-30","2026-02-20"),false);
});
