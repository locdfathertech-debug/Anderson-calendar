import { useEffect, useMemo, useState } from 'react';

const STORE = {
  events: 'anderson-organizer-events-v2',
  tasks: 'anderson-organizer-tasks-v1',
  groceries: 'anderson-organizer-groceries-v1',
  expenses: 'anderson-organizer-expenses-v1',
};
const navItems = [
  { id: 'home', label: 'Today', icon: '⌂' },
  { id: 'calendar', label: 'Calendar', icon: '▦' },
  { id: 'tasks', label: 'To-dos', icon: '✓' },
  { id: 'groceries', label: 'Groceries', icon: '▤' },
  { id: 'budget', label: 'Budget', icon: '$' },
];
const people = [
  { id: 'sarah', name: 'Sarah', fullName: 'Sarah Anderson', initials: 'SA', color: 'lilac' },
  { id: 'michael', name: 'Michael', fullName: 'Michael Anderson', initials: 'MA', color: 'peach' },
  { id: 'emma', name: 'Emma', fullName: 'Emma Anderson', initials: 'EA', color: 'mint' },
  { id: 'jack', name: 'Jack', fullName: 'Jack Anderson', initials: 'JA', color: 'sky' },
];
const initialTasks = [
  { id: 't1', title: 'Pack Emma’s field day bag', person: 'Sarah', time: 'Before 8:00 AM', done: false },
  { id: 't2', title: 'Pick up library books', person: 'Michael', time: 'After school', done: false },
  { id: 't3', title: 'Water the garden', person: 'Emma', time: 'Anytime today', done: true },
];
const initialGroceries = [
  { id: 'g1', name: 'Whole milk', amount: '1 gallon', checked: false },
  { id: 'g2', name: 'Strawberries', amount: '1 box', checked: false },
  { id: 'g3', name: 'Lunchbox snacks', amount: '1 pack', checked: true },
  { id: 'g4', name: 'Pasta', amount: '2 boxes', checked: false },
];
const initialEvents = [
  { id: 'e1', offset: 0, time: '8:15 AM', title: 'School drop-off', person: 'Sarah', place: 'Anderson Elementary', color: 'purple' },
  { id: 'e2', offset: 0, time: '3:30 PM', title: 'Soccer practice', person: 'Emma', place: 'Maple Park', color: 'green' },
  { id: 'e3', offset: 0, time: '5:00 PM', title: 'Pick up library books', person: 'Michael', place: 'Anderson Library', color: 'orange' },
  { id: 'e4', offset: 1, time: '9:00 AM', title: 'Field Day', person: 'Emma', place: 'Anderson Elementary', color: 'blue' },
  { id: 'e5', offset: 2, time: '4:00 PM', title: 'Music lesson', person: 'Jack', place: 'Room 12', color: 'purple' },
  { id: 'e6', offset: 4, time: '12:00 PM', title: 'Family picnic', person: 'Everyone', place: 'Riverside Park', color: 'green' },
];
const initialExpenses = [
  { id: 'b1', title: 'Groceries', amount: 428, icon: '🥑', color: 'mint' },
  { id: 'b2', title: 'Kids & school', amount: 245, icon: '🎒', color: 'lilac' },
  { id: 'b3', title: 'Home', amount: 186, icon: '🏡', color: 'peach' },
];

function load(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => load(key, fallback));
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Local storage is optional. */ }
  }, [key, value]);
  return [value, setValue];
}
function dateAtOffset(offset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}
function dateLabel(date, options = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return new Intl.DateTimeFormat('en-US', options).format(date);
}
function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
function Avatar({ person, size = '' }) {
  return <span className={`avatar ${person?.color || 'lilac'} ${size}`}>{person?.initials || 'AF'}</span>;
}
function Icon({ children }) { return <span className="icon" aria-hidden="true">{children}</span>; }
function SectionHeading({ title, action, onAction }) {
  return <div className="section-heading"><h2>{title}</h2>{action && <button className="link-button" onClick={onAction}>{action}<span aria-hidden="true"> →</span></button>}</div>;
}
function PageHeader({ title, description, action, onAction }) {
  return <div className="page-heading"><div><p className="eyebrow">ANDERSON FAMILY</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <button className="button button-primary" onClick={onAction}><span aria-hidden="true">＋</span> {action}</button>}</div>;
}
function AvatarStack({ names }) {
  return <div className="avatar-stack">{names.map((name) => <Avatar key={name} person={people.find((person) => person.name === name)} />)}</div>;
}
function NewItemForm({ placeholder, onAdd, buttonLabel = 'Add' }) {
  const [value, setValue] = useState('');
  function submit(event) {
    event.preventDefault();
    const clean = value.trim();
    if (!clean) return;
    onAdd(clean);
    setValue('');
  }
  return <form className="new-item-form" onSubmit={submit}><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={(event) => setValue(event.target.value)} /><button className="button button-soft" type="submit">＋ <span>{buttonLabel}</span></button></form>;
}
function EventDialog({ onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('15:30');
  const [person, setPerson] = useState('Sarah');
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title"><div className="dialog-head"><div><p className="eyebrow">MAKE A PLAN</p><h2 id="event-dialog-title">Add to the calendar</h2></div><button className="close-button" onClick={onClose} aria-label="Close dialog">×</button></div><form onSubmit={(event) => { event.preventDefault(); onSave({ id: makeId(), offset: Math.round((new Date(`${date}T12:00:00`) - dateAtOffset(0)) / 86400000), time: new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), title: title.trim(), person, place: 'Family calendar', color: person === 'Emma' ? 'green' : person === 'Jack' ? 'blue' : 'purple' }); }}><label className="field-label">What’s happening?<input required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Soccer practice" /></label><div className="form-two"><label className="field-label">Date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="field-label">Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div><label className="field-label">Who’s it for?<select value={person} onChange={(event) => setPerson(event.target.value)}>{people.map((member) => <option key={member.id}>{member.name}</option>)}<option>Everyone</option></select></label><div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">Save event</button></div></form></section></div>;
}
function EventRow({ event }) {
  const person = people.find((member) => member.name === event.person);
  return <article className="event-row"><span className={`event-marker ${event.color}`} /><div className="event-time">{event.time}</div><div className="event-detail"><h3>{event.title}</h3><p><span>{event.place}</span><span className="event-person">{person && <Avatar person={person} size="tiny" />}{event.person}</span></p></div><button className="more-button" aria-label={`More options for ${event.title}`}>···</button></article>;
}
function TaskRow({ task, onToggle }) {
  const person = people.find((member) => member.name === task.person);
  return <div className={`task-row ${task.done ? 'is-done' : ''}`}><button className="check-button" aria-label={task.done ? `Mark ${task.title} incomplete` : `Complete ${task.title}`} aria-pressed={task.done} onClick={() => onToggle(task.id)}>{task.done ? '✓' : ''}</button><div className="task-copy"><span>{task.title}</span><small>{task.time}</small></div>{person && <Avatar person={person} size="small" />}</div>;
}
function HomePage({ tasks, setTasks, events, setPage, onNewEvent, groceries }) {
  const todayEvents = events.filter((event) => event.offset === 0).sort((a, b) => a.time.localeCompare(b.time));
  const completed = tasks.filter((task) => task.done).length;
  const toggleTask = (id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  return <>
    <div className="greeting-row"><div><p className="eyebrow">{dateLabel(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</p><h1>Good morning, Sarah <span aria-hidden="true">☀️</span></h1><p className="page-description">A little plan goes a long way. Here’s your family’s day.</p></div><button className="button button-primary desktop-new" onClick={onNewEvent}><span aria-hidden="true">＋</span> Add a plan</button></div>
    <section className="family-banner"><div className="banner-copy"><span className="banner-sparkle" aria-hidden="true">✦</span><p className="banner-kicker">YOUR FAMILY SPACE</p><h2>Life is better, <em>together.</em></h2><p>Keep your people and plans in sync.</p><button className="banner-button" onClick={() => setPage('family')}>Family space <span aria-hidden="true">→</span></button></div><div className="family-art" aria-hidden="true"><div className="sun-art">☀</div><div className="art-house">⌂</div><div className="art-person art-person-one">☺</div><div className="art-person art-person-two">☺</div><div className="art-heart">♥</div><span className="art-cloud">☁</span></div></section>
    <div className="dashboard-grid">
      <section className="panel schedule-panel"><SectionHeading title="Today’s schedule" action="Full calendar" onAction={() => setPage('calendar')} /><div className="date-strip"><div className="date-square"><strong>{dateAtOffset(0).getDate()}</strong><span>{dateLabel(dateAtOffset(0), { weekday: 'short' }).toUpperCase()}</span></div><p>{todayEvents.length ? `${todayEvents.length} plans for today` : 'Room for something lovely'}</p><button className="round-plus" aria-label="Add an event" onClick={onNewEvent}>＋</button></div><div className="event-list">{todayEvents.length ? todayEvents.map((event) => <EventRow key={event.id} event={event} />) : <p className="empty-copy">No plans yet. Add something to your family calendar.</p>}</div></section>
      <section className="panel tasks-panel"><SectionHeading title="Family to-dos" action="See all" onAction={() => setPage('tasks')} /><div className="progress-summary"><div><strong>{completed} of {tasks.length}</strong><span>tasks done today</span></div><div className="progress-track"><span style={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }} /></div></div><div className="task-list">{tasks.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} onToggle={id => setTasks(current => current.map(item => item.id === id ? { ...item, done: !item.done } : item))} />)}</div></section>
      <section className="panel grocery-preview"><SectionHeading title="Grocery list" action="Open list" onAction={() => setPage('groceries')} /><div className="grocery-preview-row"><span className="grocery-emoji">🛒</span><div><strong>{groceries.filter((item) => !item.checked).length} things to pick up</strong><small>Shared with the family</small></div><AvatarStack names={['Sarah', 'Michael']} /></div><button className="grocery-open" onClick={() => setPage('groceries')}>See the list <span>→</span></button></section>
      <section className="panel activity-panel"><SectionHeading title="Little family moments" action="Our family" onAction={() => setPage('family')} /><div className="activity-feed"><div className="activity-item"><Avatar person={people[2]} /><p><strong>Emma</strong> added <b>Field Day</b> to the calendar<small>12 min ago</small></p><span className="activity-emoji">🎨</span></div><div className="activity-item"><Avatar person={people[1]} /><p><strong>Michael</strong> checked off <b>Weekly meal plan</b><small>1 hr ago</small></p><span className="activity-emoji">✓</span></div></div></section>
    </div>
  </>;
}
function CalendarPage({ events, onNewEvent, onToast }) {
  const [selected, setSelected] = useState(0);
  const [weekStart, setWeekStart] = useState(() => { const date = new Date(); date.setDate(date.getDate() - date.getDay()); date.setHours(12, 0, 0, 0); return date; });
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(weekStart); date.setDate(date.getDate() + index); return date; });
  const selectedDate = new Date(days[selected]);
  const dayOffset = Math.round((selectedDate - dateAtOffset(0)) / 86400000);
  const selectedEvents = events.filter((event) => event.offset === dayOffset).sort((a, b) => a.time.localeCompare(b.time));
  return <><PageHeader title="Family calendar" description="All your people, all their plans." action="Add event" onAction={onNewEvent} /><section className="panel calendar-panel"><div className="calendar-controls"><button className="circle-nav" aria-label="Previous week" onClick={() => setWeekStart(current => new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7))}>‹</button><h2>{dateLabel(days[0], { month: 'long' })} <span>{days[0].getFullYear()}</span></h2><button className="circle-nav" aria-label="Next week" onClick={() => setWeekStart(current => new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7))}>›</button><button className="today-link" onClick={() => { const now = new Date(); now.setDate(now.getDate() - now.getDay()); now.setHours(12, 0, 0, 0); setWeekStart(now); setSelected(new Date().getDay()); }}>Today</button></div><div className="week-picker">{days.map((date, index) => <button key={date.toISOString()} className={`week-day ${selected === index ? 'selected' : ''} ${date.toDateString() === new Date().toDateString() ? 'is-today' : ''}`} onClick={() => setSelected(index)}><span>{dateLabel(date, { weekday: 'short' })}</span><strong>{date.getDate()}</strong><i>{events.some(event => event.offset === Math.round((date - dateAtOffset(0)) / 86400000)) ? '•' : ''}</i></button>)}</div><div className="selected-day-head"><div><p className="eyebrow">{dateLabel(selectedDate, { weekday: 'long' }).toUpperCase()}</p><h2>{dateLabel(selectedDate, { month: 'long', day: 'numeric' })}</h2></div><button className="button button-soft" onClick={onNewEvent}>＋ Add plan</button></div><div className="event-list">{selectedEvents.length ? selectedEvents.map(event => <EventRow key={event.id} event={event} />) : <div className="calendar-empty"><span>🌿</span><strong>A little breathing room</strong><p>No plans for this day. Enjoy it!</p><button className="link-button" onClick={onNewEvent}>Add a plan →</button></div>}</div></section><p className="demo-note">Shared family calendar · Changes are saved on this device.</p></>;
}
function TasksPage({ tasks, setTasks }) {
  const [filter, setFilter] = useState('All');
  const visible = tasks.filter(task => filter === 'All' || (filter === 'Done' ? task.done : !task.done));
  return <><PageHeader title="Family to-dos" description="Share the little things that make family life run smoothly." /><section className="panel list-page-panel"><div className="list-page-heading"><div><span className="panel-icon lilac-bg">✓</span><div><h2>Today’s checklist</h2><p>{tasks.filter(task => task.done).length} of {tasks.length} done — you’ve got this!</p></div></div><AvatarStack names={['Sarah', 'Michael', 'Emma']} /></div><div className="filter-tabs">{['All', 'To do', 'Done'].map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="task-list large-task-list">{visible.map(task => <TaskRow key={task.id} task={task} onToggle={id => setTasks(current => current.map(item => item.id === id ? { ...item, done: !item.done } : item))} />)}</div><NewItemForm placeholder="Add a task for the family…" onAdd={title => setTasks(current => [...current, { id: makeId(), title, person: 'Sarah', time: 'Today', done: false }])} buttonLabel="Add task" /></section></>;
}
function GroceriesPage({ groceries, setGroceries }) {
  const unbought = groceries.filter(item => !item.checked);
  return <><PageHeader title="Grocery list" description="One shared list, so nothing gets left behind." /><section className="panel list-page-panel grocery-page"><div className="grocery-list-top"><div><span className="panel-icon mint-bg">🛒</span><div><h2>This week’s groceries</h2><p>{unbought.length} items left to pick up</p></div></div><AvatarStack names={['Sarah', 'Michael']} /></div><div className="grocery-items">{groceries.map(item => <label className={`grocery-item ${item.checked ? 'is-checked' : ''}`} key={item.id}><input type="checkbox" checked={item.checked} onChange={() => setGroceries(current => current.map(row => row.id === item.id ? { ...row, checked: !row.checked } : row))} /><span className="fake-check">✓</span><span className="grocery-name">{item.name}</span><span className="grocery-amount">{item.amount}</span></label>)}</div><NewItemForm placeholder="Add something to the list…" onAdd={name => setGroceries(current => [...current, { id: makeId(), name, amount: '1 item', checked: false }])} buttonLabel="Add item" /><div className="share-note"><span>✦</span> Everyone in the Anderson family can see this list.</div></section></>;
}
function BudgetPage({ expenses, setExpenses }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const budget = 1800;
  const colors = ['mint', 'lilac', 'peach', 'sky'];
  function addExpense(event) {
    event.preventDefault();
    if (!title.trim() || !Number(amount)) return;
    setExpenses(current => [...current, { id: makeId(), title: title.trim(), amount: Number(amount), icon: '🧾', color: colors[current.length % colors.length] }]);
    setTitle(''); setAmount('');
  }
  return <><PageHeader title="Family budget" description="A clear picture of where the household budget goes." /><section className="budget-hero"><div className="budget-topline"><div><p className="eyebrow">THIS MONTH’S SPENDING</p><h2>${total.toLocaleString()} <span>/ ${budget.toLocaleString()}</span></h2></div><span className="budget-emoji">🌱</span></div><div className="budget-track"><span style={{ width: `${Math.min(total / budget * 100, 100)}%` }} /></div><div className="budget-foot"><span>${(budget - total).toLocaleString()} left in your family budget</span><span>{Math.round(total / budget * 100)}% used</span></div></section><section className="panel expense-panel"><SectionHeading title="Spending categories" /><div className="expense-list">{expenses.map(item => <div className="expense-row" key={item.id}><span className={`expense-icon ${item.color}-bg`}>{item.icon}</span><div className="expense-copy"><strong>{item.title}</strong><span>${Number(item.amount).toLocaleString()} spent</span></div><div className="expense-meter"><span style={{ width: `${Math.min(Number(item.amount) / budget * 100 * 3, 100)}%` }} /></div><strong className="expense-amount">${Number(item.amount).toLocaleString()}</strong></div>)}</div><form className="expense-form" onSubmit={addExpense}><input aria-label="Expense category" placeholder="Category (e.g. Transport)" value={title} onChange={event => setTitle(event.target.value)} required /><div className="amount-input"><span>$</span><input aria-label="Amount spent" type="number" min="1" placeholder="Amount" value={amount} onChange={event => setAmount(event.target.value)} required /></div><button className="button button-soft" type="submit">＋ Add</button></form><p className="demo-note">A simple shared overview for planning. No bank accounts connected.</p></section></>;
}
function FamilyPage({ tasks, groceries, events }) {
  const counts = useMemo(() => people.map(person => ({ ...person, plans: events.filter(event => event.person === person.name).length, tasks: tasks.filter(task => task.person === person.name && !task.done).length })), [events, tasks]);
  return <><PageHeader title="Our family" description="Your favorite team, all in one place." /><section className="family-profile-card"><div className="family-profile-art"><span>🏡</span><i>♥</i><i>✦</i></div><div className="family-profile-copy"><p className="eyebrow">FAMILY SPACE</p><h2>The Andersons</h2><p>Our little corner of the world. Four people, one team.</p><div className="member-stack">{people.map(person => <Avatar key={person.id} person={person} />)}<span>4 family members</span></div></div></section><div className="family-members">{counts.map(person => <article className="panel member-card" key={person.id}><Avatar person={person} size="large" /><div className="member-info"><h2>{person.fullName}</h2><p>{person.id === 'sarah' ? 'Family organizer' : person.id === 'michael' ? 'Dad' : person.id === 'emma' ? 'Big sister' : 'Little brother'}</p></div><div className="member-stats"><span><strong>{person.plans}</strong> plans</span><span><strong>{person.tasks}</strong> to-dos</span></div></article>)}</div><section className="panel family-summary"><SectionHeading title="A family that’s in sync" /><div className="summary-stats"><div><strong>{events.length}</strong><span>upcoming plans</span></div><div><strong>{tasks.filter(task => !task.done).length}</strong><span>to-dos to share</span></div><div><strong>{groceries.filter(item => !item.checked).length}</strong><span>grocery items</span></div></div></section></>;
}
function App() {
  const [page, setPage] = useState('home');
  const [events, setEvents] = useStoredState(STORE.events, initialEvents);
  const [tasks, setTasks] = useStoredState(STORE.tasks, initialTasks);
  const [groceries, setGroceries] = useStoredState(STORE.groceries, initialGroceries);
  const [expenses, setExpenses] = useStoredState(STORE.expenses, initialExpenses);
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const titles = { home: 'Today', calendar: 'Calendar', tasks: 'To-dos', groceries: 'Groceries', budget: 'Budget', family: 'Our family' };
  const sortedEvents = useMemo(() => [...events].sort((a, b) => a.offset - b.offset), [events]);
  function saveEvent(event) {
    setEvents(current => [...current, event]);
    setDialog(false);
    setToast('Your family plan is on the calendar!');
  }
  return <div className="app-shell"><aside className="sidebar"><button className="brand" onClick={() => setPage('home')}><span className="brand-logo">✦</span><span>together<span className="brand-period">.</span><small>ANDERSON FAMILY</small></span></button><button className="family-switcher" onClick={() => setPage('family')}><span className="family-switch-icon">⌂</span><span><strong>The Andersons</strong><small>Family space</small></span><span className="switch-chevron">⌄</span></button><p className="nav-caption">YOUR SPACE</p><nav className="side-nav" aria-label="Main navigation">{navItems.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><Icon>{item.icon}</Icon>{item.label}{item.id === 'groceries' && <span className="nav-count">{groceries.filter(row => !row.checked).length}</span>}</button>)}</nav><button className={`family-nav ${page === 'family' ? 'active' : ''}`} onClick={() => setPage('family')}><span className="family-nav-icon">♡</span>Our family</button><div className="sidebar-spacer" /><div className="sidebar-members"><p className="nav-caption">YOUR PEOPLE <button aria-label="Invite family member" onClick={() => setToast('Invite links are coming soon.')}>＋</button></p>{people.map(person => <div className="sidebar-person" key={person.id}><Avatar person={person} /><span>{person.name}</span><i className={`online-dot ${person.id === 'sarah' || person.id === 'michael' ? 'online' : ''}`} /></div>)}</div><div className="sidebar-user"><Avatar person={people[0]} /><span><strong>Sarah Anderson</strong><small>Family admin</small></span><button aria-label="Profile options" onClick={() => setToast('Profile settings are coming soon.')}>···</button></div></aside>
    <main className="main-area"><header className="mobile-header"><button className="mobile-brand" onClick={() => setPage('home')}><span className="brand-logo">✦</span>together<span className="brand-period">.</span></button><button className="mobile-family" onClick={() => setPage('family')}><Avatar person={people[0]} />⌄</button></header><div className="content-wrap"><div className="topline"><div className="breadcrumbs">The Andersons <span>/</span> <strong>{titles[page]}</strong></div><div className="topline-right"><span className="sync-status"><i /> All synced</span><button className="notification-button" aria-label="Notifications" onClick={() => setToast('You’re all caught up with your family!')}>♧<i /></button><Avatar person={people[0]} /><span className="desktop-user-name">Sarah</span></div></div>
      {page === 'home' && <HomePage tasks={tasks} setTasks={setTasks} events={sortedEvents} setPage={setPage} onNewEvent={() => setDialog(true)} groceries={groceries} />}
      {page === 'calendar' && <CalendarPage events={sortedEvents} onNewEvent={() => setDialog(true)} onToast={setToast} />}
      {page === 'tasks' && <TasksPage tasks={tasks} setTasks={setTasks} />}
      {page === 'groceries' && <GroceriesPage groceries={groceries} setGroceries={setGroceries} />}
      {page === 'budget' && <BudgetPage expenses={expenses} setExpenses={setExpenses} />}
      {page === 'family' && <FamilyPage tasks={tasks} groceries={groceries} events={sortedEvents} />}
      </div></main><nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><Icon>{item.icon}</Icon><span>{item.label}</span></button>)}</nav>{dialog && <EventDialog onClose={() => setDialog(false)} onSave={saveEvent} />}{toast && <div className="toast" role="status">{toast}</div>}</div>;
}

export default App;
