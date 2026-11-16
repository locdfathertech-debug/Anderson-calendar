import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { dateKey } from "./planner.js";

const demoTemplates=[
  {id:"demo-routine-morning",family_id:"sample-family",title:"Make the bed",time_of_day:"morning",
   weekdays:[0,1,2,3,4,5,6],assigned_user_id:"sample-parent",member_name:"Mia",
   begins_on:"2020-01-01",ends_on:null,amount:2,points:5,enabled:true},
  {id:"demo-routine-evening",family_id:"sample-family",title:"Prepare school bag",time_of_day:"evening",
   weekdays:[0,1,2,3,4],assigned_user_id:"sample-parent",member_name:"Lily",
   begins_on:"2020-01-01",ends_on:null,amount:1,points:3,enabled:true}
];

let sampleRoutines=[...demoTemplates];
function notifyDemo(){window.dispatchEvent(new Event("anderson-demo-routines"));}
export function useFamilyRoutines(familyId, demo=false) {
  const [state,setState]=useState({familyId:null,rows:[],ready:demo,status:"Connecting…"});
  const [busy,setBusy]=useState(false);
  const refresh=useCallback(async()=>{
    if(demo){setState({familyId,rows:[...sampleRoutines],ready:true,status:"Sample routines · not synced"});return;}
    if(!familyId)return;
    const {data,error}=await supabase.from("routine_templates").select(
      "id,family_id,title,time_of_day,weekdays,assigned_user_id,member_name,amount,points,begins_on,ends_on,enabled"
    ).eq("family_id",familyId).order("time_of_day").order("title").limit(200);
    if(error){setState({familyId,rows:[],ready:false,status:"Secure routines are not activated yet"});return;}
    setState({familyId,rows:data||[],ready:true,status:"Family routines · synced"});
  },[familyId,demo]);
  useEffect(()=>{
    setState({familyId,rows:demo?[...sampleRoutines]:[],ready:demo,status:demo?"Sample routines · not synced":"Connecting…"});
    void refresh();
    if(demo){
      const handle=()=>void refresh();
      window.addEventListener("anderson-demo-routines",handle);
      return ()=>window.removeEventListener("anderson-demo-routines",handle);
    }
    if(!familyId)return;
    const channel=supabase.channel(`family-routines-${familyId}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"routine_templates",filter:`family_id=eq.${familyId}`},()=>void refresh())
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"routine_templates",filter:`family_id=eq.${familyId}`},()=>void refresh())
      .subscribe();
    const poll=setInterval(()=>void refresh(),30000);
    return ()=>{clearInterval(poll);void supabase.removeChannel(channel);};
  },[familyId,demo,refresh]);
  const ready=(state.familyId===familyId && state.ready);
  const rows=state.familyId===familyId ? state.rows:[];
  const add=async(data)=>{
    if(!ready)throw Error("Routines are not activated for this family.");
    setBusy(true);
    try{
      if(demo){
        sampleRoutines=[...sampleRoutines,{...data,id:`demo-routine-${Date.now()}-${Math.random()}`,family_id:familyId}];
        notifyDemo();return;
      }
      const {error}=await supabase.from("routine_templates").insert({...data,family_id:familyId});
      if(error)throw error;
      await refresh();
    }finally{setBusy(false);}
  };
  const setEnabled=async(id,enabled)=>{
    if(!ready)throw Error("Routines are unavailable.");
    setBusy(true);
    try{
      if(demo){sampleRoutines=sampleRoutines.map(t=>t.id===id?{...t,enabled}:t);notifyDemo();return;}
      const {data,error}=await supabase.from("routine_templates").update({enabled})
        .eq("id",id).eq("family_id",familyId).select("id").single();
      if(error || !data)throw error || Error("No routine was changed.");
      await refresh();
    }finally{setBusy(false);}
  };
  const generate=async(day=dateKey())=>{
    if(!ready)throw Error("Routines are unavailable.");
    if(demo)throw Error("Demo generation is handled by the parent workspace.");
    setBusy(true);
    try{
      const {data,error}=await supabase.rpc("materialize_family_routines",{target_day:day});
      if(error)throw error;
      return data;
    }finally{setBusy(false);}
  };
  return {rows,ready,status:state.status,busy,refresh,add,setEnabled,generate};
}
