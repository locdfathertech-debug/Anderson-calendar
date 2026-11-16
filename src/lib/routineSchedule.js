import { shiftDate } from "./planner.js";

/** Calendar weekdays follow JavaScript's Sunday=0 through Saturday=6. */
export const ROUTINE_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export function isRoutineDue(template, day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(day+"T12:00:00");
  if (Number.isNaN(date.getTime()) ||
      [date.getFullYear(),date.getMonth()+1,date.getDate()].join("-") !==
      [Number(day.slice(0,4)),Number(day.slice(5,7)),Number(day.slice(8,10))].join("-")) return false;
  return Boolean(template?.enabled) && template.begins_on <= day &&
    (!template.ends_on || day <= template.ends_on) &&
    Array.isArray(template.weekdays) && template.weekdays.includes(date.getDay());
}
export function routinePreview(templates, startDay, days=7) {
  if (!Number.isInteger(days) || days<1 || days>31) throw new RangeError("Days must be 1–31");
  return Array.from({length:days},(_,i)=>{
    const date=shiftDate(startDay,i);
    return {date, templates:templates.filter(t=>isRoutineDue(t,date))};
  });
}
/** Rewards are *proposals* until a parent approves each submitted chore. */
export function routineRewards(chores, userId) {
  const mine=chores.filter(c=>c.kind==="chore" && c.data?.routine_template_id &&
    (!userId || c.data?.assigned_user_id===userId));
  const count=status=>mine.filter(c=>c.data.status===status).length;
  const sum=status=>mine.filter(c=>c.data.status===status)
    .reduce((n,c)=>n+Number(c.data.amount||0),0);
  return {open:count("open"),awaiting:count("submitted"),
    approved:count("approved"),paid:count("paid"),
    pendingAmount:sum("submitted"),approvedAmount:sum("approved"),paidAmount:sum("paid"),
    approvedPoints:mine.filter(c=>c.data.status==="approved"||c.data.status==="paid")
      .reduce((n,c)=>n+Number(c.data.points||0),0)};
}
