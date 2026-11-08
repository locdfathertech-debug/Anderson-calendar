import { Play } from "lucide-react";
import { buildWeekTimeline } from "./lib/weekTimeline.js";
import { videoSource, categoryInfo } from "./lib/video.js";

const labelDate = day => new Date(`${day}T12:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
const timeLabel = minute => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

export default function WeekTimeline({ events, anchor, today, memberStyle, onSelectDay }) {
  const timeline = buildWeekTimeline(events, anchor);
  const { days, startMinute, endMinute, items, allDay } = timeline;
  const hourCount = (endMinute - startMinute) / 60;
  const height = hourCount * 80;
  const lanes = Math.max(1, ...items.map(item => item.laneCount));
  const style = { "--timeline-min-width": `${56 + 7 * Math.max(100, lanes * 52)}px` };
  return <div className="kiosk-week-scroll" style={style} tabIndex={0} role="region" aria-label="Weekly timeline; scroll for more hours and days">
    <div className="kiosk-week-canvas">
      <div className="kiosk-week-header">
        <span className="kiosk-week-zone">Time</span>
        {days.map(day => <button key={day} className="kiosk-week-day" aria-current={day === today ? "date" : undefined} aria-label={`View ${labelDate(day)} events`} onClick={() => onSelectDay(day)}>
          <span>{new Date(`${day}T12:00:00`).toLocaleDateString([], { weekday: "short" })}</span><strong>{Number(day.slice(-2))}</strong>
        </button>)}
      </div>
      <div className="kiosk-week-all-day"><span className="kiosk-week-zone">All day</span>{days.map((day, dayIndex) => <div key={day}>
        {allDay.filter(item => item.dayIndex === dayIndex).map(({ record }) => <button key={record.id} className="kiosk-week-all-event" style={memberStyle(record.data.member)} onClick={() => onSelectDay(day)}>{record.data.title}</button>)}
      </div>)}</div>
      <div className="kiosk-week-body" style={{ height }}>
        <div className="kiosk-time-gutter">{Array.from({ length: hourCount }, (_, i) => <time key={i} style={{ top: i * 80 }}>{timeLabel(startMinute + i * 60)}</time>)}</div>
        {days.map((day, dayIndex) => <div key={day} className={`kiosk-week-column ${day === today ? "today" : ""}`}>
          {items.filter(item => item.dayIndex === dayIndex).map(item => {
            const { record, lane, laneCount } = item;
            const start = item.displayStart ?? item.start, end = item.displayEnd ?? item.end;
            return <button key={record.id} className="kiosk-timeline-event" style={{ ...memberStyle(record.data.member), top: (start - startMinute) / 60 * 80, height: (end - start) / 60 * 80, left: `calc(${lane / laneCount * 100}% + 2px)`, width: `calc(${100 / laneCount}% - 4px)` }} aria-label={`${record.data.title}, ${labelDate(day)}, ${record.data.time}, ${record.data.member || "Family"}`} onClick={() => onSelectDay(day)}>
              <time>{record.data.time}</time><strong>{categoryInfo(record.data.category).icon} {record.data.title}</strong><small>{record.data.member || "Family"}{videoSource(record.data.video_url) && <Play size={12} aria-label="Video attached" />}</small>
            </button>;
          })}
        </div>)}
      </div>
    </div>
  </div>;
}
