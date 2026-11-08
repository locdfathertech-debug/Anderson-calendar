import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, ChevronLeft, ChevronRight, Settings, X, CheckCircle, MapPin, Moon, Bell } from "lucide-react";
import { dateKey, holidays, money } from "./lib/planner.js";
import { monthDays, shiftMonth, upcomingEvents, kioskMemberStyle, isBounty } from "./lib/kiosk.js";
import { assignedMemberColors } from "./lib/memberColors.js";
import { useKioskRecords } from "./lib/useKioskRecords.js";
import "./kiosk.css";

export default function CalendarKiosk({ familyId, sample, profile, onSubmitChore, busy }) {
  const [now, setNow] = useState(() => new Date());
  const [month, setMonth] = useState(() => dateKey().slice(0, 7));
  const [member, setMember] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [screenMessage, setScreenMessage] = useState("");
  const [idle, setIdle] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const lastActivity = useRef(Date.now());
  const dialogRef = useRef(null);
  const alerted = useRef(new Set());
  const { records, status, refresh } = useKioskRecords(familyId, sample);
  const today = dateKey(now);
  const days = monthDays(month);
  const members = records.filter(r => r.kind === "member");
  const colors = assignedMemberColors(members);
  const events = [...records.filter(r => r.kind === "event"), ...[...new Set(days.map(day => Number(day.slice(0, 4))))].flatMap(holidays)];
  const chores = records.filter(r => r.kind === "chore" && r.data.date === today);
  const upcoming = upcomingEvents(records.filter(r => r.kind === "event"), now).slice(0, 2);
  const trips = records.filter(r => r.kind === "trip" && (r.data.end || r.data.date) >= today)
    .sort((a, b) => (a.data.date || "").localeCompare(b.data.date || ""));
  const selectedDay = dialog?.day;
  const dayEvents = selectedDay ? events.filter(r => r.data.date === selectedDay && (dialog.alert ? dialog.ids.includes(r.id) : (!member || r.data.member === member || r.data.member === "Family")))
    .sort((a, b) => (a.data.time || "").localeCompare(b.data.time || "")) : [];
  const home = sample ? "/demo" : "/";
  function memberStyle(name) {
    const person = members.find(r => r.data.title === name);
    return kioskMemberStyle(person ? colors.get(person.id) : "teal");
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      if (!dialog && Date.now() - lastActivity.current >= 15000) setIdle(true);
    }, 1000);
    function activity() { lastActivity.current = Date.now(); }
    for (const type of ["pointerdown", "pointermove", "keydown"]) window.addEventListener(type, activity, { passive: true });
    return () => {
      clearInterval(timer);
      for (const type of ["pointerdown", "pointermove", "keydown"]) window.removeEventListener(type, activity);
    };
  }, [dialog]);
  useEffect(() => {
    const manifest = document.querySelector('link[rel="manifest"]');
    const previous = manifest?.getAttribute("href");
    const theme = document.querySelector('meta[name="theme-color"]');
    const previousTheme = theme?.getAttribute("content");
    theme?.setAttribute("content", "#000000");
    manifest?.setAttribute("href", "/kiosk.webmanifest");
    return () => {
      if (previous) manifest?.setAttribute("href", previous);
      if (previousTheme) theme?.setAttribute("content", previousTheme);
    };
  }, []);
  useEffect(() => {
    if (dialog || idle) return;
    const minute = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const due = records.filter(r => r.kind === "event" && r.data.date === today && r.data.time === minute && (!member || r.data.member === member || r.data.member === "Family") && !alerted.current.has(`${r.id}-${today}-${minute}`));
    if (due.length) {
      due.forEach(r => alerted.current.add(`${r.id}-${today}-${minute}`));
      setDialog({ day: today, alert: true, ids: due.map(r => r.id) });
    }
  }, [now, today, records, dialog, idle, member]);
  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement;
    const node = dialogRef.current;
    const focusable = () => [...node.querySelectorAll('button:not(:disabled),a[href]')];
    focusable()[0]?.focus();
    function keys(e) {
      if (e.key === "Escape") closeDialog();
      if (e.key !== "Tab") return;
      const items = focusable();
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1)?.focus(); }
      if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0]?.focus(); }
    }
    node.addEventListener("keydown", keys);
    return () => { node.removeEventListener("keydown", keys); previous?.focus(); };
  }, [dialog]);
  useEffect(() => {
    let lock;
    let pending = false;
    let stopped = false;
    async function keepAwake() {
      if (document.hidden || pending || (lock && !lock.released)) return;
      if (!navigator.wakeLock) { setScreenMessage("Screen wake lock unavailable in this browser."); return; }
      pending = true;
      try {
        const acquired = await navigator.wakeLock.request("screen");
        if (stopped) await acquired.release();
        else { lock = acquired; setScreenMessage(""); }
      } catch { if (!stopped) setScreenMessage("Screen wake lock unavailable."); }
      finally { pending = false; }
    }
    function syncFullscreen() { setFullscreen(Boolean(document.fullscreenElement)); keepAwake(); }
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
    } catch { setScreenMessage("Fullscreen unavailable. Open the installed app for a larger view."); }
  }
  function closeDialog() { setDialog(null); lastActivity.current = Date.now(); }
  function wake() { lastActivity.current = Date.now(); setIdle(false); }
  async function submit(id) {
    if (submitting || busy) return;
    setSubmitting(true);
    try { await onSubmitChore(id); refresh(); }
    finally { setSubmitting(false); }
  }
  function choreCard(r) {
    const canSubmit = !sample && profile?.role === "member" && r.data.assigned_user_id === profile.id && r.data.status === "open";
    return <li key={r.id} className="kiosk-chore">
      <div><strong>{r.data.title}</strong><small>{r.data.member || "Unassigned"} · {r.data.status || "open"}</small></div>
      {canSubmit ? <button type="button" className="kiosk-icon" disabled={submitting || busy} onClick={() => submit(r.id)} aria-label={`Submit ${r.data.title} as complete`}><CheckCircle size={22} /></button>
        : <span className="kiosk-reward">{r.data.points ? `${r.data.points} pts` : money(r.data.amount)}</span>}
    </li>;
  }
  return <main className="calendar-kiosk">
    <div className="kiosk-layout" inert={idle || dialog ? "" : undefined}>
      <aside className="kiosk-family">
        <img src="/anderson-family-hub-logo.webp" alt="Anderson Family Hub" width="720" height="216" />
        <p className="kiosk-tagline">Sync the schedule.<br />Share the love.</p>
        <div className="kiosk-section-heading"><h2>Our family</h2><span>{members.length}</span></div>
        <button className={`kiosk-member ${!member ? "selected" : ""}`} aria-pressed={!member} onClick={() => setMember("")}>All family</button>
        <div className="kiosk-member-list">{members.map(r => {
          const count = events.filter(e => e.data.member === r.data.title && e.data.date === today).length;
          return <button key={r.id} className={`kiosk-member ${member === r.data.title ? "selected" : ""}`} style={memberStyle(r.data.title)} aria-pressed={member === r.data.title} onClick={() => setMember(member === r.data.title ? "" : r.data.title)}>
            <span className="kiosk-avatar">{r.data.title?.slice(0, 1)}</span><span><strong>{r.data.title}</strong><small>{count ? `${count} plan${count === 1 ? "" : "s"} today` : "No plans today"}</small></span>
          </button>;
        })}</div>
        <div className="kiosk-family-bottom">
          <p className="kiosk-sync" role="status">{status}</p>
          {screenMessage && <p className="kiosk-notice">{screenMessage}</p>}
          <button className="kiosk-control" onClick={() => setDialog({ portal: true })}><Settings size={19} /> Parent portal</button>
          <button className="kiosk-control" onClick={toggleFullscreen}>{fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}{fullscreen ? "Exit fullscreen" : "Fullscreen"}</button>
          <button className="kiosk-control" onClick={() => setIdle(true)}><Moon size={19} /> Clock display</button>
          <a className="kiosk-control" href={home}>Exit kiosk</a>
        </div>
      </aside>
      <section className="kiosk-calendar" aria-label="Monthly family calendar">
        <header className="kiosk-month-header"><div><p className="kiosk-eyebrow">FAMILY CALENDAR</p><h1>{new Date(`${month}-01T12:00:00`).toLocaleDateString([], { month: "long", year: "numeric" })}</h1><time dateTime={today}>{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</time></div>
          <div className="kiosk-month-controls"><button className="kiosk-icon" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft /></button><button className="kiosk-control" onClick={() => setMonth(today.slice(0, 7))}>Today</button><button className="kiosk-icon" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight /></button></div>
        </header>
        <div className="kiosk-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <span key={d}>{d}</span>)}</div>
        <div className="kiosk-month-grid" style={{ "--week-count": days.length / 7 }}>
          {days.map(day => {
            const plans = events.filter(r => r.data.date === day && (!member || r.data.member === member || r.data.member === "Family"))
              .sort((a, b) => (a.data.time || "").localeCompare(b.data.time || ""));
            return <button key={day} className={`kiosk-date ${day.startsWith(month) ? "" : "outside"}`} aria-current={day === today ? "date" : undefined} aria-label={`${new Date(`${day}T12:00:00`).toLocaleDateString([], { month: "long", day: "numeric" })}, ${plans.length} events`} onClick={() => setDialog({ day })}>
              <span className="kiosk-date-number">{Number(day.slice(-2))}</span>
              {plans.slice(0, 2).map(r => <span key={r.id} className="kiosk-event" style={memberStyle(r.data.member)}><small>{r.data.time || "All day"}</small><strong>{r.data.title}</strong></span>)}
              {plans.length > 2 && <span className="kiosk-more">+{plans.length - 2} more</span>}
            </button>;
          })}
        </div>
        <footer className="kiosk-calendar-footer"><span><Bell size={15} /> Tap a date to see all events</span><time>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></footer>
      </section>
      <aside className="kiosk-activities">
        <section><h2><CheckCircle size={19} /> Today’s chores</h2><ul>{chores.filter(r => !isBounty(r.data)).map(choreCard)}</ul>{!chores.some(r => !isBounty(r.data)) && <p className="kiosk-empty">No chores scheduled today.</p>}</section>
        <section><h2>Bounty board</h2><p className="kiosk-hint">Ask a parent to assign a task.</p><ul>{chores.filter(r => isBounty(r.data) && (r.data.status || "open") === "open").map(choreCard)}</ul>{!chores.some(r => isBounty(r.data) && (r.data.status || "open") === "open") && <p className="kiosk-empty">No open bounties today.</p>}</section>
        <section><h2><MapPin size={19} /> Upcoming vacations</h2>{trips.map(r => <article key={r.id} className="kiosk-trip"><strong>{r.data.title}</strong><p>{r.data.location}</p><time>{r.data.date} {r.data.end && `— ${r.data.end}`}</time></article>)}{!trips.length && <p className="kiosk-empty">Your next adventure starts here.</p>}</section>
      </aside>
    </div>
    {dialog && <div className="kiosk-modal-backdrop"><section ref={dialogRef} className="kiosk-dialog" role="dialog" aria-modal="true" aria-labelledby="kiosk-dialog-title">
      <header><h2 id="kiosk-dialog-title">{dialog.portal ? "Parent portal" : dialog.alert ? "Starting now" : new Date(`${selectedDay}T12:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</h2><button className="kiosk-icon" aria-label="Close dialog" onClick={closeDialog}><X /></button></header>
      {dialog.portal ? <><p>The shared display keeps family plans read-only. Manage events, chores, bounties, and vacations in the regular workspace with a parent account.</p><p className="kiosk-hint">A family member’s color tab does not change account permissions.</p><a className="kiosk-control" href={home}>Open {sample ? "sample" : "family"} workspace</a></> : <>{dayEvents.length ? dayEvents.map(r => <article className="kiosk-event-detail" key={r.id} style={memberStyle(r.data.member)}><time>{r.data.time || "All day"}</time><h3>{r.data.title}</h3><p>{r.data.member}</p>{r.data.location && <p><MapPin size={16} /> {r.data.location}</p>}{r.data.notes && <p>{r.data.notes}</p>}</article>) : <p>No events on this date.</p>}</>}
    </section></div>}
    {idle && <button className="kiosk-screensaver" onClick={wake} onKeyDown={e => { if (e.key !== "Tab") { e.preventDefault(); wake(); } }} autoFocus aria-label="Wake family calendar">
      <div className="kiosk-clock-glass"><p className="kiosk-eyebrow">ANDERSON FAMILY HUB</p><time className="kiosk-idle-time">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><p>{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p><div className="kiosk-up-next"><h2>Up next</h2>{upcoming.length ? upcoming.map(r => <div key={r.id}><strong>{r.data.title}</strong><span>{r.data.date === today ? "Today" : r.data.date} · {r.data.time || "All day"}</span></div>) : <p>No upcoming plans.</p>}</div><small>Tap anywhere or press a key to wake</small></div>
    </button>}
  </main>;
}
