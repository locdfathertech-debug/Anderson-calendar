import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, ChevronLeft, ChevronRight, Settings, X, CheckCircle, MapPin, Moon, Bell, Utensils, Play } from "lucide-react";
import { dateKey, holidays, money } from "./lib/planner.js";
import { monthDays, shiftMonth, upcomingEvents, kioskMemberStyle, isBounty } from "./lib/kiosk.js";
import { assignedMemberColors } from "./lib/memberColors.js";
import { useKioskRecords } from "./lib/useKioskRecords.js";
import KioskVideo from "./KioskVideo.jsx";
import WeekTimeline from "./WeekTimeline.jsx";
import { weekDays, shiftWeek } from "./lib/weekTimeline.js";
import MemberAvatar from "./MemberAvatar.jsx";
import { videoSource, categoryInfo } from "./lib/video.js";
import { AnimatePresence } from "framer-motion";
import "./kiosk.css";

export default function CalendarKiosk({ familyId, sample, profile, onSubmitChore, busy, onOpenParent, portalOpen = false, kioskEnabled = false, onStartKiosk, kioskNotice = "" }) {
  const [now, setNow] = useState(() => new Date());
  const [anchor, setAnchor] = useState(() => dateKey());
  const [calendarView, setCalendarView] = useState("week");
  const month = anchor.slice(0, 7);
  const [member, setMember] = useState("");
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [screenMessage, setScreenMessage] = useState("");
  const [idle, setIdle] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [video, setVideo] = useState(null);
  const activeVideo = video?.familyId === familyId ? video : null;
  const installedFullscreen = window.matchMedia?.("(display-mode: fullscreen)").matches || false;
  const lastActivity = useRef(Date.now());
  const dialogRef = useRef(null);
  const alerted = useRef(new Set());
  const { records, status, refresh } = useKioskRecords(familyId, sample);
  useEffect(() => { setVideo(null); lastActivity.current = Date.now(); }, [familyId]);
  const today = dateKey(now);
  const days = calendarView === "week" ? weekDays(anchor) : monthDays(month);
  const members = records.filter(r => r.kind === "member");
  const colors = assignedMemberColors(members);
  const events = [...records.filter(r => r.kind === "event"), ...[...new Set(days.map(day => Number(day.slice(0, 4))))].flatMap(holidays)];
  const dinners = records.filter(r => r.kind === "meal" && r.data.date === today && String(r.data.type || "Dinner").toLowerCase() === "dinner");
  const chores = records.filter(r => r.kind === "chore" && r.data.date === today);
  const upcoming = upcomingEvents(records.filter(r => r.kind === "event"), now).slice(0, 2);
  const trips = records.filter(r => r.kind === "trip" && (r.data.end || r.data.date) >= today)
    .sort((a, b) => (a.data.date || "").localeCompare(b.data.date || ""));
  const selectedDay = dialog?.day;
  const dayEvents = selectedDay ? events.filter(r => r.data.date === selectedDay && (dialog.alert ? dialog.ids.includes(r.id) : (!member || r.data.member === member || r.data.member === "Family")))
    .sort((a, b) => (a.data.time || "").localeCompare(b.data.time || "")) : [];

  useEffect(() => { setIdle(false); lastActivity.current = Date.now(); }, [portalOpen, kioskEnabled]);
  function memberStyle(name) {
    const person = members.find(r => r.data.title === name);
    return kioskMemberStyle(person ? colors.get(person.id) : "teal");
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      if (!kioskEnabled && !dialog && !portalOpen && !activeVideo && Date.now() - lastActivity.current >= 15000) setIdle(true);
    }, 1000);
    function activity() { lastActivity.current = Date.now(); }
    for (const type of ["pointerdown", "pointermove", "keydown", "wheel", "touchmove", "scroll"]) window.addEventListener(type, activity, { passive: true, capture: true });
    return () => {
      clearInterval(timer);
      for (const type of ["pointerdown", "pointermove", "keydown", "wheel", "touchmove", "scroll"]) window.removeEventListener(type, activity, true);
    };
  }, [dialog, activeVideo, portalOpen, kioskEnabled]);
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
    if (dialog || portalOpen || idle || activeVideo) return;
    const minute = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const due = records.filter(r => r.kind === "event" && r.data.date === today && r.data.time === minute && (!member || r.data.member === member || r.data.member === "Family") && !alerted.current.has(`${r.id}-${today}-${minute}`));
    if (due.length) {
      due.forEach(r => alerted.current.add(`${r.id}-${today}-${minute}`));
      setDialog({ day: today, alert: true, ids: due.map(r => r.id) });
    }
  }, [now, today, records, dialog, idle, member, activeVideo, portalOpen]);
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
      if (document.fullscreenElement && !kioskEnabled) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { setScreenMessage("Fullscreen unavailable. Open the installed app for a larger view."); }
  }
  function navigate(offset) {
    setAnchor(calendarView === "week" ? shiftWeek(anchor, offset) : `${shiftMonth(month, offset)}-01`);
  }
  function closeDialog() { setDialog(null); lastActivity.current = Date.now(); }
  function wake() { lastActivity.current = Date.now(); setIdle(false); }
  function closeVideo() { setVideo(null); lastActivity.current = Date.now(); }
  function playVideo(record) {
    const source = videoSource(record.data.video_url);
    if (!source) return;
    closeDialog();
    setIdle(false);
    setVideo({ ...source, id: record.id, title: record.data.title, familyId });
    lastActivity.current = Date.now();
  }
  useEffect(() => {
    if (!activeVideo) return;
    const record = records.find(r => r.id === activeVideo.id);
    if (!record || videoSource(record.data.video_url)?.url !== activeVideo.url) closeVideo();
  }, [records, activeVideo]);
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
    <div className="kiosk-layout" inert={idle || dialog || portalOpen ? "" : undefined}>
      <aside className="kiosk-family">
        <img src="/anderson-family-hub-logo.webp" alt="Anderson Family Hub" width="720" height="216" />
        <p className="kiosk-tagline">Sync the schedule.<br />Share the love.</p>
        <div className="kiosk-section-heading"><h2>Our family</h2><span>{members.length}</span></div>
        <button className={`kiosk-member ${!member ? "selected" : ""}`} aria-pressed={!member} onClick={() => setMember("")}>All family</button>
        <div className="kiosk-member-list">{members.map(r => {
          const count = events.filter(e => e.data.member === r.data.title && e.data.date === today).length;
          return <button key={r.id} className={`kiosk-member ${member === r.data.title ? "selected" : ""}`} style={memberStyle(r.data.title)} aria-pressed={member === r.data.title} onClick={() => setMember(member === r.data.title ? "" : r.data.title)}>
            <MemberAvatar className="kiosk-avatar" name={r.data.title} url={r.data.avatar_url} /><span><strong>{r.data.title}</strong><small>{r.data.role || "Family member"} · {count ? `${count} plan${count === 1 ? "" : "s"} today` : "No plans today"}</small></span>
          </button>;
        })}</div>
        <div className="kiosk-family-bottom">
          <p className="kiosk-sync" role="status">{status}</p>
          {kioskEnabled && <p className="kiosk-mode-status" role="status">Calendar kiosk active · Parent PIN required to stop</p>}
          {kioskEnabled && <p className="kiosk-hint">Pin this app in Samsung Settings to lock Android Home and Recents.</p>}
          {(kioskNotice || screenMessage) && <p className="kiosk-notice">{kioskNotice || screenMessage}</p>}
          {!kioskEnabled && ["admin", "super_admin"].includes(profile?.role) && <button className="kiosk-control kiosk-start" onClick={onStartKiosk}><Maximize size={19} /> Start Kiosk Mode</button>}
          <button className="kiosk-control" onClick={() => { wake(); setDialog({ setup: true }); }}><Settings size={19} /> Kiosk setup</button>
          <button className="kiosk-control" onClick={() => { wake(); onOpenParent?.(); }}><Settings size={19} /> Parent portal</button>
          {!installedFullscreen && (!kioskEnabled || !fullscreen) && <button className="kiosk-control" onClick={toggleFullscreen}>{fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}{fullscreen ? "Exit fullscreen" : kioskEnabled ? "Enter fullscreen" : "Fullscreen"}</button>}
          {!kioskEnabled && <button className="kiosk-control" disabled={Boolean(activeVideo)} title={activeVideo ? "Close the video to show the clock" : undefined} onClick={() => setIdle(true)}><Moon size={19} /> Clock display</button>}

        </div>
      </aside>
      <section className="kiosk-calendar" aria-label={`${calendarView === "week" ? "Weekly" : "Monthly"} family calendar`}>
        <header className="kiosk-month-header"><div><p className="kiosk-eyebrow">FAMILY CALENDAR</p><h1>{calendarView === "week" ? `${new Date(`${days[0]}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" })} – ${new Date(`${days[6]}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}` : new Date(`${month}-01T12:00:00`).toLocaleDateString([], { month: "long", year: "numeric" })}</h1><time dateTime={today}>{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</time></div>
          <div className="kiosk-calendar-actions"><div className="kiosk-view-toggle" role="group" aria-label="Calendar view">{["week", "month"].map(view => <button key={view} aria-pressed={calendarView === view} onClick={() => setCalendarView(view)}>{view === "week" ? "Week" : "Month"}</button>)}</div><div className="kiosk-month-controls"><button className="kiosk-icon" aria-label={`Previous ${calendarView}`} onClick={() => navigate(-1)}><ChevronLeft /></button><button className="kiosk-control" onClick={() => setAnchor(today)}>Today</button><button className="kiosk-icon" aria-label={`Next ${calendarView}`} onClick={() => navigate(1)}><ChevronRight /></button></div></div>
        </header>
        {calendarView === "week" ? <WeekTimeline anchor={anchor} today={today} events={events.filter(r => !member || r.data.member === member || r.data.member === "Family")} memberStyle={memberStyle} onSelectDay={day => { setAnchor(day); setDialog({ day }); }} /> : <>
        <div className="kiosk-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <span key={d}>{d}</span>)}</div>
        <div className="kiosk-month-grid" style={{ "--week-count": days.length / 7 }}>
          {days.map(day => {
            const plans = events.filter(r => r.data.date === day && (!member || r.data.member === member || r.data.member === "Family"))
              .sort((a, b) => (a.data.time || "").localeCompare(b.data.time || ""));
            return <button key={day} className={`kiosk-date ${day.startsWith(month) ? "" : "outside"}`} aria-current={day === today ? "date" : undefined} aria-label={`${new Date(`${day}T12:00:00`).toLocaleDateString([], { month: "long", day: "numeric" })}, ${plans.length} events`} onClick={() => { setAnchor(day); setDialog({ day }); }}>
              <span className="kiosk-date-number">{Number(day.slice(-2))}</span>
              <span className="kiosk-day-layers">{[...new Set(plans.map(r => categoryInfo(r.data.category).key))].filter(key => key !== "general").map(key => { const info = categoryInfo(key); return <span key={key} role="img" aria-label={info.label} title={info.label}>{info.icon}</span>; })}</span>
              {plans.slice(0, 2).map(r => <span key={r.id} className="kiosk-event" style={memberStyle(r.data.member)}><small>{r.data.time || "All day"}</small><strong>{categoryInfo(r.data.category).icon && <span aria-hidden="true">{categoryInfo(r.data.category).icon} </span>}{r.data.title}{videoSource(r.data.video_url) && <Play size={10} aria-label="Video attached" />}</strong></span>)}
              {plans.length > 2 && <span className="kiosk-more">+{plans.length - 2} more</span>}
            </button>;
          })}
        </div>
        </>}
        <footer className="kiosk-calendar-footer"><span><Bell size={15} /> Tap a date to see all events</span><time>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></footer>
      </section>
      <aside className="kiosk-activities">
        <section><h2><CheckCircle size={19} /> Today’s chores</h2><ul>{chores.filter(r => !isBounty(r.data)).map(choreCard)}</ul>{!chores.some(r => !isBounty(r.data)) && <p className="kiosk-empty">No chores scheduled today.</p>}</section>
        <section className="kiosk-dinner"><h2><Utensils size={19} /> Dinner</h2>{dinners.length ? dinners.map(r => <article key={r.id} className="kiosk-meal"><strong>{r.data.title}</strong>{r.data.notes && <p>{r.data.notes}</p>}{videoSource(r.data.video_url) ? <button className="kiosk-control kiosk-play" onClick={() => playVideo(r)}><Play size={17} /> Play recipe</button> : r.data.video_url ? <p className="kiosk-hint">This video link is unsupported. Ask a parent to update it.</p> : null}</article>) : <p className="kiosk-empty">No dinner planned for today.</p>}</section>
        <section><h2>Bounty board</h2><p className="kiosk-hint">Ask a parent to assign a task.</p><ul>{chores.filter(r => isBounty(r.data) && (r.data.status || "open") === "open").map(choreCard)}</ul>{!chores.some(r => isBounty(r.data) && (r.data.status || "open") === "open") && <p className="kiosk-empty">No open bounties today.</p>}</section>
        <section><h2><MapPin size={19} /> Upcoming vacations</h2>{trips.map(r => <article key={r.id} className="kiosk-trip"><strong>{r.data.title}</strong><p>{r.data.location}</p><time>{r.data.date} {r.data.end && `— ${r.data.end}`}</time></article>)}{!trips.length && <p className="kiosk-empty">Your next adventure starts here.</p>}</section>
      </aside>
    </div>
    {dialog && <div className="kiosk-modal-backdrop"><section ref={dialogRef} className="kiosk-dialog" role="dialog" aria-modal="true" aria-labelledby="kiosk-dialog-title">
      <header><h2 id="kiosk-dialog-title">{dialog.setup ? "Samsung kiosk setup" : dialog.alert ? "Starting now" : new Date(`${selectedDay}T12:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</h2><button className="kiosk-icon" aria-label="Close dialog" onClick={closeDialog}><X /></button></header>
      {dialog.setup ? <div className="kiosk-setup">
        <p>The app keeps the live calendar visible and requires your Parent PIN for management. Android device lockdown needs app pinning on your tablet.</p>
        <ol><li>Sign in with a parent account on the shared tablet. Children can use its read-only calendar without knowing the Parent PIN.</li><li>Install this calendar with your browser’s <strong>Install app / Add to Home screen</strong> option, then open its icon.</li><li>In Samsung Settings, find <strong>Pin windows / Pin app</strong> under Security and privacy → More security settings (older versions: Biometrics and security → Other security settings).</li><li>Enable <strong>Use screen lock type to unpin / Ask for PIN before unpinning</strong>. Use a device PIN children do not know.</li><li>Open the calendar, open Recent apps, tap the calendar icon above its card, then <strong>Pin this app</strong>.</li></ol>
        <p className="kiosk-notice">App pinning has not been verified by this website. Test that Home and Recents cannot leave the app and that unpinning requires your device PIN. Re-pin after a tablet restart if needed.</p>
        <p>To change family plans or stop calendar kiosk mode, tap Parent portal and enter your Parent PIN. The device PIN separately controls Android unpinning.</p>
        {!kioskEnabled && ["admin", "super_admin"].includes(profile?.role) && <button className="kiosk-control kiosk-start" onClick={() => { closeDialog(); onStartKiosk?.(); }}>Start Kiosk Mode</button>}
      </div> : <>{dayEvents.length ? dayEvents.map(r => <article className="kiosk-event-detail" key={r.id} style={memberStyle(r.data.member)}><time>{r.data.time || "All day"}</time><h3>{r.data.title}</h3><p>{r.data.member}</p>{r.data.location && <p><MapPin size={16} /> {r.data.location}</p>}{r.data.notes && <p>{r.data.notes}</p>}{categoryInfo(r.data.category).icon && <p>{categoryInfo(r.data.category).icon} {categoryInfo(r.data.category).label}</p>}{videoSource(r.data.video_url) ? <button className="kiosk-control kiosk-play" onClick={() => playVideo(r)}><Play size={17} /> Play event video</button> : r.data.video_url ? <p className="kiosk-hint">Unsupported video link. Ask a parent to update it.</p> : null}</article>) : <p>No events on this date.</p>}</>}
    </section></div>}
    <AnimatePresence key={familyId || "sample"} mode="wait">{activeVideo && <KioskVideo key={`${activeVideo.id}-${activeVideo.url}`} video={activeVideo} onClose={closeVideo} hidden={Boolean(dialog || portalOpen)} />}</AnimatePresence>
    {idle && !kioskEnabled && !activeVideo && !portalOpen && <button className="kiosk-screensaver" onClick={wake} onKeyDown={e => { if (e.key !== "Tab") { e.preventDefault(); wake(); } }} autoFocus aria-label="Wake family calendar">
      <div className="kiosk-clock-glass"><p className="kiosk-eyebrow">ANDERSON FAMILY HUB</p><time className="kiosk-idle-time">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><p>{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p><div className="kiosk-up-next"><h2>Up next</h2>{upcoming.length ? upcoming.map(r => <div key={r.id}><strong>{r.data.title}</strong><span>{r.data.date === today ? "Today" : r.data.date} · {r.data.time || "All day"}</span></div>) : <p>No upcoming plans.</p>}</div><small>Tap anywhere or press a key to wake</small></div>
    </button>}
  </main>;
}
