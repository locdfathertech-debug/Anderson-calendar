import { CalendarDays, Clock, MapPin, Plus, Play } from "lucide-react";
import { buildAgenda } from "./lib/agenda.js";
import MemberAvatar from "./MemberAvatar.jsx";
import { categoryInfo, videoSource } from "./lib/video.js";

const longDate = day => new Date(`${day}T12:00:00`).toLocaleDateString([], {
  weekday:"long",month:"long",day:"numeric",year:"numeric"
});

export default function AgendaView({
  events, members = [], anchor, mode = "day", today, memberStyle,
  onSelectDay, onCreateEvent, canCreate = false
}) {
  const groups=buildAgenda(events,anchor,mode);
  return <div className="kiosk-agenda-scroll" role="region" aria-label={mode==="day" ? "Daily agenda" : "14-day family agenda"} tabIndex={0}>
    <div className="kiosk-agenda-body">
      {groups.map(group=><section key={group.date} className="kiosk-agenda-group" aria-label={longDate(group.date)}>
        <header className="kiosk-agenda-heading">
          <div><CalendarDays size={17} aria-hidden="true"/>
            <h2>{longDate(group.date)}</h2>
            {group.date === today && <span className="kiosk-agenda-today">Today</span>}
          </div>
          {canCreate && onCreateEvent && <button type="button" className="kiosk-agenda-add"
            aria-label={`Add event on ${longDate(group.date)}`}
            onClick={()=>onCreateEvent(group.date)}><Plus size={16}/> Add</button>}
        </header>
        {group.items.length ? <ol className="kiosk-agenda-items">
          {group.items.map(record=>{
            const event=record.data;
            const assigned=event.member && event.member!=="Family"
              ? members.filter(person=>person.data.title===event.member)
              : members.slice(0,3);
            return <li key={record.id}>
              <button type="button" className="kiosk-agenda-event"
                style={memberStyle(event.member)}
                onClick={()=>onSelectDay(group.date)}
                aria-label={`View ${event.title}, ${event.time || "all day"} on ${longDate(group.date)}`}>
                <span className="kiosk-agenda-time"><Clock size={14} aria-hidden="true"/>
                  {event.time || "All day"}{event.end_time && event.time && event.end_time>event.time ? `–${event.end_time}` : ""}
                </span>
                <span className="kiosk-agenda-details">
                  <strong>{categoryInfo(event.category).icon && <span aria-hidden="true">{categoryInfo(event.category).icon} </span>}{event.title}</strong>
                  <span className="kiosk-agenda-meta">
                    <span className="kiosk-agenda-avatars" aria-label={`Assigned to ${event.member || "Family"}`}>
                      {assigned.map(person=><MemberAvatar key={person.id} name={person.data.title} url={person.data.avatar_url}
                        className="kiosk-agenda-avatar" style={memberStyle(person.data.title)}/>)}
                    </span>
                    {event.member || "Family"}
                    {event.location && <span><MapPin size={13} aria-hidden="true"/> {event.location}</span>}
                    {videoSource(event.video_url) && <Play size={13} aria-label="Video attached"/>}
                  </span>
                </span>
              </button>
            </li>;
          })}
        </ol> : <p className="kiosk-agenda-empty">No events planned for this day.</p>}
      </section>)}
    </div>
  </div>;
}
