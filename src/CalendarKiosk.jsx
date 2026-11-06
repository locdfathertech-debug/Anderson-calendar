import { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { dateKey, holidays, weekDates } from "./lib/planner.js";
import { supabase } from "./lib/supabase.js";
import "./kiosk.css";

const REFRESH_MS = 15000;

export default function CalendarKiosk({ familyId, sample }) {
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("Connecting…");
  const [fullscreen, setFullscreen] = useState(false);
  const [screenMessage, setScreenMessage] = useState("");
  const today = dateKey(now);
  const days = weekDates(today);
  const first = days[0];
  const last = days[6];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (sample) return;
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (pending || document.hidden || controller.signal.aborted) return;
      pending = true;
      try {
        const { data, error, status: code } = await supabase
          .from("planner_records")
          .select("id,data")
          .eq("family_id", familyId)
          .eq("kind", "event")
          .gte("data->>date", first)
          .lte("data->>date", last)
          .order("created_at")
          .abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error) {
          if (code === 401 || code === 403) setEvents([]);
          throw error;
        }
        setEvents(data);
        setStatus("Live · " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      } catch {
        if (!controller.signal.aborted) setStatus("Sync interrupted · retrying");
      } finally {
        pending = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [familyId, first, last, sample]);

  useEffect(() => {
    let lock;
    let pending = false;
    let stopped = false;
    async function keepAwake() {
      if (document.hidden || pending || (lock && !lock.released)) return;
      if (!navigator.wakeLock) {
        setScreenMessage("Screen wake lock unavailable in this browser.");
        return;
      }
      pending = true;
      try {
        const acquired = await navigator.wakeLock.request("screen");
        if (stopped) await acquired.release();
        else {
          lock = acquired;
          setScreenMessage("");
        }
      } catch {
        if (!stopped) setScreenMessage("Screen wake lock unavailable.");
      } finally {
        pending = false;
      }
    }
    function syncFullscreen() {
      setFullscreen(Boolean(document.fullscreenElement));
      keepAwake();
    }
    keepAwake();
    document.addEventListener("visibilitychange", keepAwake);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      stopped = true;
      lock?.release().catch(() => {});
      document.removeEventListener("visibilitychange", keepAwake);
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setScreenMessage("Fullscreen is unavailable. Open the installed app for a larger view.");
    }
  }

  const years = new Set(days.map((day) => Number(day.slice(0, 4))));
  const items = [...(sample ? sample.filter((record) => record.kind === "event") : events), ...[...years].flatMap(holidays)];
  return (
    <main className="calendar-kiosk">
      <header className="kiosk-header">
        <div>
          <p className="kiosk-brand">ANDERSON FAMILY HUB</p>
          <h1>Family calendar</h1>
          <time dateTime={today}>{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</time>
        </div>
        <div className="kiosk-controls">
          <strong>{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong>
          <small>{sample ? "Sample calendar" : status}</small>
          <div>
            <button className="btn" onClick={toggleFullscreen} type="button">
              {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              {fullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
            <a className="btn" href={sample ? "/demo" : "/"}>Exit kiosk</a>
          </div>
        </div>
      </header>
      {screenMessage && <p className="kiosk-notice">{screenMessage}</p>}
      <div className="kiosk-week">
        {days.map((day) => {
          const date = new Date(day + "T12:00:00");
          const plans = items.filter((event) => event.data.date === day)
            .sort((a, b) => (a.data.time || "").localeCompare(b.data.time || ""));
          return (
            <section key={day} className="kiosk-day" aria-current={day === today ? "date" : undefined}>
              <h2>{date.toLocaleDateString([], { weekday: "short" })} <span>{date.getDate()}</span></h2>
              {plans.length ? (
                <ul>
                  {plans.map(({ id, data }) => (
                    <li key={id}>
                      <span>{data.time || "All day"}</span>
                      <strong>{data.title}</strong>
                      {data.member && <small>{data.member}</small>}
                    </li>
                  ))}
                </ul>
              ) : <p>No plans</p>}
            </section>
          );
        })}
      </div>
    </main>
  );
}
