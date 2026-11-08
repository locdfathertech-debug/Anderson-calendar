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
  ocean: "#3b82f6",
  navy: "#1e3a8a",
  indigo: "#6366f1",
  tangerine: "#fb923c",
  emerald: "#10b981",
  forest: "#166534",
  lavender: "#c4b5fd",
  peach: "#fdba74",
  brown: "#92400e",
  burgundy: "#881337",
  slate: "#64748b",
  black: "#111111",
};

export const MEMBER_COLOR_LABELS = {
  teal: "Green", orange: "Deep red", purple: "White", pink: "Red", blue: "Gray", amber: "Yellow",
  turquoise: "Turquoise", sky: "Sky blue", violet: "Violet", rose: "Rose", lime: "Lime", coral: "Coral",
  ocean: "Blue", navy: "Navy", indigo: "Indigo", tangerine: "Orange", emerald: "Emerald",
  forest: "Forest green", lavender: "Lavender", peach: "Peach", brown: "Brown", burgundy: "Burgundy",
  slate: "Slate", black: "Black",
};

function normalizeMemberColor(value) {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  return Object.prototype.hasOwnProperty.call(MEMBER_COLORS, normalized) || /^#[0-9a-f]{6}$/.test(normalized)
    ? normalized : null;
}

export function isMemberColor(value) { return normalizeMemberColor(value) !== null; }

export function memberColorHex(value) {
  const color = normalizeMemberColor(value);
  return color?.startsWith("#") ? color : MEMBER_COLORS[color] || MEMBER_COLORS.teal;
}

// Choose the higher-contrast ink instead of assuming a custom color is bright.
export function memberColorInk(value) {
  const hex = memberColorHex(value).slice(1);
  const [red, green, blue] = [0, 2, 4].map(offset => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#ffffff";
}

function usedColors(assignments) {
  return new Set([...assignments].flatMap(color => [color, memberColorHex(color)]));
}

export function assignedMemberColors(members) {
  const assignments = new Map();
  const used = new Set();
  const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id));
  for (const member of sorted) {
    const color = normalizeMemberColor(member.data.color);
    if (color) {
      assignments.set(member.id, color);
      used.add(color);
      used.add(memberColorHex(color));
    }
  }
  for (const member of sorted) {
    if (assignments.has(member.id)) continue;
    const next = Object.keys(MEMBER_COLORS).find(color => !used.has(color) && !used.has(MEMBER_COLORS[color]))
      || Object.keys(MEMBER_COLORS)[assignments.size % Object.keys(MEMBER_COLORS).length];
    assignments.set(member.id, next);
    used.add(next);
    used.add(MEMBER_COLORS[next]);
  }
  return assignments;
}

export function nextMemberColor(members) {
  const used = usedColors(assignedMemberColors(members).values());
  return Object.keys(MEMBER_COLORS).find(color => !used.has(color) && !used.has(MEMBER_COLORS[color]))
    || Object.keys(MEMBER_COLORS)[members.length % Object.keys(MEMBER_COLORS).length];
}

// Keep an explicit choice or a legacy member's visible fallback stable on save.
export function memberColorForSave(record, members) {
  const color = normalizeMemberColor(record.data.color);
  return color || assignedMemberColors(members).get(record.id)
    || nextMemberColor(members.filter(member => member.id !== record.id));
}
