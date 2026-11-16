import { Play, Plus } from "lucide-react";
import MemberAvatar from "./MemberAvatar.jsx";
import { buildWeekTimeline } from "./lib/weekTimeline.js";
import { videoSource, categoryInfo } from "./lib/video.js";

const labelDate = day => new Date(`${day}T12:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
const timeLabel = minute => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

export default function WeekTimeline({ events, anchor, today, members = [], memberStyle, onSelectDay, onCreateEvent, canCreate = false }) {
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
          {canCreate && onCreateEvent && Array.from({ length: hourCount }, (_, i) => {
            const minute = startMinute + i * 60;
            return <button key={minute} type="button" className="kiosk-week-create-slot"
              style={{ top: i * 80, height: 80 }}
              title={`Add event on ${labelDate(day)} at ${timeLabel(minute)}`}
              aria-label={`Add event on ${labelDate(day)} at ${timeLabel(minute)}`}
              onClick={() => onCreateEvent(day, timeLabel(minute))}>
              <Plus size={16} aria-hidden="true" />
            </button>;
          })}
          {items.filter(item => item.dayIndex === dayIndex).map(item => {
            const { record, lane, laneCount } = item;
            const start = item.displayStart ?? item.start, end = item.displayEnd ?? item.end;
            return <button key={record.id} className="kiosk-timeline-event" style={{ ...memberStyle(record.data.member), top: (start - startMinute) / 60 * 80, height: (end - start) / 60 * 80, left: `calc(${lane / laneCount * 100}% + 2px)`, width: `calc(${100 / laneCount}% - 4px)` }} aria-label={`${record.data.title}, ${labelDate(day)}, ${record.data.time}, ${record.data.member || "Family"}`} onClick={() => onSelectDay(day)}>
              <time>{record.data.time}{record.data.end_time && record.data.end_time > record.data.time ? ` – ${record.data.end_time}` : ""}</time>
              <strong>{categoryInfo(record.data.category).icon} {record.data.title}</strong>
              <small className="kiosk-week-event-footer">
                <span className="kiosk-week-event-avatars" aria-label={`Assigned to ${record.data.member || "Family"}`}>
                  {(record.data.member && record.data.member !== "Family"
                    ? members.filter(person => person.data.title === record.data.member)
                    : members.slice(0, 3)).map(person =>
                    <MemberAvatar key={person.id} className="kiosk-week-member-avatar"
                      name={person.data.title} url={person.data.avatar_url} style={memberStyle(person.data.title)} />
                  )}
                </span>
                <span className="kiosk-week-event-member">{record.data.member || "Family"}</span>
                {videoSource(record.data.video_url) && <Play size={12} aria-label="Video attached" />}
              </small>
            </button>;
          })}
        </div>)}
      </div>
    </div>
  </div>;
}
