import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase.js";

// Reconcile authorized snapshots, rather than trusting partial change payloads.
export function useKioskRecords(familyId, sample) {
  const [snapshot, setSnapshot] = useState({ familyId: null, rows: [] });
  const [status, setStatus] = useState("Connecting…");
  const refreshRef = useRef(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);
  useEffect(() => {
    if (sample) return;
    setStatus("Connecting…");
    setSnapshot({ familyId, rows: [] });
    const setRecords = rows => setSnapshot({ familyId, rows });
    const controller = new AbortController();
    let pending = false;
    let queued = false;
    let realtime = false;
    async function sync() {
      if (controller.signal.aborted || document.hidden) return;
      if (pending) { queued = true; return; }
      pending = true;
      try {
        const rows = [];
        let offset = 0;
        while (!controller.signal.aborted) {
          const { data, error, status: code } = await supabase.from("planner_records")
            .select("id,kind,data").eq("family_id", familyId)
            .in("kind", ["member", "event", "chore", "trip", "meal"])
            .order("id").range(offset, offset + 499).abortSignal(controller.signal);
          if (error) {
            if (!controller.signal.aborted && (code === 401 || code === 403)) setRecords([]);
            throw error;
          }
          rows.push(...data);
          if (data.length < 500) break;
          offset += 500;
        }
        if (controller.signal.aborted) return;
        setRecords(rows);
        setStatus((realtime ? "Live" : "Synced · 15s refresh") + " · " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      } catch {
        if (!controller.signal.aborted) setStatus("Sync interrupted · showing last update");
      } finally {
        pending = false;
        if (queued && !controller.signal.aborted) { queued = false; sync(); }
      }
    }
    refreshRef.current = sync;
    const channel = supabase.channel(`kiosk-${familyId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "planner_records", filter: `family_id=eq.${familyId}` }, sync)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "planner_records", filter: `family_id=eq.${familyId}` }, sync)
      .subscribe((state) => { realtime = state === "SUBSCRIBED"; if (realtime) sync(); });
    sync();
    // Polling reconciles deletions and recovers missed/disconnected updates.
    const timer = setInterval(sync, 15000);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      controller.abort();
      refreshRef.current = () => {};
      clearInterval(timer);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", sync);
      supabase.removeChannel(channel);
    };
  }, [familyId, sample]);
  return { records: sample || (snapshot.familyId === familyId ? snapshot.rows : []), status: sample ? "Sample calendar · session only" : status, refresh };
}
