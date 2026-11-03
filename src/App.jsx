import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'anderson-family-calendar-events-v1';
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const colorNames = ['purple', 'green', 'orange', 'blue'];

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeStarterEvents() {
  const today = new Date();
  const day = (offset) => {
    const result = new Date(today.getFullYear(), today.getMonth(), Math.min(today.getDate() + offset, 27));
    return dateKey(result);
  };
  return [
    { id: 'starter-1', date: day(1), title: 'Emma · Soccer practice', time: '3:30 PM', place: 'Maple Park', color: 'green' },
    { id: 'starter-2', date: day(2), title: 'Jack · Library books due', time: 'All day', place: 'Anderson Elementary', color: 'blue' },
    { id: 'starter-3', date: day(3), title: 'Emma · Field Day', time: '9:00 AM', place: 'Anderson Elementary', color: 'orange' },
    { id: 'starter-4', date: day(6), title: 'Family · Dentist', time: '2:00 PM', place: 'Oak Street Dental', color: 'purple' },
    { id: 'starter-5', date: day(9), title: 'Family · Summer picnic', time: '12:00 PM', place: 'Riverside Park', color: 'orange' },
    { id: 'starter-6', date: day(12), title: 'Emma · Art club', time: '3:15 PM', place: 'Room 8', color: 'purple' },
  ];
}

function readEvents() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // Continue with starter events if local storage is unavailable or invalid.
  }
  return makeStarterEvents();
}

function formatMonth(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

function formatTime(time) {
  if (!time || time === 'All day') return time || 'All day';
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function Avatar({ initials, tone = '' }) {
  return <span className={`avatar ${tone}`}>{initials}</span>;
}

function Sidebar({ page, onNavigate }) {
  const links = [
    { id: 'calendar', icon: '▦', label: 'Family calendar' },
    { id: 'updates', icon: '◉', label: 'School updates' },
    { id: 'children', icon: '♡', label: 'My children' },
  ];
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand"><span className="brand-mark">✦</span><span>Anderson Family</span></div>
      <p className="section-label">Workspace</p>
      <nav className="nav">
        {links.map((link) => (
          <button key={link.id} className={page === link.id ? 'active' : ''} onClick={() => onNavigate(link.id)}>
            <span className="nav-icon" aria-hidden="true">{link.icon}</span>{link.label}
          </button>
        ))}
      </nav>
      <div className="children-block">
        <p className="section-label">Children</p>
        <div className="child"><Avatar initials="EA" />Emma Anderson</div>
        <div className="child"><Avatar initials="JA" tone="mint" />Jack Anderson</div>
      </div>
      <div className="sidebar-bottom">A little more organized,<br />a lot more connected. <span aria-hidden="true">♡</span></div>
    </aside>
  );
}

function EventModal({ onClose, onSave, initialDate }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState('15:30');
  const [child, setChild] = useState('Family');
  const [place, setPlace] = useState('');

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function submit(event) {
    event.preventDefault();
    onSave({
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      date,
      title: `${child} · ${title.trim()}`,
      time: formatTime(time),
      place: place.trim() || 'Family calendar',
      color: child === 'Emma' ? 'purple' : child === 'Jack' ? 'green' : 'blue',
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head"><h2 id="modal-title">Add a family event</h2><button className="close" onClick={onClose} aria-label="Close">×</button></div>
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="event-title">Event name</label><input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="e.g. Soccer practice" /></div>
          <div className="form-row">
            <div className="field"><label htmlFor="event-date">Date</label><input id="event-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
            <div className="field"><label htmlFor="event-time">Time</label><input id="event-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <div className="field"><label htmlFor="event-child">For</label><select id="event-child" value={child} onChange={(e) => setChild(e.target.value)}><option>Family</option><option>Emma</option><option>Jack</option></select></div>
          <div className="field"><label htmlFor="event-place">Location <span className="optional">(optional)</span></label><input id="event-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Where is it?" /></div>
          <div className="form-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="submit" className="primary">Save event</button></div>
        </form>
      </section>
    </div>
  );
}

function Calendar({ events, displayed, setDisplayed, view, setView, onAddEvent, onToast }) {
  const calendarDays = useMemo(() => {
    const year = displayed.getFullYear();
    const month = displayed.getMonth();
    let start;
    let count;
    if (view === 'week') {
      start = new Date(year, month, displayed.getDate() - displayed.getDay());
      count = 7;
    } else {
      start = new Date(year, month, 1 - new Date(year, month, 1).getDay());
      count = 42;
    }
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [displayed, view]);

  const monthEvents = events.filter((event) => event.date.startsWith(`${displayed.getFullYear()}-${String(displayed.getMonth() + 1).padStart(2, '0')}`));
  const agenda = [...monthEvents].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

  function changeMonth(delta) {
    setDisplayed((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <>
      <div className="page-heading">
        <div><h1>Family calendar</h1><div className="subtitle">Everyone's plans, all in one place.</div></div>
        <button className="primary" onClick={onAddEvent}><span className="plus">＋</span>Add event</button>
      </div>
      <div className="welcome"><div><h2>Good morning, Sarah! <span aria-hidden="true">☀️</span></h2><p>You have <strong>{agenda.length} things</strong> coming up for the family this month.</p></div><div className="welcome-art" aria-hidden="true">🗓️</div></div>
      <div className="layout">
        <section className="card calendar-card" aria-label="Family calendar">
          <div className="calendar-toolbar">
            <div className="toolbar-left"><div className="month-title">{formatMonth(displayed)}</div><div className="arrows"><button onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button><button onClick={() => changeMonth(1)} aria-label="Next month">›</button></div><button className="today-btn" onClick={() => { setDisplayed(new Date()); setView('month'); }}>Today</button></div>
            <div className="toolbar-right"><select className="view-select" aria-label="Calendar view" value={view} onChange={(e) => setView(e.target.value)}><option value="month">Month</option><option value="week">Week</option></select></div>
          </div>
          <div className="week calendar-grid">
            {weekdays.map((day) => <div key={day} className="day-head">{day}</div>)}
            {calendarDays.map((date) => {
              const key = dateKey(date);
              const dayEvents = events.filter((event) => event.date === key);
              const isToday = key === dateKey(new Date());
              return <div key={key} className={`day ${date.getMonth() !== displayed.getMonth() ? 'outside' : ''} ${isToday ? 'today' : ''}`}>
                <div className="day-num">{date.getDate()}</div>
                {dayEvents.map((event) => <button key={event.id} className={`event ${event.color}`} title={`${event.time} · ${event.place}`} onClick={() => onToast(`${event.title} · ${event.time} at ${event.place}`)}>{event.title}</button>)}
              </div>;
            })}
          </div>
        </section>
        <aside className="right-column">
          <section className="card side-card"><div className="side-title"><h3>Coming up</h3><button className="text-button" onClick={() => setView('week')}>See week</button></div><div className="agenda-date">Plans for {formatMonth(displayed)}</div>
            {agenda.length ? agenda.map((event) => <div className="agenda-item" key={event.id}><div className="agenda-time">{new Date(`${event.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}<br />{event.time}</div><div className={`agenda-line ${event.color}`} /><div><div className="agenda-name">{event.title}</div><div className="agenda-meta">{event.place}</div></div></div>) : <p className="empty-message">No events yet. Add one to get started.</p>}
          </section>
          <section className="card side-card"><div className="side-title"><h3>School updates</h3><button className="text-button" onClick={() => onToast('Open School updates from the left navigation.')}>View all</button></div>
            <article className="announcement"><div className="announce-top"><span className="announce-title">Field Day is coming!</span><span className="tag">Emma's class</span></div><p>Remember to pack a water bottle and wear comfy shoes on Friday.</p><small>Today · Anderson Elementary</small></article>
            <article className="announcement"><div className="announce-top"><span className="announce-title">Library books due</span><span className="tag tag-blue">Reminder</span></div><p>Jack's library books are due back by Thursday.</p><small>Yesterday · Room 12</small></article>
          </section>
        </aside>
      </div>
    </>
  );
}

function UpdatesPage() {
  const updates = [
    ['Emma\'s class', 'Field Day is coming!', 'Field Day is this Friday. Please send a water bottle, sunscreen, and a change of clothes. Students should wear comfortable shoes.', 'Today · Anderson Elementary', ''],
    ['Reminder', 'Library books due', 'Jack\'s library books are due back by Thursday. Return them to the classroom library bin.', 'Yesterday · Room 12', 'tag-blue'],
    ['School news', 'Summer concert schedule', 'The end-of-year music concert begins at 6:00 PM in the school auditorium. Families are welcome.', 'This week · Anderson Elementary', 'tag-green'],
    ['Action needed', 'Update emergency contacts', 'Please review your family contact information before the end of the school year.', 'This week · Parent office', 'tag-orange'],
  ];
  return <section className="card portal-panel"><h1>School updates</h1><p>News and reminders from your children's school communities.</p><div className="portal-grid">{updates.map(([tag, title, body, date, tone]) => <article className="portal-tile" key={title}><span className={`tag ${tone}`}>{tag}</span><h3>{title}</h3><p>{body}</p><small>{date}</small></article>)}</div></section>;
}

function ChildrenPage() {
  const children = [
    { initials: 'EA', name: 'Emma Anderson', grade: 'Grade 3 · Room 8', teacher: 'Ms. Parker', next: 'Field Day, Friday', tone: '' },
    { initials: 'JA', name: 'Jack Anderson', grade: 'Grade 1 · Room 12', teacher: 'Mr. Lewis', next: 'Library books due, Thursday', tone: 'mint' },
  ];
  return <section className="card portal-panel"><h1>My children</h1><p>Keep track of school details and upcoming activities.</p><div className="portal-grid">{children.map((child) => <article className="portal-tile child-tile" key={child.initials}><div className="child-heading"><Avatar initials={child.initials} tone={child.tone} /><div><h3>{child.name}</h3><p>{child.grade}</p></div></div><p><strong>Teacher:</strong> {child.teacher}<br /><strong>School:</strong> Anderson Elementary<br /><strong>Next up:</strong> {child.next}</p></article>)}</div></section>;
}

export default function App() {
  const [page, setPage] = useState('calendar');
  const [displayed, setDisplayed] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [view, setView] = useState('month');
  const [events, setEvents] = useState(readEvents);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch { /* Storage is optional. */ }
  }, [events]);
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const pageLabels = { calendar: 'Family calendar', updates: 'School updates', children: 'My children' };
  function saveEvent(event) {
    setEvents((current) => [...current, event]);
    setDisplayed(new Date(`${event.date}T12:00:00`));
    setModalOpen(false);
    setToast('Event added to your family calendar.');
  }

  return (
    <div className="app">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="main">
        <header className="topbar"><div className="crumb">Anderson Family <span aria-hidden="true">/</span> <strong>{pageLabels[page]}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Notifications" onClick={() => { setPage('updates'); setToast('You are all caught up on family updates.'); }}>♧<span className="dot" /></button><div className="profile"><Avatar initials="SA" tone="peach" /><span className="profile-name">Sarah Anderson</span></div></div></header>
        {page === 'calendar' && <Calendar events={events} displayed={displayed} setDisplayed={setDisplayed} view={view} setView={setView} onAddEvent={() => setModalOpen(true)} onToast={setToast} />}
        {page === 'updates' && <UpdatesPage />}
        {page === 'children' && <ChildrenPage />}
      </main>
      {modalOpen && <EventModal initialDate={dateKey(displayed)} onClose={() => setModalOpen(false)} onSave={saveEvent} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
