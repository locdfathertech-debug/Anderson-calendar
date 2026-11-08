// Stable palette shared by member tabs, calendar events, and the tablet calendar.
export const MEMBER_COLORS = {
  teal: "#36c7bb",
  orange: "#ff8a18",
  purple: "#bc9aff",
  pink: "#f591be",
  blue: "#71b9ff",
  amber: "#f4ce64",
  turquoise: "#2dd4bf",
  sky: "#38bdf8",
  violet: "#a78bfa",
  rose: "#f472b6",
  lime: "#a3e635",
  coral: "#ff956b",
};

export function assignedMemberColors(members) {
  const assignments = new Map();
  const used = new Set();
  const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id));
  for (const member of sorted) {
    if (MEMBER_COLORS[member.data.color]) {
      assignments.set(member.id, member.data.color);
      used.add(member.data.color);
    }
  }
  for (const member of sorted) {
    if (assignments.has(member.id)) continue;
    const next = Object.keys(MEMBER_COLORS).find(color => !used.has(color))
      || Object.keys(MEMBER_COLORS)[assignments.size % Object.keys(MEMBER_COLORS).length];
    assignments.set(member.id, next);
    used.add(next);
  }
  return assignments;
}

export function nextMemberColor(members) {
  const used = new Set(assignedMemberColors(members).values());
  return Object.keys(MEMBER_COLORS).find(color => !used.has(color))
    || Object.keys(MEMBER_COLORS)[members.length % Object.keys(MEMBER_COLORS).length];
}
