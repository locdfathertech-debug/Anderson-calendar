import { dateKey, shiftDate } from "./planner.js";
import { isMemberColor, memberColorHex, memberColorInk, MEMBER_REFERENCE_PALETTE as MEMBER_PALETTE } from "./memberColors.js";

function firstOfMonth(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new RangeError("Month must use YYYY-MM format");
  }
  const first = new Date(`${month}-01T12:00:00`);
  if (dateKey(first).slice(0, 7) !== month) {
    throw new RangeError("Invalid calendar month");
  }
  return first;
}

// Include only the complete Sunday–Saturday weeks occupied by this month.
export function monthDays(month) {
  const first = firstOfMonth(month);
  const last = new Date(first);
  last.setMonth(last.getMonth() + 1, 0);
  const count = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
  const start = shiftDate(dateKey(first), -first.getDay());
  return Array.from({ length: count }, (_, i) => shiftDate(start, i));
}

export function shiftMonth(month, offset) {
  if (!Number.isInteger(offset)) throw new RangeError("Month offset must be an integer");
  const first = firstOfMonth(month);
  first.setMonth(first.getMonth() + offset);
  return dateKey(first).slice(0, 7);
}

function validDate(key) {
  return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key)
    && dateKey(new Date(`${key}T12:00:00`)) === key;
}

// All-day events remain relevant throughout their date; timed events must not
// have started already. Keep source records untouched for detail dialogs.
export function upcomingEvents(events, now = new Date()) {
  const today = dateKey(now);
  return events.filter(({ data }) => {
    if (!data || !validDate(data.date) || data.date < today) return false;
    if (!data.time) return true;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)) return false;
    return new Date(`${data.date}T${data.time}:00`) >= now;
  }).sort((a, b) => a.data.date.localeCompare(b.data.date)
    || (a.data.time || "").localeCompare(b.data.time || "")
    || a.id.localeCompare(b.id));
}

export function kioskMemberStyle(color) {
  const key = typeof color === "string" ? color.toLowerCase() : "";
  const [accent, ink] = Object.prototype.hasOwnProperty.call(MEMBER_PALETTE, key)
    ? MEMBER_PALETTE[key]
    : isMemberColor(key) ? [memberColorHex(key), memberColorInk(key)] : MEMBER_PALETTE.teal;
  return { "--member-color": accent, "--member-ink": ink };
}

export function isBounty(data) {
  return !data.assigned_user_id && (!data.member || data.member === "Family");
}
