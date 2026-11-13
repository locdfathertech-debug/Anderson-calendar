import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import { groceryItem } from "./groceryItems.js";

let demoGroceries = [
  { id:"demo-milk",item:"Milk",completed:false,created_at:"2026-11-13T09:00:00Z" },
  { id:"demo-eggs",item:"Eggs",completed:false,created_at:"2026-11-13T09:01:00Z" }
];
export function useFamilyGroceries(familyId, userId, demo = false) {
  const [state,setState] = useState({familyId:null,rows:[],status:"Connecting…",ready:demo});
  const timers = useRef(new Map());
  const generation=useRef(0);
  useEffect(()=>{
    if (!demo) return;
    const sync=()=>setState(s=>({...s,rows:[...demoGroceries]}));
    window.addEventListener("family-demo-groceries",sync);
    return ()=>window.removeEventListener("family-demo-groceries",sync);
  },[demo]);
  useEffect(()=>{
    const epoch=++generation.current;
    for(const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    setState({familyId,rows:demo?[...demoGroceries]:[],status:demo?"Sample list · not synced":"Connecting…",ready:demo});
    if(demo || !familyId || !userId) return;
    let pending=false;
    const refresh=async()=>{
      if(pending||generation.current!==epoch) return;
      pending=true;
      try {
        const {data,error}=await supabase.from("groceries")
          .select("id,item,completed,created_at,completed_at")
          .eq("family_id",familyId).order("created_at",{ascending:true}).limit(200);
        if(error) throw error;
        if(generation.current===epoch) setState({familyId,rows:data||[],status:"Grocery list · synced",ready:true});
      } catch {
        if(generation.current===epoch) setState({familyId,rows:[],status:"Private groceries not activated yet",ready:false});
      } finally {pending=false;}
    };
    void refresh();
    const channel=supabase.channel(`groceries-${familyId}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"groceries",filter:`family_id=eq.${familyId}`},()=>void refresh())
      .subscribe();
    const poll=setInterval(refresh,15000);
    window.addEventListener("online",refresh);
    return ()=>{
      ++generation.current;
      for(const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
      clearInterval(poll);window.removeEventListener("online",refresh);
      void supabase.removeChannel(channel);
    };
  },[familyId,userId,demo]);
  const ready=demo || (state.familyId===familyId && state.ready);
  const rows=state.familyId===familyId?state.rows:[];
  const refresh=useCallback(async()=>{
    if(demo||!familyId||!userId) return;
    const {data,error}=await supabase.from("groceries")
      .select("id,item,completed,created_at,completed_at").eq("family_id",familyId)
      .order("created_at",{ascending:true}).limit(200);
    if(!error) setState({familyId,rows:data||[],status:"Grocery list · synced",ready:true});
  },[familyId,userId,demo]);
  const add=useCallback(async input=>{
    const item=groceryItem(input);
    if(!ready||!item) throw new Error("Grocery list is unavailable or item is empty.");
    if(demo) {
      demoGroceries=[...demoGroceries,{id:`demo-${Date.now()}-${Math.random()}`,item,completed:false,created_at:new Date().toISOString()}];
      window.dispatchEvent(new Event("family-demo-groceries"));
      return;
    }
    const {error}=await supabase.from("groceries").insert({family_id:familyId,added_by:userId,item});
    if(error) throw error;
    await refresh();
  },[ready,demo,familyId,userId,refresh]);
  const toggle=useCallback(async row=>{
    if(!ready) throw new Error("Grocery list is unavailable.");
    const completed=!row.completed;
    if(!completed){
      const timer=timers.current.get(row.id);if(timer)clearTimeout(timer);timers.current.delete(row.id);
    }
    if(demo){
      demoGroceries=demoGroceries.map(x=>x.id===row.id?{...x,completed}:x);
      window.dispatchEvent(new Event("family-demo-groceries"));
    }else{
      const {error}=await supabase.from("groceries").update({
        completed,completed_at:completed?new Date().toISOString():null
      }).eq("family_id",familyId).eq("id",row.id);
      if(error) throw error;
      await refresh();
    }
    if(completed){
      const timer=setTimeout(async()=>{
        timers.current.delete(row.id);
        if(demo) {
          demoGroceries=demoGroceries.filter(x=>x.id!==row.id);
          window.dispatchEvent(new Event("family-demo-groceries"));
        }
        else {
          const {error}=await supabase.from("groceries").delete().eq("family_id",familyId).eq("id",row.id).eq("completed",true);
          if(!error) await refresh();
        }
      },2000);
      timers.current.set(row.id,timer);
    }
  },[ready,demo,familyId,refresh]);
  return {rows,status:state.status,ready,add,toggle};
}
