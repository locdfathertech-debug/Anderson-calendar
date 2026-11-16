import {routinePreview} from "./routineSchedule.js";

/** Read-only, tenant-scoped weekly overview. Always pass already RLS-authorized records. */
export function weeklyRoutineOverview(templates, records, startDay, days=7, assignedUserId=null) {
  const schedule=routinePreview(templates,startDay,days);
  const chores=records.filter(r=>r?.kind==="chore" && r.data?.routine_template_id
    && (!assignedUserId || r.data?.assigned_user_id===assignedUserId));
  const byOccurrence=new Map(chores.map(r=>[`${r.data.routine_template_id}/${r.data.date}`,r]));
  const rows=schedule.map(({date,templates:due})=>({
    date,
    entries:due.filter(t=>!assignedUserId || t.assigned_user_id===assignedUserId).map(t=>{
      const record=byOccurrence.get(`${t.id}/${date}`)||null;
      return {template:t,record,
        status:record?.data?.status||"scheduled",
        pointsEarned:["approved","paid"].includes(record?.data?.status)?Number(record.data.points||0):0,
        rewardApproved:["approved","paid"].includes(record?.data?.status)?Number(record.data.amount||0):0};
    })
  }));
  const entries=rows.flatMap(r=>r.entries);
  const count=status=>entries.filter(r=>r.status===status).length;
  return {rows,total:entries.length,scheduled:count("scheduled"),open:count("open"),
    awaiting:count("submitted"),approved:count("approved"),paid:count("paid"),
    earnedPoints:entries.reduce((s,e)=>s+e.pointsEarned,0),
    approvedRewards:entries.reduce((s,e)=>s+e.rewardApproved,0)};
}
export function canGenerateRoutineWeek(firstDay, today) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(firstDay)||!/^\d{4}-\d{2}-\d{2}$/.test(today))return false;
  const start=new Date(firstDay+"T12:00:00");
  const current=new Date(today+"T12:00:00");
  if(!Number.isFinite(start.getTime())||!Number.isFinite(current.getTime())||
     [start.getFullYear(),String(start.getMonth()+1).padStart(2,"0"),String(start.getDate()).padStart(2,"0")].join("-")!==firstDay) return false;
  const gap=Math.round((start-current)/86400000);
  // Server RPC allows yesterday through +31; keep all 7 days within that range.
  return gap>=-1 && gap<=25;
}
