import { useMemo } from "react";
import "./yearCalendar.css";
import { monthDays } from "./lib/kiosk.js";
import { yearMonths, eventCountsByDay } from "./lib/yearCalendar.js";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function YearCalendar({ year, events = [], today, onSelectMonth }) {
  const months = useMemo(() => yearMonths(year).map(month => ({
    month,
    name: new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: "long" }),
    days: monthDays(month),
  })), [year]);
  const counts = useMemo(() => eventCountsByDay(events, year), [events, year]);

  return (
    <div className="kiosk-year-grid" role="group" aria-label={`${year} year calendar`}>
      {months.map(({ month, name, days }) => {
        const count = days.reduce((sum, day) => sum + (day.startsWith(month) ? counts.get(day) || 0 : 0), 0);
        return (
          <button
            className="kiosk-year-month"
            key={month}
            type="button"
            style={{ minWidth: 48, minHeight: 48 }}
            aria-label={`${name} ${year}, ${count} ${count === 1 ? "event" : "events"}. Open month`}
            onClick={() => onSelectMonth(month)}
          >
            <strong>{name}</strong>
            <span className="kiosk-year-days" aria-hidden="true">
              {WEEKDAYS.map((label, index) => <span className="weekday" key={`weekday-${index}`}>{label}</span>)}
              {days.map(day => {
                const outside = !day.startsWith(month);
                const hasEvents = !outside && Boolean(counts.get(day));
                return (
                  <span
                    key={day}
                    className={[outside ? "outside" : "", hasEvents ? "has-events" : "", day === today ? "today" : ""].filter(Boolean).join(" ")}
                  >
                    {Number(day.slice(-2))}
                    {hasEvents && <i className="event-dot" />}
                  </span>
                );
              })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
