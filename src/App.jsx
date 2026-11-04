import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, GraduationCap,
  ImagePlus, ListTodo, LockKeyhole, LogOut, Plane, Plus, Settings, Trash2, UserRound, X,
} from 'lucide-react';

const members = [
  { id: 'dad', name: 'Dad', role: 'Parent', initials: 'D', tone: 'blue' },
  { id: 'mom', name: 'Mom', role: 'Parent', initials: 'M', tone: 'pink' },
  { id: 'mia', name: 'Mia', role: 'Child', initials: 'M', tone: 'purple' },
];
const colors = ['blue', 'pink', 'purple'];
const todayKey = () => formatDate(new Date());
function formatDate(date) {
  const year = date.getFullYear();
  return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function offsetDate(offset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return formatDate(date);
}
function makeId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`; }
function readStore(key, fallback) {
  try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; } catch { return fallback; }
}
function useStored(key, fallback) {
  const [value, setValue] = useState(() => readStore(key, fallback));
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Local storage is optional. */ } }, [key, value]);
  return [value, setValue];
}
const starterEvents = [
  { id: 'e1', date: offsetDate(0), title: 'Soccer practice', memberId: 'mia', time: '3:30 PM' },
  { id: 'e2', date: offsetDate(0), title: 'Dentist appointment', memberId: 'dad', time: '5:00 PM' },
  { id: 'e3', date: offsetDate(1), title: 'Library books due', memberId: 'mia', time: 'All day' },
  { id: 'e4', date: offsetDate(3), title: 'Family movie night', memberId: 'mom', time: '6:30 PM' },
  { id: 'e5', date: offsetDate(6), title: 'Piano lesson', memberId: 'mia', time: '4:00 PM' },
];
const starterChores = [
  { id: 'c1', date: offsetDate(0), title: 'Take out the recycling', memberId: 'dad', completed: false },
  { id: 'c2', date: offsetDate(0), title: 'Empty the dishwasher', memberId: 'mia', completed: true },
  { id: 'c3', date: offsetDate(0), title: 'Pack field day bag', memberId: 'mom', completed: false },
];
const starterVacations = [
  { id: 'v1', title: 'Summer by the sea', date: 'June 10 – 17', image: 'beach' },
  { id: 'v2', title: 'Mountain weekend', date: 'December 20 – 27', image: 'mountain' },
];
const starterGrades = [
  { id: 'g1', memberId: 'mia', subject: 'Math', grade: 'A−' },
  { id: 'g2', memberId: 'mia', subject: 'Science', grade: 'B+' },
  { id: 'g3', memberId: 'mia', subject: 'English', grade: 'A' },
  { id: 'g4', memberId: 'mia', subject: 'History', grade: 'A' },
];
const holidays = [
  ['2026-01-01', "New Year's Day"], ['2026-01-19', 'Martin Luther King Jr. Day'],
  ['2026-02-16', "Presidents' Day"], ['2026-05-25', 'Memorial Day'],
  ['2026-06-19', 'Juneteenth'], ['2026-07-04', 'Independence Day'],
  ['2026-09-07', 'Labor Day'], ['2026-11-26', 'Thanksgiving'], ['2026-12-25', 'Christmas Day'],
].map(([date, title], index) => ({ id: `holiday-${index}`, date, title, holiday: true }));

function Avatar({ member, size = '' }) {
  return <span className={`avatar ${member?.tone || 'purple'} ${size}`} aria-label={member?.name}>{member?.initials || '?'}</span>;
}
function SectionTitle({ icon: Icon, children, action, onAction }) {
  return <div className="section-title"><h2>{Icon && <Icon size={16} />} {children}</h2>{action && <button className="text-action" onClick={onAction}>{action} <span>→</span></button>}</div>;
}
function EventDialog({ initialDate, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState('15:30');
  const [memberId, setMemberId] = useState('mia');
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  return <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><motion.section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
    <div className="dialog-heading"><div><span className="eyebrow">A LITTLE PLAN</span><h2 id="dialog-title">Add to the calendar</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ id: makeId(), date, title: title.trim(), time: time ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'All day', memberId }); }}>
      <label className="form-field">What’s happening?<input required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Soccer practice, dentist…" /></label>
      <div className="form-row"><label className="form-field">Date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="form-field">Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div>
      <label className="form-field">Who’s it for?<select value={memberId} onChange={(event) => setMemberId(event.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary">Save event</button></div>
    </form>
  </motion.section></div>;
}
function AddLine({ placeholder, onAdd }) {
  const [value, setValue] = useState('');
  return <form className="add-line" onSubmit={(event) => { event.preventDefault(); if (!value.trim()) return; onAdd(value.trim()); setValue(''); }}><input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} /><button aria-label="Add item"><Plus size={17} /></button></form>;
}
function CalendarView({ currentDate, setCurrentDate, selectedDate, setSelectedDate, events, onAdd }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  }, [year, month]);
  const dailyEvents = [...events, ...holidays].filter((event) => event.date === selectedDate);
  const changeMonth = (amount) => setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() + amount, 1));
  return <>
    <div className="calendar-toolbar"><div><span className="eyebrow">YOUR FAMILY, IN SYNC</span><h1>{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h1></div><div className="toolbar-actions"><button className="button button-light" onClick={() => { const now = new Date(); setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(todayKey()); }}>Today</button><button className="round-button" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={19} /></button><button className="round-button" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={19} /></button><button className="button button-primary add-event" onClick={onAdd}><Plus size={16} /> Add event</button></div></div>
    <div className="calendar-grid">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div className="weekday" key={day}>{day}</div>)}{days.map((day) => {
      const key = formatDate(day);
      const items = [...events, ...holidays].filter((event) => event.date === key);
      return <button key={key} className={`calendar-day ${day.getMonth() !== month ? 'outside' : ''} ${key === selectedDate ? 'selected' : ''} ${key === todayKey() ? 'is-today' : ''}`} onClick={() => setSelectedDate(key)}><span className="day-number">{day.getDate()}</span><span className="day-events">{items.slice(0, 2).map((event) => <span key={event.id} className={`day-event ${event.holiday ? 'holiday' : members.find((member) => member.id === event.memberId)?.tone || 'blue'}`}>{event.title}</span>)}{items.length > 2 && <small>+{items.length - 2} more</small>}</span></button>;
    })}</div>
    <div className="selected-agenda"><div className="agenda-heading"><div><span className="eyebrow">SELECTED DAY</span><h2>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2></div><button className="button button-soft" onClick={onAdd}><Plus size={15} /> Add plan</button></div>{dailyEvents.length ? dailyEvents.map((event) => <div className="agenda-row" key={event.id}><Clock3 size={15} /><time>{event.time || 'All day'}</time><strong>{event.title}</strong><span>{event.holiday ? 'Family' : members.find((member) => member.id === event.memberId)?.name}</span></div>) : <p className="quiet-empty">A little breathing room. No plans on this day.</p>}</div>
  </>;
}
function Portal({ active, setActive, close, chores, setChores, vacations, setVacations, grades, setGrades, backgrounds, setBackgrounds }) {
  const [task, setTask] = useState('');
  const [vacation, setVacation] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [image, setImage] = useState('');
  const tabs = [{ id: 'tasks', label: 'Manage tasks', icon: ListTodo }, { id: 'vacations', label: 'Vacations', icon: Plane }, { id: 'grades', label: 'School & grades', icon: GraduationCap }, { id: 'photos', label: 'Screensaver photos', icon: ImagePlus }];
  return <div className="portal-screen"><aside className="portal-sidebar"><div className="portal-brand"><span className="brand-icon"><Settings size={19} /></span><span><b>Parent space</b><small><LockKeyhole size={11} /> Family organizer</small></span></div><p className="eyebrow">FAMILY SETTINGS</p>{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={`portal-tab ${active === id ? 'active' : ''}`} onClick={() => setActive(id)}><Icon size={17} />{label}</button>)}<button className="portal-exit" onClick={close}><LogOut size={17} /> Back to calendar</button></aside><main className="portal-content"><div className="demo-warning"><LockKeyhole size={15} /><span><strong>Family space preview.</strong> This browser-only demo has no account authentication or private data protection.</span></div>
    {active === 'tasks' && <><div className="portal-page-title"><span className="eyebrow">THE LITTLE THINGS</span><h1>Manage family tasks</h1><p>Share the everyday jobs and celebrate getting them done.</p></div><form className="portal-add" onSubmit={(event) => { event.preventDefault(); if (task.trim()) { setChores((current) => [...current, { id: makeId(), title: task.trim(), date: todayKey(), memberId: 'mia', completed: false }]); setTask(''); } }}><input value={task} onChange={(event) => setTask(event.target.value)} placeholder="Add a task for the family…" /><button className="button button-primary"><Plus size={15} /> Add task</button></form><div className="portal-list">{chores.map((chore) => <div className="portal-list-row" key={chore.id}><div><strong>{chore.title}</strong><small>{chore.date} · {members.find((member) => member.id === chore.memberId)?.name || 'Family'}</small></div><button className="delete-button" onClick={() => setChores((current) => current.filter((item) => item.id !== chore.id))} aria-label={`Delete ${chore.title}`}><Trash2 size={17} /></button></div>)}</div></>}
    {active === 'vacations' && <><div className="portal-page-title"><span className="eyebrow">MAKE MEMORIES</span><h1>Upcoming vacations</h1><p>Dream it up, get it on the family wall.</p></div><AddLine placeholder="Add a trip idea…" onAdd={(title) => setVacations((current) => [...current, { id: makeId(), title, date: 'Dates to come', image: 'beach' }])} /><div className="portal-list">{vacations.map((trip) => <div className="portal-list-row" key={trip.id}><div><strong>{trip.title}</strong><small>{trip.date}</small></div><button className="delete-button" onClick={() => setVacations((current) => current.filter((item) => item.id !== trip.id))} aria-label={`Delete ${trip.title}`}><Trash2 size={17} /></button></div>)}</div></>}
    {active === 'grades' && <><div className="portal-page-title"><span className="eyebrow">CHEERING YOU ON</span><h1>School & grades</h1><p>A little snapshot of Mia’s school wins.</p></div><form className="portal-add grade-form" onSubmit={(event) => { event.preventDefault(); if (subject.trim() && grade.trim()) { setGrades((current) => [...current, { id: makeId(), memberId: 'mia', subject: subject.trim(), grade: grade.trim() }]); setSubject(''); setGrade(''); } }}><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" /><input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="Grade" /><button className="button button-primary"><Plus size={15} /> Add</button></form><div className="grade-grid">{grades.map((item) => <div className="grade-card" key={item.id}><span>{item.subject}</span><strong>{item.grade}</strong><button className="delete-button" onClick={() => setGrades((current) => current.filter((gradeItem) => gradeItem.id !== item.id))} aria-label={`Delete ${item.subject}`}><Trash2 size={15} /></button></div>)}</div></>}
    {active === 'photos' && <><div className="portal-page-title"><span className="eyebrow">A LITTLE WINDOW</span><h1>Screensaver photos</h1><p>Add a photo URL for the family wall screensaver.</p></div><form className="portal-add" onSubmit={(event) => { event.preventDefault(); if (image.trim()) { setBackgrounds((current) => [...current, image.trim()]); setImage(''); } }}><input type="url" value={image} onChange={(event) => setImage(event.target.value)} placeholder="https://example.com/photo.jpg" /><button className="button button-primary"><Plus size={15} /> Add photo</button></form><div className="photo-list">{backgrounds.map((url, index) => <div className="photo-card" key={`${url}-${index}`}><img src={url} alt="Family screensaver" /><button className="delete-button" onClick={() => setBackgrounds((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove photo"><Trash2 size={16} /></button></div>)}</div></>}
    </main></div>;
}
function App() {
  const [events, setEvents] = useStored('family-wall-events-v1', starterEvents);
  const [chores, setChores] = useStored('family-wall-chores-v1', starterChores);
  const [vacations, setVacations] = useStored('family-wall-vacations-v1', starterVacations);
  const [grades, setGrades] = useStored('family-wall-grades-v1', starterGrades);
  const [backgrounds, setBackgrounds] = useStored('family-wall-backgrounds-v1', []);
  const [currentDate, setCurrentDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalTab, setPortalTab] = useState('tasks');
  const [screensaver, setScreensaver] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState('');
  useEffect(() => {
    let idle;
    const reset = () => { setScreensaver(false); window.clearTimeout(idle); idle = window.setTimeout(() => setScreensaver(true), 120000); };
    const activity = ['pointerdown', 'pointermove', 'keydown', 'touchstart'];
    activity.forEach((name) => window.addEventListener(name, reset, { passive: true }));
    reset();
    return () => { window.clearTimeout(idle); activity.forEach((name) => window.removeEventListener(name, reset)); };
  }, []);
  useEffect(() => { const interval = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(interval); }, []);
  useEffect(() => { if (!screensaver || !backgrounds.length) return undefined; const interval = window.setInterval(() => setBgIndex((index) => (index + 1) % backgrounds.length), 15000); return () => window.clearInterval(interval); }, [screensaver, backgrounds.length]);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer); }, [toast]);
  const selectedChores = chores.filter((chore) => chore.date === selectedDate);
  function saveEvent(event) { setEvents((current) => [...current, event]); setDialogOpen(false); setToast('Added to your family calendar!'); }
  function toggleChore(id) { setChores((current) => current.map((chore) => chore.id === id ? { ...chore, completed: !chore.completed } : chore)); }
  return <div className="wall-app">
    <aside className="left-rail"><button className="logo-lockup" onClick={() => { setPortalOpen(false); }}><span className="logo-mark"><CalendarDays size={21} /></span><span>Family<span>Wall</span><small>YOUR FAMILY, IN SYNC</small></span></button>
      <section className="rail-section"><SectionTitle icon={UserRound}>Family status</SectionTitle><div className="member-grid">{members.map((member) => <div className="member-tile" key={member.id}><Avatar member={member} size="large" /><strong>{member.name}</strong><small>{member.role}</small></div>)}</div></section>
      <section className="rail-section grade-section"><SectionTitle icon={GraduationCap}>Mia’s school</SectionTitle><div className="grades-card">{grades.slice(0, 4).map((item) => <div className="grade-row" key={item.id}><span>{item.subject}</span><strong>{item.grade}</strong></div>)}{!grades.length && <p className="empty-note">No grades added yet.</p>}</div></section>
      <div className="rail-bottom"><span className="mini-avatar">F</span><span><strong>Anderson family</strong><small>Family wall</small></span><button aria-label="Open parent space" onClick={() => setPortalOpen(true)}><Settings size={17} /></button></div>
    </aside>
    <main className="center-column"><header className="mobile-top"><span className="logo-mark"><CalendarDays size={19} /></span><strong>FamilyWall</strong><button onClick={() => setPortalOpen(true)} aria-label="Parent space"><Settings size={20} /></button></header><div className="calendar-card"><CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} selectedDate={selectedDate} setSelectedDate={setSelectedDate} events={events} onAdd={() => setDialogOpen(true)} /></div></main>
    <aside className="right-rail"><button className="primary-add" onClick={() => setDialogOpen(true)}><Plus size={19} /> Add new</button>
      <section className="rail-section vacation-section"><SectionTitle icon={Plane} action="Manage" onAction={() => { setPortalTab('vacations'); setPortalOpen(true); }}>Upcoming vacations</SectionTitle><div className="vacation-list">{vacations.slice(0, 3).map((trip) => <div className={`vacation-card ${trip.image === 'mountain' ? 'mountain' : 'beach'}`} key={trip.id}><div className="vacation-overlay" /><div className="vacation-copy"><strong>{trip.title}</strong><span><Clock3 size={12} /> {trip.date}</span></div><span className="vacation-sun">✦</span></div>)}{!vacations.length && <p className="empty-note">Add a trip idea in Parent space.</p>}</div></section>
      <section className="rail-section chores-section"><SectionTitle icon={ListTodo}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })} tasks</SectionTitle><p className="selected-date-label">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p><div className="chore-card">{selectedChores.length ? selectedChores.map((chore) => <button className={`chore-row ${chore.completed ? 'done' : ''}`} key={chore.id} onClick={() => toggleChore(chore.id)}><span className="check-circle">{chore.completed && <Check size={13} />}</span><span className="chore-title">{chore.title}<small>{members.find((member) => member.id === chore.memberId)?.name}</small></span><Avatar member={members.find((member) => member.id === chore.memberId)} /></button>) : <p className="empty-note">All caught up! Add a task in Parent space.</p>}</div><button className="manage-tasks" onClick={() => { setPortalTab('tasks'); setPortalOpen(true); }}>Manage family tasks <ChevronRight size={15} /></button></section>
      <section className="family-note"><Award size={17} /><span>Every little thing you do together makes a big difference.</span></section>
    </aside>
    {dialogOpen && <EventDialog initialDate={selectedDate} onClose={() => setDialogOpen(false)} onSave={saveEvent} />}
    {portalOpen && <Portal active={portalTab} setActive={setPortalTab} close={() => setPortalOpen(false)} chores={chores} setChores={setChores} vacations={vacations} setVacations={setVacations} grades={grades} setGrades={setGrades} backgrounds={backgrounds} setBackgrounds={setBackgrounds} />}
    <AnimatePresence>{screensaver && !portalOpen && <motion.div className="screensaver" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setScreensaver(false)}>{backgrounds.length > 0 ? <img src={backgrounds[bgIndex % backgrounds.length]} alt="Family screensaver background" /> : <div className="screensaver-gradient" />}<div className="screen-shade" /><motion.div className="clock-widget" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}><span className="eyebrow">THE ANDERSONS</span><strong>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong><h2>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</h2><div className="up-next"><span><Clock3 size={15} /> UP NEXT</span>{events.filter((event) => event.date >= todayKey()).slice(0, 3).map((event) => <div key={event.id}><i />{event.title}<small>{event.date === todayKey() ? 'Today' : new Date(`${event.date}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}</small></div>)}{!events.length && <p>Nothing on the calendar just yet.</p>}</div><small className="screen-hint">Tap anywhere to return</small></motion.div></motion.div>}</AnimatePresence>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

export default App;
