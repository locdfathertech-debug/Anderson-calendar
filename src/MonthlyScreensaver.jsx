import { monthDays, kioskMemberStyle } from "./lib/kiosk.js";
import { holidays } from "./lib/planner.js";

/**
 * Read-only, current-month wall calendar for idle / kiosk displays.
 * Uses the same records, color assignments and holidays as the live calendar.
 */
export default function MonthlyScreensaver({ now, records, members, colors, onWake }) {
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const month = today.slice(0, 7);
  const days = monthDays(month);
  const events = [
    ...records.filter(record => record.kind === "event"),
    ...[...new Set(days.map(day => Number(day.slice(0, 4))))].flatMap(holidays),
  ];
  const byDay = new Map(days.map(day => [day, []]));
  for (const record of events) {
    if (byDay.has(record.data?.date)) byDay.get(record.data.date).push(record);
  }
  for (const plans of byDay.values()) {
    plans.sort((a, b) => (a.data.time || "").localeCompare(b.data.time || ""));
  }
  const memberColor = name => {
    const person = members.find(r => r.data.title === name);
    return kioskMemberStyle(person ? colors.get(person.id) : "teal");
  };

  return (
    <div
      className="kiosk-screensaver kiosk-month-screensaver"
      role="button"
      tabIndex={0}
      aria-label="Full-screen monthly family calendar. Tap or press a key to return."
      onClick={onWake}
      onKeyDown={event => { if (event.key !== "Tab") { event.preventDefault(); onWake(); } }}
    >
      <div className="kiosk-saver-header">
        <div>
          <p className="kiosk-eyebrow">ANDERSON FAMILY CALENDAR</p>
          <h1>{now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h1>
        </div>
        <div className="kiosk-saver-clock">
          <time dateTime={now.toISOString()}>{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
          <span>{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</span>
        </div>
      </div>
      <div className="kiosk-saver-weekdays" aria-hidden="true">
        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => <span key={day}>{day}</span>)}
      </div>
      <div className="kiosk-saver-grid" style={{ "--week-count": days.length / 7 }}>
        {days.map(day => {
          const plans = byDay.get(day) || [];
          return <div key={day} className={`kiosk-saver-day${day.startsWith(month) ? "" : " outside"}${day === today ? " today" : ""}`} aria-label={`${day}, ${plans.length} events`}>
            <span className="kiosk-saver-day-number">{Number(day.slice(-2))}</span>
            <div className="kiosk-saver-events">
              {plans.slice(0, 3).map(plan => <div key={plan.id} className="kiosk-saver-event" style={memberColor(plan.data.member)} title={plan.data.title}>
                {plan.data.time && <small>{plan.data.time}</small>}
                <span>{plan.data.title}</span>
              </div>)}
              {plans.length > 3 && <small className="kiosk-saver-more">+{plans.length - 3} more</small>}
            </div>
          </div>;
        })}
      </div>
      <div className="kiosk-saver-footer"><span>Today is highlighted</span><span>Tap anywhere to return to the family dashboard</span></div>
    </div>
  );
}
