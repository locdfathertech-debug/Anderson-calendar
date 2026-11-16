import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle, Plus, Sunrise, Moon, Coins } from "lucide-react";
import { useFamilyRoutines } from "./lib/useFamilyRoutines.js";
import { ROUTINE_DAYS, routineRewards, isRoutineDue } from "./lib/routineSchedule.js";
import { weeklyRoutineOverview, canGenerateRoutineWeek } from "./lib/routineWeek.js";
import { dateKey, shiftDate, money } from "./lib/planner.js";
import "./routines.css";

const sampleAccounts=[{id:"sample-parent",email:"mia@sample.family",role:"member"}];
const initialForm=()=>({
  title:"",time_of_day:"morning",weekdays:[0,1,2,3,4,5,6],
  assigned_user_id:"",amount:"0",points:"0",begins_on:dateKey(),ends_on:""
});
export default function RoutineManager({familyId,profile,accounts=[],records=[],demo=false,onSave,onRefresh}) {
  const {rows,ready,status,busy,add,setEnabled,generate}=useFamilyRoutines(familyId,demo);
  const [form,setForm]=useState(initialForm);
  const [date,setDate]=useState(dateKey());
  const [working,setWorking]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const candidates=useMemo(()=>{
    const seen=new Set();
    return (demo?sampleAccounts:[...accounts,profile].filter(Boolean))
      .filter(a=>a.id && !seen.has(a.id) && seen.add(a.id))
      .map(a=>({...a,name:records.find(r=>r.kind==="member" && r.data?.assigned_user_id===a.id)?.data?.title ||
        a.email?.split("@")[0] || "Family member"}));
  },[accounts,profile,records,demo]);
  const canManage=["admin","super_admin"].includes(profile?.role);
  const rewards=routineRewards(records);
  const week=useMemo(()=>weeklyRoutineOverview(rows,records,date),[rows,records,date]);
  const allowWeeklyGeneration=canGenerateRoutineWeek(date,dateKey());
  async function create(event){
    event.preventDefault();setError("");setNotice("");
    if(!canManage||!ready||working||busy)return;
    const chosen=candidates.find(c=>c.id===form.assigned_user_id);
    if(!chosen){setError("Choose an authorized family account.");return;}
    if(!form.weekdays.length){setError("Choose at least one day of the week.");return;}
    if(form.ends_on && form.ends_on < form.begins_on){setError("End date cannot precede start date.");return;}
    setWorking(true);
    try{
      await add({
        title:form.title.trim(),time_of_day:form.time_of_day,
        weekdays:[...new Set(form.weekdays)].sort((a,b)=>a-b),
        assigned_user_id:chosen.id,member_name:chosen.name,
        amount:Number(form.amount),points:Number(form.points),
        begins_on:form.begins_on,ends_on:form.ends_on||null,enabled:true
      });
      setForm(initialForm());setNotice("Saved your routine template. Create due chores to make assignments actionable.");
    }catch(e){setError(e.message||"Routine could not be saved.");}
    finally{setWorking(false);}
  }
  async function materialize(numberOfDays=1) {
    if(!ready||!canManage||busy||working||numberOfDays>1&&!allowWeeklyGeneration)return;
    setWorking(true);setNotice("");setError("");
    let completedDates=0;
    let created=0;
    try {
      for(let i=0;i<numberOfDays;i++){
        const dueDate=shiftDate(date,i);
        if(demo){
          const due=rows.filter(t=>isRoutineDue(t,dueDate));
          for(const t of due){
            if(records.some(r=>r.kind==="chore" && r.data?.routine_template_id===t.id && r.data?.date===dueDate))continue;
            if(!onSave)throw Error("Sample chore writer is unavailable.");
            const saved=await onSave({kind:"chore",data:{
              title:t.title,member:t.member_name,assigned_user_id:t.assigned_user_id,
              date:dueDate,status:"open",amount:Number(t.amount),points:Number(t.points),
              routine_template_id:t.id,time_of_day:t.time_of_day
            }});
            if(saved===false)throw Error("Sample chore could not be created.");
            created++;
          }
        }else{
          // Every date is independently verified by the server-side parent-grant RPC.
          created+=Number(await generate(dueDate))||0;
        }
        completedDates++;
      }
      if(!demo)await onRefresh?.();
      setNotice(`Created ${created} assigned chore${created===1?"":"s"} across ${completedDates} day${completedDates===1?"":"s"}. Existing occurrences were not duplicated.`);
    }catch(e){
      if(!demo)await onRefresh?.().catch(()=>{});
      setError(`Stopped after ${completedDates} of ${numberOfDays} days. ${e.message||"Generation failed"}. Already-generated chores are retained; review the schedule before retrying.`);
    }
    finally{setWorking(false);}
  }
  return <section className="routine-manager surface" aria-label="Recurring family routines">
    <div className="section-title">
      <h2><CalendarClock size={21} /> Recurring routines</h2>
      <span className="pill">Parent managed · Rewards require approval</span>
    </div>
    <p className="muted" role="status">{status}. Define Morning/Evening schedules for confirmed family accounts. Generated chores follow the existing submission and approval process.</p>
    <div className="routine-summary" aria-label="Routine progress">
      <span><strong>{rewards.open}</strong> Assigned</span>
      <span><strong>{rewards.awaiting}</strong> Awaiting parent</span>
      <span><strong>{rewards.approved}</strong> Approved</span>
      <span><strong>{rewards.approvedPoints}</strong> Approved points</span>
      <span><strong>{money(rewards.approvedAmount)}</strong> Approved reward</span>
    </div>
    {canManage && <form className="routine-form" onSubmit={create}>
      <h3>Create a reusable routine</h3>
      <div className="routine-form-grid">
        <label>Task name<input required maxLength={120} value={form.title} disabled={!ready||working||busy}
          onChange={e=>setForm(s=>({...s,title:e.target.value}))} placeholder="Make bed, brush teeth…"/></label>
        <label>Routine period<select value={form.time_of_day} disabled={!ready||working||busy}
          onChange={e=>setForm(s=>({...s,time_of_day:e.target.value}))}>
          <option value="morning">Morning</option><option value="evening">Evening</option>
        </select></label>
        <label>Assigned family account<select required value={form.assigned_user_id} disabled={!ready||working||busy}
          onChange={e=>setForm(s=>({...s,assigned_user_id:e.target.value}))}>
          <option value="">Choose confirmed account</option>
          {candidates.map(a=><option key={a.id} value={a.id}>{a.name} · {a.email||a.id}</option>)}
        </select></label>
        <label>Starts on<input type="date" required value={form.begins_on} disabled={!ready||working||busy}
          onChange={e=>setForm(s=>({...s,begins_on:e.target.value}))}/></label>
        <label>Ends on (optional)<input type="date" value={form.ends_on} disabled={!ready||working||busy}
          onChange={e=>setForm(s=>({...s,ends_on:e.target.value}))}/></label>
        <label>Reward ($)<input type="number" min="0" max="10000" step="0.01" value={form.amount} disabled={!ready||working||busy}
          onChange={e=>setForm(s=>({...s,amount:e.target.value}))}/></label>
        <label>Points<input type="number" min="0" max="10000" step="1" value={form.points} disabled={!ready||working||busy}
          onChange={e=>setForm(s=>({...s,points:e.target.value}))}/></label>
      </div>
      <fieldset className="routine-days"><legend>Repeat every</legend>
        {ROUTINE_DAYS.map((label,i)=><label key={i}><input type="checkbox" checked={form.weekdays.includes(i)} disabled={!ready||working||busy}
          onChange={e=>setForm(s=>({...s,weekdays:e.target.checked?[...s.weekdays,i]:s.weekdays.filter(d=>d!==i)}))}/>
          {label}</label>)}
      </fieldset>
      <button type="submit" className="btn" disabled={!ready||working||busy||!candidates.length}><Plus size={16}/> Save routine</button>
    </form>}
    <h3>Routine templates</h3>
    {rows.length?<ul className="routine-template-list">{rows.map(t=><li key={t.id} className={!t.enabled?"routine-disabled":""}>
      <div><strong>{t.time_of_day==="morning"?<Sunrise size={16}/>:<Moon size={16}/>} {t.title}</strong>
        <small>{t.member_name} · {t.weekdays.map(i=>ROUTINE_DAYS[i]).join(", ")} · {t.points} pts · {money(t.amount)}</small>
      </div>
      {canManage&&<button className="btn" type="button" disabled={!ready||working||busy}
        onClick={async()=>{setError("");try{await setEnabled(t.id,!t.enabled);}catch(e){setError(e.message);}}}>
        {t.enabled?"Pause":"Resume"}
      </button>}
    </li>)}</ul>:<p className="muted">No reusable routines yet.</p>}
    <div className="routine-preview">
      <h3>Upcoming assignments</h3>
      <label>Preview start date <input type="date" required value={date} onChange={e=>{if(e.target.value)setDate(e.target.value)}}/></label>
      <div className="routine-week-summary" aria-label="Weekly routine status">
        <span><strong>{week.scheduled}</strong> Not generated</span>
        <span><strong>{week.open}</strong> Open</span>
        <span><strong>{week.awaiting}</strong> Awaiting approval</span>
        <span><strong>{week.approved+week.paid}</strong> Approved or paid</span>
        <span><strong>{week.earnedPoints}</strong> Earned points</span>
      </div>
      <ol>{week.rows.map(p=><li key={p.date}><strong>{p.date}</strong>
        <span>{p.entries.length?p.entries.map(entry=>
          <span className="routine-week-entry" key={entry.template.id}>
            <span>{entry.template.title} ({entry.template.member_name})</span>
            <small className={`routine-status routine-status-${entry.status}`}>{entry.status==="scheduled"?"Not generated":entry.status==="submitted"?"Awaiting review":entry.status}</small>
          </span>
        ):"No routine tasks"}</span>
      </li>)}</ol>
      {canManage&&<div className="routine-actions">
        <button type="button" className="btn" disabled={!ready||working||busy}
          onClick={()=>void materialize(1)}><CheckCircle size={16}/> Generate due chores for {date}</button>
        <button type="button" className="btn" disabled={!ready||working||busy||!allowWeeklyGeneration}
          onClick={()=>void materialize(7)}><CalendarClock size={16}/> Generate next 7 days</button>
      </div>}
      {canManage&&!allowWeeklyGeneration&&<p className="muted">Weekly generation is available from yesterday through 25 days ahead, keeping every date within the server's allowed window.</p>}
      <p className="muted">Generation is parent-authorized and duplicate-safe on the server. A daily background scheduler is not activated yet; generate due chores as part of the parent workflow.</p>
    </div>
    {notice&&<p role="status" className="routine-notice">{notice}</p>}
    {error&&<p role="alert" className="routine-error">{error}</p>}
  </section>;
}
