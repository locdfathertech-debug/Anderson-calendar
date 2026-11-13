import { useEffect, useState } from "react";

export function timeOfDayMode(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 18 && hour < 23) return "evening";
  return "day";
}
export function routineGreeting(mode) {
  if (mode === "morning") return "Good morning, family!";
  if (mode === "evening") return "Time to wind down";
  return "Let's make today count";
}
export function nextLocalDate(date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate()+1, 12);
  return `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(next.getDate()).padStart(2,"0")}`;
}
export function useTimeOfDay() {
  const [now,setNow] = useState(()=>new Date());
  useEffect(()=>{
    const refresh=()=>setNow(new Date());
    const interval=setInterval(refresh,60000);
    document.addEventListener("visibilitychange",refresh);
    window.addEventListener("focus",refresh);
    return ()=>{clearInterval(interval);document.removeEventListener("visibilitychange",refresh);window.removeEventListener("focus",refresh)};
  },[]);
  return { mode: timeOfDayMode(now), now };
}
