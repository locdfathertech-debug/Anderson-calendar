import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, CircleUserRound, GraduationCap, ListChecks, LockKeyhole, LogOut, Plane, Plus, Settings, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';

const NAV = [
  { path: '/calendar', label: 'Family calendar', Icon: CalendarDays },
  { path: '/tasks', label: 'Family tasks', Icon: ListChecks },
  { path: '/vacations', label: 'Vacations', Icon: Plane },
  { path: '/grades', label: 'School & grades', Icon: GraduationCap, admin: true },
  { path: '/admin', label: 'Admin settings', Icon: Settings, admin: true },
];
const PEOPLE = ['Dad', 'Mom', 'Mia'];
const PAGE_TITLES = { '/calendar': 'Family calendar', '/tasks': 'Family tasks', '/vacations': 'Upcoming vacations', '/grades': 'School & grades', '/admin': 'Admin settings' };
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const idFor = (email) => email?.split('@')[0]?.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase() || 'AF';

function AuthScreen({ mode = 'login' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    const result = mode === 'reset'
      ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setMessage(result.error?.message || (mode === 'reset' ? 'If this address is authorized, a reset email is on its way.' : 'Signed in. Loading your family space…'));
  }
  return <main className="auth-wrap"><section className="auth-card"><div className="brand-mark"><CalendarDays size={21}/></div><p className="eyebrow">ANDERSON FAMILY</p><h1>{mode === 'reset' ? 'Reset your password' : 'Welcome to FamilyWall'}</h1><p className="muted">{mode === 'reset' ? 'We’ll email you a secure password reset link.' : 'Sign in to see your family calendar and plans.'}</p><form onSubmit={submit}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>{mode === 'login' && <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>}<button className="button primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</button></form>{message && <p className="form-message" role="status">{message}</p>}<Link className="auth-link" to={mode === 'reset' ? '/login' : '/reset-password'}>{mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}</Link><p className="auth-foot">Access is invite-only. Ask a family administrator for an account.</p></section></main>;
}

function SignInGate({ session, profile, loading, children }) {
  const location = useLocation();
  if (!isSupabaseConfigured) return <main className="config-message"><h1>Supabase setup needed</h1><p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your deployment environment, then redeploy.</p></main>;
  if (loading) return <main className="config-message">Checking your secure family session…</main>;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) return <main className="config-message"><h1>Family profile unavailable</h1><p>Your account is not authorized for this family. Contact the super administrator.</p><button className="button" onClick={() => supabase.auth.signOut()}>Sign out</button></main>;
  return children;
}

function Layout({ session, profile, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = ['admin', 'super_admin'].includes(profile.role);
  const visibleNav = NAV.filter((item) => !item.admin || isAdmin);
  async function signOut() { await supabase.auth.signOut(); navigate('/login'); }
  return <div className="app-shell"><aside className="sidebar"><Link className="brand" to="/calendar"><span className="brand-mark"><CalendarDays size={20}/></span><span>FamilyWall<small>ANDERSON FAMILY</small></span></Link><div className="family-switch"><span className="family-icon">⌂</span><span><b>Anderson family</b><small>Shared family space</small></span></div><p className="nav-label">YOUR SPACE</p><nav className="side-nav">{visibleNav.map(({ path, label, Icon }) => <Link key={path} className={location.pathname === path ? 'active' : ''} to={path}><Icon size={17}/>{label}</Link>)}</nav><div className="sidebar-bottom"><span className="avatar">{idFor(session.user.email)}</span><span className="user-copy"><b>{session.user.email}</b><small>{profile.role.replace('_', ' ')}</small></span><button aria-label="Sign out" onClick={signOut}><LogOut size={17}/></button></div></aside><main className="main"><header className="topbar"><div className="breadcrumbs">Anderson family <span>/</span> <b>{PAGE_TITLES[location.pathname] || 'FamilyWall'}</b></div><div className="top-user"><span className="sync-dot"/> Secured by Supabase <span className="avatar">{idFor(session.user.email)}</span></div></header>{children}</main></div>;
}

function PageHeading({ title, description, action }) { return <div className="page-heading"><div><p className="eyebrow">YOUR FAMILY, IN SYNC</p><h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>; }
function CalendarPage({ rows, onAdd }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(dateKey(new Date()));
  const year = month.getFullYear(), monthIndex = month.getMonth();
  const days = useMemo(() => { const first = new Date(year, monthIndex, 1); const start = new Date(year, monthIndex, 1 - first.getDay()); return Array.from({ length: 42 }, (_, i) => { const day = new Date(start); day.setDate(start.getDate() + i); return day; }); }, [year, monthIndex]);
  const selectedRows = rows.filter((event) => event.event_date === selected).sort((a, b) => (a.event_time || '').localeCompare(b.event_time || ''));
  return <><PageHeading title="Family calendar" description="Everyone’s plans, all in one place." action={<button className="button primary" onClick={onAdd}><Plus size={16}/> Add event</button>}/><section className="panel calendar-panel"><div className="calendar-toolbar"><button className="button quiet" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(dateKey(today)); }}>Today</button><button className="round" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={18}/></button><h2>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2><button className="round" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={18}/></button></div><div className="calendar-grid">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <div className="weekday" key={day}>{day}</div>)}{days.map((day) => { const key = dateKey(day); const items = rows.filter((event) => event.event_date === key); return <button key={key} className={`calendar-day ${day.getMonth() !== monthIndex ? 'outside' : ''} ${key === selected ? 'selected' : ''} ${key === dateKey(new Date()) ? 'today' : ''}`} onClick={() => setSelected(key)}><span className="day-number">{day.getDate()}</span>{items.slice(0, 2).map((item) => <span className="day-event" key={item.id}>{item.title}</span>)}{items.length > 2 && <small>+{items.length - 2} more</small>}</button>;})}</div><div className="agenda"><h2>{new Date(`${selected}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>{selectedRows.length ? selectedRows.map((event) => <div className="data-row" key={event.id}><time>{event.event_time || 'All day'}</time><b>{event.title}</b><span>{event.assigned_to}</span><small>{event.place}</small></div>) : <p className="muted">No plans for this day yet.</p>}</div></section></>;
}

function DataPage({ kind, rows, onAdd, onDelete, onToggle }) {
  const [title, setTitle] = useState(''), [date, setDate] = useState(dateKey(new Date())), [time, setTime] = useState('15:30'), [person, setPerson] = useState('Mia');
  const configs = { tasks: { title: 'Family tasks', description: 'Share the little jobs that keep family life moving.', table: 'chores', field: 'title', dateField: 'due_date', adminOnly: false }, vacations: { title: 'Upcoming vacations', description: 'Make room for the memories you’ll make together.', table: 'vacations', field: 'title', dateField: 'date_label', adminOnly: true } };
  const config = configs[kind];
  const add = (event) => { event.preventDefault(); if (!title.trim()) return; onAdd(kind, kind === 'tasks' ? { title: title.trim(), due_date: date, assigned_to: person } : { title: title.trim(), date_label: date, image_url: '' }); setTitle(''); };
  return <><PageHeading title={config.title} description={config.description}/><section className="panel list-panel"><form className="add-form" onSubmit={add}><input aria-label="Item name" placeholder={kind === 'tasks' ? 'Add a family task…' : 'Add a trip…'} value={title} onChange={(e) => setTitle(e.target.value)} required/><input aria-label="Date" type={kind === 'tasks' ? 'date' : 'text'} placeholder={kind === 'tasks' ? '' : 'Dates'} value={date} onChange={(e) => setDate(e.target.value)}/>{kind === 'tasks' && <select aria-label="Assign to" value={person} onChange={(e) => setPerson(e.target.value)}>{PEOPLE.map((name) => <option key={name}>{name}</option>)}</select>}<button className="button primary"><Plus size={15}/> Add</button></form><div className="rows">{rows.map((row) => <article className="data-row" key={row.id}>{kind === 'tasks' && <button className={`task-check ${row.completed ? 'checked' : ''}`} aria-label="Toggle complete" onClick={() => onToggle(row)}>{row.completed ? '✓' : ''}</button>}<div className="row-main"><b>{row.title}</b><small>{kind === 'tasks' ? `${row.due_date} · ${row.assigned_to}` : row.date_label}</small></div><button className="delete-button" onClick={() => onDelete(kind, row.id)} aria-label={`Delete ${row.title}`}><Trash2 size={16}/></button></article>)}{!rows.length && <p className="muted empty">Nothing here yet. Add your first item above.</p>}</div></section></>;
}
function GradesPage({ rows, onAdd, onDelete }) {
  const [subject, setSubject] = useState(''), [grade, setGrade] = useState('');
  return <><PageHeading title="School & grades" description="A private family view of school progress."/><section className="panel list-panel"><form className="add-form" onSubmit={(e) => { e.preventDefault(); if (subject.trim() && grade.trim()) { onAdd({ subject: subject.trim(), grade: grade.trim(), member_name: 'Mia' }); setSubject(''); setGrade(''); } }}><input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required/><input placeholder="Grade" value={grade} onChange={(e) => setGrade(e.target.value)} required/><button className="button primary"><Plus size={15}/> Add grade</button></form><div className="grade-grid">{rows.map((row) => <article className="grade-card" key={row.id}><span>{row.subject}</span><b>{row.grade}</b><button className="delete-button" onClick={() => onDelete(row.id)} aria-label={`Delete ${row.subject}`}><Trash2 size={15}/></button></article>)}</div>{!rows.length && <p className="muted empty">No grades recorded.</p>}</section></>;
}
function AdminPage({ profile, users, onRoleChange }) {
  return <><PageHeading title="Admin settings" description="Access is enforced by Supabase row-level security."/><section className="panel list-panel"><div className="security-note"><LockKeyhole size={18}/><span><b>Role: {profile.role.replace('_', ' ')}</b><small>Only the super admin can change account roles. Database policies remain the source of truth.</small></span></div>{profile.role === 'super_admin' ? <><h2>Family accounts</h2>{users.map((user) => <div className="data-row" key={user.id}><div className="row-main"><b>{user.email}</b><small>{user.id === profile.id ? 'You' : 'Anderson family'}</small></div>{user.id !== profile.id && <select value={user.role} onChange={(e) => onRoleChange(user.id, e.target.value)} aria-label={`Role for ${user.email}`}><option value="member">Member</option><option value="admin">Admin</option></select>}<span className="role-badge">{user.id === profile.id ? 'Super admin' : user.role}</span></div>)}</> : <p className="muted">Admin access lets you manage family events, tasks, vacations, and grades. Role assignment is reserved for the super administrator.</p>}</section></>;
}
function AppRoutes() {
  const [session, setSession] = useState(null), [profile, setProfile] = useState(null), [loading, setLoading] = useState(true), [rows, setRows] = useState({ events: [], chores: [], vacations: [], grades: [] }), [users, setUsers] = useState([]), [error, setError] = useState(''), [dialog, setDialog] = useState(false);
  const location = useLocation(), navigate = useNavigate();
  async function loadProfile(user) {
    if (!user) { setProfile(null); setRows({ events: [], chores: [], vacations: [], grades: [] }); return; }
    const { data, error: profileError } = await supabase.from('profiles').select('id,email,role,family_id').eq('id', user.id).maybeSingle();
    if (profileError) { setError(profileError.message); setProfile(null); return; }
    setProfile(data);
    if (!data) return;
    const tables = ['events', 'chores', 'vacations'];
    if (['admin', 'super_admin'].includes(data.role)) tables.push('grades');
    const results = await Promise.all(tables.map((table) => supabase.from(table).select('*').eq('family_id', data.family_id).order(table === 'events' ? 'event_date' : table === 'chores' ? 'due_date' : 'created_at', { ascending: true })));
    const next = { events: [], chores: [], vacations: [], grades: [] };
    results.forEach((result, index) => { if (result.error) setError(result.error.message); else next[tables[index]] = result.data || []; });
    setRows(next);
    if (data.role === 'super_admin') { const { data: profiles, error: usersError } = await supabase.from('profiles').select('id,email,role').eq('family_id', data.family_id); if (usersError) setError(usersError.message); else setUsers(profiles || []); }
  }
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return undefined; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => { if (!alive) return; setSession(data.session); await loadProfile(data.session?.user); if (alive) setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); window.setTimeout(() => { if (alive) { loadProfile(nextSession?.user); setLoading(false); } }, 0); });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { if (session && profile && location.pathname === '/login') navigate('/calendar', { replace: true }); }, [session, profile, location.pathname, navigate]);
  async function mutate(table, operation) {
    setError('');
    const payload = { ...operation.payload, family_id: profile.family_id };
    const result = operation.action === 'insert' ? await supabase.from(table).insert(payload).select().single() : operation.action === 'delete' ? await supabase.from(table).delete().eq('id', operation.id).eq('family_id', profile.family_id) : await supabase.from(table).update(operation.payload).eq('id', operation.id).eq('family_id', profile.family_id).select().single();
    if (result.error) { setError(result.error.message); return null; }
    await loadProfile(session.user);
    return result.data;
  }
  async function addItem(kind, payload) { const table = kind === 'tasks' ? 'chores' : kind; await mutate(table, { action: 'insert', payload }); }
  async function deleteItem(kind, id) { await mutate(kind === 'tasks' ? 'chores' : kind, { action: 'delete', id }); }
  async function toggleTask(row) { await mutate('chores', { action: 'update', id: row.id, payload: { completed: !row.completed } }); }
  async function saveEvent(event) { await mutate('events', { action: 'insert', payload: event }); setDialog(false); }
  async function changeRole(userId, role) { const { error: rpcError } = await supabase.rpc('set_family_role', { target_user_id: userId, new_role: role }); if (rpcError) setError(rpcError.message); else await loadProfile(session.user); }
  const guarded = (element, adminOnly = false) => <SignInGate session={session} profile={profile} loading={loading}>{adminOnly && !['admin', 'super_admin'].includes(profile.role) ? <Navigate to="/calendar" replace/> : <Layout session={session} profile={profile}>{element}</Layout>}</SignInGate>;
  const eventDialog = dialog && <EventDialog initialDate={dateKey(new Date())} onClose={() => setDialog(false)} onSave={saveEvent}/>;
  if (loading) return <main className="config-message">Loading FamilyWall…</main>;
  return <><Routes><Route path="/login" element={session ? <Navigate to="/calendar" replace/> : <AuthScreen/>}/><Route path="/reset-password" element={<AuthScreen mode="reset"/>}/><Route path="/" element={<Navigate to={session ? '/calendar' : '/login'} replace/>}/><Route path="/calendar" element={guarded(<><PageHeading title="Family calendar" description="Everyone’s plans, all in one place." action={<button className="button primary" onClick={() => setDialog(true)}><Plus size={16}/> Add event</button>}/><CalendarPage rows={rows.events} onAdd={() => setDialog(true)}/></>)}/><Route path="/tasks" element={guarded(<DataPage kind="tasks" rows={rows.chores} onAdd={addItem} onDelete={deleteItem} onToggle={toggleTask}/>)} /><Route path="/vacations" element={guarded(<DataPage kind="vacations" rows={rows.vacations} onAdd={addItem} onDelete={deleteItem}/>, true)}/><Route path="/grades" element={guarded(<GradesPage rows={rows.grades} onAdd={(payload) => addItem('grades', payload)} onDelete={(id) => deleteItem('grades', id)}/>, true)}/><Route path="/admin" element={guarded(<AdminPage profile={profile || { role: 'member', id: '' }} users={users} onRoleChange={changeRole}/>, true)}/><Route path="*" element={<Navigate to="/calendar" replace/>}/></Routes>{error && <div className="error-toast" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}{eventDialog}</>;
}
export default function App() { return <BrowserRouter><AppRoutes/></BrowserRouter>; }
