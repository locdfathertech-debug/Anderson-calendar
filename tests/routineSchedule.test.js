import test from "node:test";
import assert from "node:assert/strict";
import {isRoutineDue,routinePreview,routineRewards} from "../src/lib/routineSchedule.js";

const weekly={enabled:true,begins_on:"2026-11-01",ends_on:null,weekdays:[1,3,5]};
test("only active selected weekdays and bounded dates are due",()=>{
  assert.equal(isRoutineDue(weekly,"2026-11-16"),true);
  assert.equal(isRoutineDue(weekly,"2026-11-17"),false);
  assert.equal(isRoutineDue({...weekly,enabled:false},"2026-11-16"),false);
  assert.equal(isRoutineDue({...weekly,ends_on:"2026-11-15"},"2026-11-16"),false);
  assert.equal(isRoutineDue({...weekly,begins_on:"2026-11-17"},"2026-11-16"),false);
  assert.equal(isRoutineDue(weekly,"2026-02-30"),false);
});
test("7-day preview crosses month and daylight saving time",()=>{
  const r=routinePreview([{...weekly,weekdays:[0,1,2,3,4,5,6]}],"2026-11-29");
  assert.equal(r[0].date,"2026-11-29");
  assert.equal(r[6].date,"2026-12-05");
  assert.equal(r.every(row=>row.templates.length===1),true);
  assert.throws(()=>routinePreview([], "2026-11-15",32),RangeError);
});
test("approval and payout remain separate; points only earned after parent approval",()=>{
  const mk=(status,amount,points,id="child")=>({kind:"chore",data:{status,amount,points,assigned_user_id:id,routine_template_id:"routine-1"}});
  const result=routineRewards([mk("open",2,4),mk("submitted",3,5),mk("approved",4,6),mk("paid",5,7),mk("approved",50,30,"other")],"child");
  assert.deepEqual(result,{open:1,awaiting:1,approved:1,paid:1,pendingAmount:3,approvedAmount:4,paidAmount:5,approvedPoints:13});
});
