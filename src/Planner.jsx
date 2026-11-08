import { videoSource } from "./lib/video.js";
import { MEMBER_COLORS, assignedMemberColors, nextMemberColor } from "./lib/memberColors.js";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  CheckCheck,
  Utensils,
  ShoppingBasket,
  GraduationCap,
  Plane,
  Wallet,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Sun,
  Moon,
  Monitor,
  LogOut,
  X,
  Trash2,
  ArrowUpRight,
  Users,
  Check,
  Download,
} from "lucide-react";
import {
  dateKey,
  shiftDate,
  weekDates,
  money,
  budgetTotals,
  nextChoreStatus,
  icsExport,
  holidays,
} from "./lib/planner.js";
const NAV = [
  ["home", "Overview", LayoutDashboard],
  ["calendar", "Calendar", CalendarDays],
  ["chore", "Chores & rewards", CheckCheck],
  ["meal", "Meals & pantry", Utensils],
  ["shopping", "Shopping list", ShoppingBasket],
  ["school", "School & study", GraduationCap],
  ["trip", "Trips & memories", Plane],
  ["budget", "Family budget", Wallet],
  ["settings", "Parent portal", Settings],
];
const COLORS = Object.keys(MEMBER_COLORS);
const labelDate = (key, options = { month: "short", day: "numeric" }) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("en-US", options);
const isParent = (p) => ["admin", "super_admin"].includes(p?.role);
const FIELDS = {
  event: [
    ["title", "Event name"],
    ["date", "Date", "date"],
    ["time", "Time", "time"],
    ["member", "Family member", "member"],
    ["category", "Category", "category"],
    ["location", "Location"],
    ["video_url", "Video URL (optional)", "video"],
    ["notes", "Notes"],
  ],
  chore: [
    ["title", "Chore"],
    ["member", "Assigned to", "member"],
    ["assigned_user_id", "Child account UUID (optional)"],
    ["date", "Due date", "date"],
    ["amount", "Reward ($)", "number"],
  ],
  meal: [
    ["title", "Meal"],
    ["date", "Date", "date"],
    ["type", "Meal type", "mealtype"],
    ["notes", "Ingredients / notes"],
    ["video_url", "Recipe video URL (optional)", "video"],
  ],
  pantry: [
    ["title", "Item"],
    ["quantity", "Quantity", "number"],
    ["unit", "Unit"],
    ["date", "Use by", "date"],
  ],
  shopping: [
    ["title", "Item"],
    ["quantity", "Quantity", "number"],
    ["unit", "Unit"],
  ],
  study: [
    ["title", "Assignment"],
    ["subject", "Subject"],
    ["member", "Student", "member"],
    ["date", "Due date", "date"],
  ],
  grade: [
    ["title", "Subject"],
    ["member", "Student", "member"],
    ["grade", "Grade"],
  ],
  trip: [
    ["title", "Trip name"],
    ["date", "Start", "date"],
    ["end", "End", "date"],
    ["location", "Destination"],
    ["amount", "Budget ($)", "number"],
    ["notes", "Packing / itinerary"],
  ],
  budget: [
    ["title", "Category"],
    ["amount", "Monthly limit ($)", "number"],
    ["color", "Color", "color"],
  ],
  transaction: [
    ["title", "Description"],
    ["amount", "Amount ($)", "number"],
    ["date", "Date", "date"],
    ["category", "Budget category", "budget"],
    ["type", "Type", "transactiontype"],
  ],
  member: [
    ["title", "Name"],
    ["role", "Role label"],
    ["color", "Color", "color"],
  ],
  photo: [
    ["title", "Caption"],
    ["url", "Photo URL", "url"],
  ],
};
export default function Planner({
  records,
  profile,
  onSave,
  onDelete,
  onSubmitChore,
  onSignOut,
  accounts = [],
  access = [],
  onManageAccess,
  demo = false,
  busy = false,
}) {
  const [tab, setTab] = useState(
      () =>
        ({
          "/calendar": "calendar",
          "/tasks": "chore",
          "/vacations": "trip",
          "/grades": "school",
          "/admin": "settings",
        })[window.location.pathname] || "home",
    ),
    [date, setDate] = useState(dateKey()),
    [view, setView] = useState("week"),
    [member, setMember] = useState("All family"),
    [search, setSearch] = useState(""),
    [dialog, setDialog] = useState(null),
    [dark, setDark] = useState(() => {
      try {
        return localStorage.getItem("family-theme-preference") !== "light";
      } catch {
        return true;
      }
    }),
    [wall, setWall] = useState(false),
    [clock, setClock] = useState(new Date()),
    [notice, setNotice] = useState("");
  const parent = isParent(profile),
    members = records.filter((r) => r.kind === "member"),
    get = (kind) => records.filter((r) => r.kind === kind),
    events = [...get("event"), ...holidays(Number(date.slice(0, 4)))].filter(
      (r) =>
        (member === "All family" || r.data.member === member) &&
        r.data.title.toLowerCase().includes(search.toLowerCase()),
    );
  const today = dateKey(),
    chores = get("chore"),
    meals = get("meal"),
    budgets = budgetTotals(records, date.slice(0, 7));
  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    try {
      localStorage.setItem("family-theme-preference", nextDark ? "dark" : "light");
    } catch {
      // The toggle still works for this session when storage is unavailable.
    }
  }
  useEffect(() => {
    if (!wall) return;
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, [wall]);
  function add(kind, initial = {}) {
    setDialog({
      kind,
      data: {
        title: "",
        date,
        member: members[0]?.data.title || "Family",
        amount: 0,
        quantity: 1,
        color: kind === "member" ? nextMemberColor(members) : "teal",
        ...(kind === "member" ? { role: "Child" } : {}),
        type: kind === "transaction" ? "expense" : "Dinner",
        status: "open",
        ...initial,
      },
    });
  }
  async function save(e) {
    e.preventDefault();
    const rawVideo = typeof dialog.data.video_url === "string" ? dialog.data.video_url.trim() : "";
    const video = videoSource(rawVideo);
    if (["event", "meal"].includes(dialog.kind) && rawVideo && !video) {
      const field = e.currentTarget.querySelector("[data-video-url]");
      field?.setCustomValidity("Use an HTTPS YouTube, Vimeo, MP4, or WebM video link.");
      field?.reportValidity();
      return;
    }
    const record = ["event", "meal"].includes(dialog.kind)
      ? { ...dialog, data: { ...dialog.data, video_url: video?.url || "" } }
      : dialog;
    if ((await onSave(record)) !== false) setDialog(null);
  }
  async function change(r, data) {
    return onSave({ ...r, data: { ...r.data, ...data } });
  }
  function exportCalendar() {
    const blob = new Blob([icsExport(events)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anderson-family.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function itemCard(r, extra) {
    return (
      <article
        className={`item-card tint-${r.data.color || colorFor(r.data.member)}`}
        key={r.id}
      >
        <div className="card-top">
          <span className="pill">{r.data.member || r.data.type || r.kind}</span>
          {parent && (
            <button
              className="icon-btn"
              aria-label={`Edit ${r.data.title}`}
              onClick={() => setDialog({ ...r, data: { ...r.data } })}
            >
              <ArrowUpRight size={17} />
            </button>
          )}
        </div>
        <h3>{r.data.title}</h3>
        {r.data.date && (
          <p className="muted">
            {labelDate(r.data.date)}
            {r.data.time && ` · ${r.data.time}`}
          </p>
        )}
        {r.data.location && <p>{r.data.location}</p>}
        {r.data.notes && <p className="muted">{r.data.notes}</p>}
        {extra}
      </article>
    );
  }
  const memberColors = assignedMemberColors(members);
  function colorFor(name) {
    const person = members.find(member => member.data.title === name);
    return person ? memberColors.get(person.id) : "teal";
  }
  function calendarColor(name) {
    return { "--member-accent": MEMBER_COLORS[colorFor(name)] };
  }
  const heading = NAV.find((n) => n[0] === tab)?.[1];
  return (
    <div className={`hub ${dark ? "dark" : ""}`}>
      <aside className="hub-sidebar">
        <a
          className="hub-brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("home");
          }}
        >
          <img className="sidebar-brand-image" src="/anderson-family-hub-logo.webp" alt="Anderson Family Hub" width="720" height="216" />
        </a>
        <div className="family-home">
          <span>🏡</span>
          <div>
            <strong>Our happy place</strong>
            <small>A little more together.</small>
          </div>
        </div>
        <p className="nav-caption">FAMILY LIFE</p>
        <nav>
          {NAV.filter(
            (n) => parent || !["budget", "settings"].includes(n[0]),
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "nav-item active" : "nav-item"}
              onClick={() => setTab(id)}
            >
              <Icon size={19} />
              {label}
              {id === "chore" && (
                <small>
                  {chores.filter((r) => r.data.status === "open").length}
                </small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>✦</span>
          <strong>
            Sync the schedule.
            <br />
            Share the love.
          </strong>
          <p>Make space for what matters.</p>
        </div>
        <div className="account">
          <span className="person-avatar teal">{parent ? "P" : "K"}</span>
          <div>
            <strong>
              {demo
                ? "Sample family"
                : profile?.email?.split("@")[0] || "Family member"}
            </strong>
            <small>{parent ? "Parent space" : "Kids space"}</small>
          </div>
          <button
            className="icon-btn"
            onClick={onSignOut}
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="hub-main">
        <header className="hub-top">
          <span className="breadcrumb">
            Our family <span>/</span> {heading}
          </span>
          <div className="top-actions">
            <span className="today-label">
              {labelDate(today, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <button
              type="button"
              className="btn theme-toggle"
              role="switch"
              aria-label="Dark mode"
              aria-checked={dark}
              onClick={toggleTheme}
            >
              {dark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
              <span>{dark ? "Dark mode" : "Light mode"}</span>
            </button>
            <button
              className="icon-btn"
              aria-label="Open wall display"
              onClick={() => setWall(true)}
            >
              <Monitor size={19} />
            </button>
            <span className="person-avatar pink">AF</span>
          </div>
        </header>
        {demo && (
          <div className="sample-banner">
            Sample workspace · changes stay in this browser session.{" "}
            <a href="/login">Sign in to your real family</a>
          </div>
        )}
        <div className="hub-content">
          <div className="hub-heading">
            <div>
              <p className="eyebrow">
                A LITTLE ORGANIZATION. A LOT MORE FAMILY.
              </p>
              <h1>
                {tab === "home" ? "Home, together" : heading}
                <span className="heading-dot">.</span>
              </h1>
              <p className="muted">
                {tab === "home"
                  ? "The plans, little wins, and everyday moments that bring us together."
                  : "One shared space to make everyday life feel a little lighter."}
              </p>
            </div>
            <div className="heading-actions">
              {tab === "calendar" && (
                <button className="btn" onClick={exportCalendar}>
                  <Download size={16} /> Export
                </button>
              )}
              {parent && (
                <button
                  className="btn primary"
                  onClick={() =>
                    add(
                      {
                        home: "event",
                        calendar: "event",
                        school: "study",
                        settings: "member",
                        budget: "transaction",
                      }[tab] || tab,
                    )
                  }
                >
                  <Plus size={17} />{" "}
                  {
                    {
                      home: "New plan",
                      calendar: "Add event",
                      chore: "Add chore",
                      meal: "Plan a meal",
                      shopping: "Add item",
                      school: "Add assignment",
                      trip: "Plan a trip",
                      budget: "Add transaction",
                      settings: "Add member",
                    }[tab]
                  }
                </button>
              )}
            </div>
          </div>
          {notice && (
            <p className="inline-notice" role="status">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Dismiss">
                ×
              </button>
            </p>
          )}
          {tab === "home" && (
            <>
              <section className="welcome-grid">
                <div className="welcome-card">
                  <span className="pill">YOUR FAMILY AT A GLANCE</span>
                  <h2>
                    A good day starts
                    <br />
                    with a little plan.
                  </h2>
                  <p>
                    {labelDate(today, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <button
                    className="btn ink"
                    onClick={() => setTab("calendar")}
                  >
                    See the family calendar <ArrowUpRight size={17} />
                  </button>
                  <span className="sun-art" aria-hidden="true">
                    ☀
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon purple">
                    <CalendarDays />
                  </span>
                  <strong>
                    {get("event").filter((r) => r.data.date === today).length}
                  </strong>
                  <h3>Plans today</h3>
                  <p>Places to be, memories to make</p>
                </div>
                <div className="stat-card">
                  <span className="stat-icon teal">
                    <CheckCheck />
                  </span>
                  <strong>
                    {
                      chores.filter(
                        (r) =>
                          r.data.status === "paid" ||
                          r.data.status === "approved",
                      ).length
                    }
                    <small> / {chores.length}</small>
                  </strong>
                  <h3>Little wins</h3>
                  <p>Chores approved or paid</p>
                </div>
              </section>
              <div className="section-title">
                <div>
                  <h2>The week ahead</h2>
                  <p className="muted">A little of everything, for everyone.</p>
                </div>
                <button className="text-btn" onClick={() => setTab("calendar")}>
                  Full calendar <ArrowUpRight size={16} />
                </button>
              </div>
              <section className="week-preview">
                {weekDates(today).map((d) => (
                  <button
                    key={d}
                    className={
                      d === today ? "preview-day current" : "preview-day"
                    }
                    onClick={() => {
                      setDate(d);
                      setTab("calendar");
                      setView("day");
                    }}
                  >
                    <small>{labelDate(d, { weekday: "short" })}</small>
                    <strong>{new Date(d + "T12:00:00").getDate()}</strong>
                    {get("event")
                      .filter((r) => r.data.date === d)
                      .slice(0, 2)
                      .map((r) => (
                        <span
                          key={r.id}
                          className={`mini-event tint-${colorFor(r.data.member)}`}
                          style={calendarColor(r.data.member)}
                        >
                          {r.data.title}
                        </span>
                      ))}
                  </button>
                ))}
              </section>
              <div className="bottom-grid">
                <section className="surface">
                  <div className="section-title compact">
                    <h2>What’s for dinner?</h2>
                    <Utensils size={20} />
                  </div>
                  {meals.filter((r) => r.data.date === today).length ? (
                    meals
                      .filter((r) => r.data.date === today)
                      .map((r) => (
                        <div className="dinner" key={r.id}>
                          <span>🍽️</span>
                          <div>
                            <small>ON THE MENU</small>
                            <h3>{r.data.title}</h3>
                            <p className="muted">{r.data.notes}</p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="empty">Tonight’s menu is open.</p>
                  )}
                  <button className="text-btn" onClick={() => setTab("meal")}>
                    Open meal planner →
                  </button>
                </section>
                <section className="surface">
                  <div className="section-title compact">
                    <h2>A little teamwork</h2>
                    <CheckCheck size={20} />
                  </div>
                  {chores.slice(0, 3).map((r) => (
                    <div className="simple-row" key={r.id}>
                      <span
                        className={`person-avatar ${colorFor(r.data.member)}`}
                      >
                        {r.data.member?.[0] || "F"}
                      </span>
                      <div>
                        <strong>{r.data.title}</strong>
                        <small>
                          {r.data.member} · {r.data.status}
                        </small>
                      </div>
                      <span className="reward">{money(r.data.amount)}</span>
                    </div>
                  ))}
                  {!chores.length && (
                    <p className="empty">No chores assigned yet.</p>
                  )}
                </section>
              </div>
            </>
          )}
          {tab === "calendar" && (
            <>
              <div className="calendar-controls">
                <div className="date-controls">
                  <button className="btn" onClick={() => setDate(today)}>
                    Today
                  </button>
                  <button
                    className="icon-btn"
                    aria-label="Previous period"
                    onClick={() => {
                      if (view === "month") {
                        const d = new Date(date + "T12:00:00");
                        setDate(
                          dateKey(
                            new Date(d.getFullYear(), d.getMonth() - 1, 1),
                          ),
                        );
                      } else
                        setDate(shiftDate(date, view === "week" ? -7 : -1));
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label="Next period"
                    onClick={() => {
                      if (view === "month") {
                        const d = new Date(date + "T12:00:00");
                        setDate(
                          dateKey(
                            new Date(d.getFullYear(), d.getMonth() + 1, 1),
                          ),
                        );
                      } else setDate(shiftDate(date, view === "week" ? 7 : 1));
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>
                  <h2>{labelDate(date, { month: "long", year: "numeric" })}</h2>
                </div>
                <div className="segmented">
                  {["day", "week", "month"].map((v) => (
                    <button
                      className={view === v ? "selected" : ""}
                      onClick={() => setView(v)}
                      key={v}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="calendar-filters">
                <div className="member-chips">
                  {["All family", ...members.map((m) => m.data.title)].map(
                    (name, i) => (
                      <button
                        key={name}
                        onClick={() => setMember(name)}
                        aria-pressed={member === name}
                        style={i ? calendarColor(name) : undefined}
                        className={
                          member === name
                            ? "member-chip selected"
                            : "member-chip"
                        }
                      >
                        <span className={`dot ${i ? colorFor(name) : "ink"}`} />
                        {name}
                      </button>
                    ),
                  )}
                </div>
                <label className="search">
                  <Search size={16} />
                  <input
                    placeholder="Find a plan…"
                    aria-label="Search calendar"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className={`schedule ${view}`}>
                {(view === "month"
                  ? (() => {
                      const d = new Date(date + "T12:00:00");
                      const first = dateKey(
                        new Date(d.getFullYear(), d.getMonth(), 1),
                      );
                      return Array.from({ length: 42 }, (_, i) =>
                        shiftDate(weekDates(first)[0], i),
                      );
                    })()
                  : view === "week"
                    ? weekDates(date)
                    : [date]
                ).map((d) => (
                  <section
                    className={`schedule-day ${d === today ? "is-today" : ""}`}
                    key={d}
                  >
                    <button
                      className="day-heading"
                      onClick={() => {
                        setDate(d);
                        setView("day");
                      }}
                    >
                      <small>{labelDate(d, { weekday: "short" })}</small>
                      <strong>{new Date(d + "T12:00:00").getDate()}</strong>
                    </button>
                    <div className="day-events">
                      {events
                        .filter((r) => r.data.date === d)
                        .sort((a, b) =>
                          (a.data.time || "").localeCompare(b.data.time || ""),
                        )
                        .map((r) => (
                          <button
                            className={`event-block tint-${colorFor(r.data.member)}`}
                            style={calendarColor(r.data.member)}
                            key={r.id}
                            onClick={() =>
                              setDialog({
                                ...r,
                                data: { ...r.data },
                                readOnly: r.readOnly || !parent,
                              })
                            }
                          >
                            <small>{r.data.time || "All day"}</small>
                            <strong>{r.data.title}</strong>
                            <span>{r.data.member}</span>
                            {r.data.location && (
                              <small>{r.data.location}</small>
                            )}
                          </button>
                        ))}
                      {parent && (
                        <button
                          className="add-day"
                          aria-label={`Add event ${d}`}
                          onClick={() => add("event", { date: d })}
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
          {tab === "chore" && (
            <>
              <div className="summary-strip">
                <span>
                  <strong>
                    {chores.filter((r) => r.data.status === "open").length}
                  </strong>{" "}
                  To do
                </span>
                <span>
                  <strong>
                    {chores.filter((r) => r.data.status === "submitted").length}
                  </strong>{" "}
                  Awaiting approval
                </span>
                <span>
                  <strong>
                    {money(
                      chores
                        .filter((r) => r.data.status === "approved")
                        .reduce((s, r) => s + Number(r.data.amount || 0), 0),
                    )}
                  </strong>{" "}
                  Ready to pay
                </span>
              </div>
              <div className="cards-grid">
                {chores.map((r) =>
                  itemCard(
                    r,
                    <>
                      <div className="reward-line">
                        <strong>{money(r.data.amount)}</strong>
                        <span className="pill">{r.data.status}</span>
                      </div>
                      {r.data.payment_method && (
                        <p className="muted">
                          Paid manually via {r.data.payment_method}
                          {r.data.payment_reference &&
                            ` · ${r.data.payment_reference}`}
                        </p>
                      )}
                      {nextChoreStatus(r.data.status, parent) && (
                        <button
                          className="btn full"
                          disabled={
                            busy ||
                            (!parent && r.data.assigned_user_id !== profile.id)
                          }
                          onClick={() => {
                            const next = nextChoreStatus(r.data.status, parent);
                            if (!parent) onSubmitChore(r.id);
                            else if (next === "paid")
                              setDialog({
                                kind: "payment",
                                id: r.id,
                                data: {
                                  ...r.data,
                                  payment_method: "Cash",
                                  payment_reference: "",
                                },
                              });
                            else change(r, { status: next });
                          }}
                        >
                          {
                            {
                              open: "Mark complete",
                              submitted: "Approve chore",
                              approved: "Record payment",
                            }[r.data.status]
                          }
                        </button>
                      )}
                    </>,
                  ),
                )}
              </div>
              <p className="footnote">
                Children submit assigned chores. Parents approve rewards and
                record payments manually.
              </p>
            </>
          )}
          {tab === "meal" && (
            <>
              <div className="section-title">
                <h2>On the menu</h2>
                <span className="pill">Plan a little. Enjoy a lot.</span>
              </div>
              <div className="cards-grid">{meals.map((r) => itemCard(r))}</div>
              <div className="section-title">
                <h2>In the pantry</h2>
                {parent && (
                  <button className="btn" onClick={() => add("pantry")}>
                    <Plus size={16} /> Add pantry item
                  </button>
                )}
              </div>
              <section className="surface">
                {get("pantry").map((r) => (
                  <div className="simple-row" key={r.id}>
                    <span className="pantry-icon">🥬</span>
                    <div>
                      <strong>{r.data.title}</strong>
                      <small>
                        {r.data.quantity} {r.data.unit} · Use by{" "}
                        {r.data.date ? labelDate(r.data.date) : "not set"}
                      </small>
                    </div>
                    {parent && (
                      <>
                        <button
                          className="text-btn"
                          onClick={async () => {
                            const ok = await onSave({
                              kind: "shopping",
                              data: {
                                title: r.data.title,
                                quantity: 1,
                                unit: r.data.unit,
                                done: false,
                              },
                            });
                            if (ok !== false)
                              setNotice("Added to your shopping list.");
                          }}
                        >
                          Add to list
                        </button>
                        <button
                          className="icon-btn"
                          aria-label={`Edit ${r.data.title}`}
                          onClick={() =>
                            setDialog({ ...r, data: { ...r.data } })
                          }
                        >
                          <ArrowUpRight size={18} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {!get("pantry").length && (
                  <p className="empty">
                    Add ingredients to keep track of what’s at home.
                  </p>
                )}
              </section>
            </>
          )}
          {tab === "shopping" && (
            <section className="surface">
              {get("shopping").map((r) => (
                <div className="simple-row" key={r.id}>
                  <button
                    className={`check-box ${r.data.done ? "checked" : ""}`}
                    aria-label={`Toggle ${r.data.title}`}
                    disabled={!parent || busy}
                    onClick={() => change(r, { done: !r.data.done })}
                  >
                    {r.data.done && <Check size={16} />}
                  </button>
                  <div>
                    <strong className={r.data.done ? "struck" : ""}>
                      {r.data.title}
                    </strong>
                    <small>
                      {r.data.quantity} {r.data.unit}
                    </small>
                  </div>
                  {parent && (
                    <button
                      className="icon-btn"
                      onClick={() => onDelete(r.id)}
                      aria-label={`Delete ${r.data.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {!get("shopping").length && (
                <p className="empty">Your shopping list is clear.</p>
              )}
            </section>
          )}
          {tab === "school" && (
            <>
              <div className="section-title">
                <h2>Study time</h2>
              </div>
              <div className="cards-grid">
                {get("study").map((r) =>
                  itemCard(
                    r,
                    <>
                      <p className="pill">
                        {r.data.subject} · {r.data.done ? "Complete" : "To do"}
                      </p>
                      {parent && (
                        <button
                          className="btn full"
                          onClick={() => change(r, { done: !r.data.done })}
                        >
                          {r.data.done ? "Reopen" : "Complete assignment"}
                        </button>
                      )}
                    </>,
                  ),
                )}
              </div>
              {parent && (
                <>
                  <div className="section-title">
                    <h2>School progress</h2>
                    <button className="btn" onClick={() => add("grade")}>
                      <Plus size={16} /> Add grade
                    </button>
                  </div>
                  <div className="cards-grid">
                    {get("grade").map((r) =>
                      itemCard(
                        r,
                        <strong className="grade-value">{r.data.grade}</strong>,
                      ),
                    )}
                  </div>
                </>
              )}
            </>
          )}
          {tab === "trip" && (
            <div className="cards-grid">
              {get("trip").map((r) =>
                itemCard(
                  r,
                  <>
                    <p>{r.data.end && `Through ${labelDate(r.data.end)}`}</p>
                    <p className="pill">Trip budget {money(r.data.amount)}</p>
                  </>,
                ),
              )}
            </div>
          )}
          {tab === "budget" && parent && (
            <>
              <div className="calendar-controls">
                <h2>Room for what matters</h2>
                <input
                  type="month"
                  aria-label="Budget month"
                  value={date.slice(0, 7)}
                  onChange={(e) =>
                    e.target.value && setDate(e.target.value + "-01")
                  }
                />
                <button className="btn" onClick={() => add("budget")}>
                  <Plus size={16} /> Add category
                </button>
              </div>
              <div className="summary-strip">
                <span>
                  <strong>
                    {money(
                      budgets.reduce(
                        (s, b) => s + Number(b.data.amount || 0),
                        0,
                      ),
                    )}
                  </strong>{" "}
                  Planned
                </span>
                <span>
                  <strong>
                    {money(budgets.reduce((s, b) => s + b.spent, 0))}
                  </strong>{" "}
                  Spent
                </span>
                <span>
                  <strong>
                    {money(budgets.reduce((s, b) => s + b.remaining, 0))}
                  </strong>{" "}
                  Remaining
                </span>
              </div>
              <div className="cards-grid">
                {budgets.map((r) =>
                  itemCard(
                    r,
                    <>
                      <div className="budget-amount">
                        {money(r.spent)}{" "}
                        <small>of {money(r.data.amount)}</small>
                      </div>
                      <progress
                        value={Math.min(r.spent, Number(r.data.amount) || 1)}
                        max={Number(r.data.amount) || 1}
                      />
                      <p className={r.remaining < 0 ? "over-budget" : "muted"}>
                        {money(Math.abs(r.remaining))}{" "}
                        {r.remaining < 0 ? "over budget" : "left this month"}
                      </p>
                    </>,
                  ),
                )}
              </div>
              <div className="section-title">
                <h2>Recent transactions</h2>
              </div>
              <section className="surface">
                {get("transaction")
                  .filter((r) => r.data.date?.startsWith(date.slice(0, 7)))
                  .map((r) => (
                    <div className="simple-row" key={r.id}>
                      <span className="stat-icon purple">
                        <Wallet size={19} />
                      </span>
                      <div>
                        <strong>{r.data.title}</strong>
                        <small>
                          {r.data.date} ·{" "}
                          {get("budget").find((b) => b.id === r.data.category)
                            ?.data.title || "Uncategorized"}{" "}
                          · {r.data.type}
                        </small>
                      </div>
                      <strong>
                        {r.data.type === "income" ? "+" : "−"}
                        {money(r.data.amount)}
                      </strong>
                      <button
                        className="icon-btn"
                        aria-label={`Edit ${r.data.title}`}
                        onClick={() => setDialog({ ...r, data: { ...r.data } })}
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </div>
                  ))}
              </section>
            </>
          )}
          {tab === "settings" && parent && (
            <>
              <div className="section-title">
                <h2>The people who make it home</h2>
                <Users size={21} />
              </div>
              <div className="cards-grid">
                {members.map((r) => itemCard(r, <p>{r.data.role}</p>))}
              </div>
              <div className="section-title">
                <h2>Wall display & memories</h2>
                <button className="btn" onClick={() => add("photo")}>
                  <Plus size={16} /> Add photo
                </button>
              </div>
              <section className="surface">
                <p className="muted">
                  Your photos, a big clock, and the next family plans. Tap
                  anywhere or press Escape to return.
                </p>
                <button className="btn primary" onClick={() => setWall(true)}>
                  <Monitor size={17} /> Start wall display
                </button>
                <a className="btn" href={demo ? "/demo/kiosk" : "/kiosk"}>
                  <CalendarDays size={17} /> Calendar kiosk
                </a>
                <div className="photo-grid">
                  {get("photo").map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setDialog({ ...r, data: { ...r.data } })}
                    >
                      <img src={r.data.url} alt={r.data.title} loading="lazy" />
                      <span>{r.data.title}</span>
                    </button>
                  ))}
                </div>
              </section>
              {profile.role === "super_admin" && (
                <AccessPanel
                  accounts={accounts}
                  access={access}
                  profile={profile}
                  onManage={onManageAccess}
                  busy={busy}
                />
              )}
              <section className="surface connection-note">
                <h2>Connected with care</h2>
                <p>
                  Google, Apple, and Microsoft sign-in require provider setup in Supabase.
                  Calendar export is available. Automatic calendar sync needs a separate integration.
                </p>
                <p>
                  Family access uses authenticated roles. Adding a name here
                  creates a planner profile, not a login account.
                </p>
              </section>
            </>
          )}
          {tab !== "home" &&
            !["calendar", "settings", "budget", "meal", "shopping"].includes(
              tab,
            ) &&
            !records.some(
              (r) => r.kind === { school: "study" }[tab] || r.kind === tab,
            ) && (
              <p className="empty">A fresh start. Add your first plan above.</p>
            )}
          <footer className="hub-footer">
            <span>Made for the moments in between.</span>
            <span>
              Anderson Family Hub <span>✦</span>
            </span>
          </footer>
        </div>
      </main>
      {dialog && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDialog(null)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onKeyDown={(e) => {
              if (e.key === "Escape") setDialog(null);
              if (e.key === "Tab") {
                const els = e.currentTarget.querySelectorAll(
                  "button,input,select,textarea",
                );
                const first = els[0],
                  last = els[els.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <header>
              <div>
                <p className="eyebrow">MAKE A LITTLE PLAN</p>
                <h2 id="dialog-title">
                  {dialog.kind === "payment"
                    ? "Record a payment"
                    : `${dialog.id ? "Edit" : "New"} ${dialog.kind}`}
                </h2>
              </div>
              <button
                className="icon-btn"
                onClick={() => setDialog(null)}
                aria-label="Close dialog"
              >
                <X />
              </button>
            </header>
            <form
              onSubmit={
                dialog.kind === "payment"
                  ? async (e) => {
                      e.preventDefault();
                      if (
                        (await onSave({
                          id: dialog.id,
                          kind: "chore",
                          data: {
                            ...dialog.data,
                            status: "paid",
                            paid_at: new Date().toISOString(),
                          },
                        })) !== false
                      )
                        setDialog(null);
                    }
                  : save
              }
            >
              {(dialog.kind === "payment"
                ? [
                    ["payment_method", "Payment method", "payment"],
                    ["payment_reference", "Reference / note"],
                  ]
                : FIELDS[dialog.kind] || []
              ).map(([key, label, type = "text"], i) => (
                <label key={key}>
                  {label}
                  {[
                    "member",
                    "category",
                    "mealtype",
                    "transactiontype",
                    "color",
                    "budget",
                    "payment",
                  ].includes(type) ? (
                    <select
                      autoFocus={i === 0}
                      disabled={dialog.readOnly}
                      value={dialog.data[key] || ""}
                      onChange={(e) =>
                        setDialog({
                          ...dialog,
                          data: { ...dialog.data, [key]: e.target.value },
                        })
                      }
                    >
                      <option value="">Choose…</option>
                      {(type === "member"
                        ? ["Family", ...members.map((m) => m.data.title)]
                        : type === "category"
                          ? [
                              "Family",
                              "School",
                              "Work",
                              "Daycare",
                              "Activities",
                              "Appointments",
                              "Holidays",
                            ]
                          : type === "mealtype"
                            ? ["Breakfast", "Lunch", "Dinner", "Snack"]
                            : type === "transactiontype"
                              ? ["expense", "income"]
                              : type === "color"
                                ? COLORS
                                : type === "payment"
                                  ? [
                                      "Cash",
                                      "Cash App",
                                      "Venmo",
                                      "Zelle",
                                      "Other",
                                    ]
                                  : get("budget").map((b) => ({
                                      value: b.id,
                                      label: b.data.title,
                                    }))
                      ).map((x) => (
                        <option key={x.value || x} value={x.value || x}>
                          {x.label || x}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      autoFocus={i === 0}
                      disabled={dialog.readOnly}
                      type={type === "video" ? "text" : type}
                      inputMode={type === "video" ? "url" : undefined}
                      data-video-url={type === "video" ? "" : undefined}
                      placeholder={type === "video" ? "https://…" : undefined}
                      min={type === "number" ? 0 : undefined}
                      step={type === "number" ? "0.01" : undefined}
                      maxLength={type === "text" ? 500 : undefined}
                      required={
                        key === "title" ||
                        key === "date" ||
                        key === "amount" ||
                        key === "payment_method" ||
                        key === "url"
                      }
                      value={dialog.data[key] ?? ""}
                      onChange={(e) => {
                        if (type === "video") e.target.setCustomValidity("");
                        setDialog({
                          ...dialog,
                          data: {
                            ...dialog.data,
                            [key]:
                              type === "number"
                                ? e.target.value === ""
                                  ? ""
                                  : Number(e.target.value)
                                : e.target.value,
                          },
                        });
                      }}
                    />
                  )}
                </label>
              ))}
              {dialog.kind === "payment" && (
                <p className="footnote">
                  Record only after sending payment yourself. This does not
                  transfer money.
                </p>
              )}
              <div className="modal-actions">
                {dialog.id &&
                  parent &&
                  !dialog.readOnly &&
                  dialog.kind !== "payment" && (
                    <button
                      type="button"
                      className="btn danger"
                      disabled={busy}
                      onClick={async () => {
                        if ((await onDelete(dialog.id)) !== false)
                          setDialog(null);
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  )}
                <button
                  type="button"
                  className="btn"
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>
                {!dialog.readOnly && (
                  <button className="btn primary" disabled={busy}>
                    {busy
                      ? "Saving…"
                      : dialog.kind === "payment"
                        ? "Confirm payment sent"
                        : "Save plan"}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
      {wall && (
        <Wall records={records} clock={clock} onClose={() => setWall(false)} />
      )}
    </div>
  );
}
function Wall({ records, clock, onClose }) {
  useEffect(() => {
    const f = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  const photos = records.filter((r) => r.kind === "photo");
  const photo = photos.length
    ? photos[Math.floor(clock.getTime() / 15000) % photos.length]
    : null;
  return (
    <button
      className="wall-display"
      onClick={onClose}
      aria-label="Close wall display"
      style={{
        backgroundImage: photo
          ? `linear-gradient(0deg,rgba(0,0,0,.65),rgba(0,0,0,.2)),url("${encodeURI(photo.data.url).replace(/"/g, "%22")}")`
          : undefined,
      }}
    >
      <span className="wall-clock">
        {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span className="wall-date">
        {clock.toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </span>
      <div className="wall-agenda">
        <small>UP NEXT</small>
        {records
          .filter((r) => r.kind === "event" && (r.data.date > dateKey(clock) || (r.data.date === dateKey(clock) && (!r.data.time || r.data.time >= `${String(clock.getHours()).padStart(2, "0")}:${String(clock.getMinutes()).padStart(2, "0")}`))))
          .sort((a, b) =>
            (a.data.date + (a.data.time || "")).localeCompare(
              b.data.date + (b.data.time || ""),
            ),
          )
          .slice(0, 3)
          .map((r) => (
            <div key={r.id}>
              <strong>{r.data.title}</strong>
              <span>
                {r.data.date} · {r.data.time || "All day"}
              </span>
            </div>
          ))}
      </div>
      <small>Tap anywhere to return</small>
    </button>
  );
}

function AccessPanel({ accounts, access, profile, onManage, busy }) {
  const [email, setEmail] = useState(""),
    [role, setRole] = useState("member");
  return (
    <section className="surface connection-note">
      <h2>Family login access</h2>
      <p>
        Authorize the email a person uses to sign in, then ask them to choose Join my family. Member
        accounts can submit their assigned chores; admin accounts can manage
        family plans. This does not send an invitation.
      </p>
      <form
        className="access-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onManage("add", email, role)) setEmail("");
        }}
      >
        <label>
          Email
          <input
            aria-label="Authorize email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Access
          <select
            aria-label="New account role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="member">Member / child</option>
            <option value="admin">Parent / admin</option>
          </select>
        </label>
        <button className="btn" disabled={busy}>
          Authorize email
        </button>
      </form>
      {access.map((a) => (
        <div className="simple-row" key={a.email}>
          <div>
            <strong>{a.email}</strong>
            <small>Authorized to join · {a.role}</small>
          </div>
          <button
            className="text-btn"
            disabled={busy}
            onClick={() => onManage("remove", a.email)}
          >
            Remove authorization
          </button>
        </div>
      ))}
      {accounts.map((a) => (
        <div className="simple-row" key={a.id}>
          <div>
            <strong>{a.email}</strong>
            <small>{a.id}</small>
          </div>
          {a.id !== profile.id && a.role !== "super_admin" ? (
            <select
              aria-label={`Role for ${a.email}`}
              value={a.role}
              disabled={busy}
              onChange={(e) => onManage("role", a.id, e.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          ) : (
            <span className="pill">{a.role}</span>
          )}
        </div>
      ))}
    </section>
  );
}
