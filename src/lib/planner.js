export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function shiftDate(key, n) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
export function weekDates(key) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => shiftDate(dateKey(d), i));
}
export const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) || 0,
  );
export function budgetTotals(records, month) {
  const budgets = records.filter((r) => r.kind === "budget");
  return budgets.map((b) => {
    const spent = records
      .filter(
        (r) =>
          r.kind === "transaction" &&
          r.data.category === b.id &&
          r.data.type !== "income" &&
          r.data.date?.startsWith(month),
      )
      .reduce((sum, r) => sum + Number(r.data.amount || 0), 0);
    return { ...b, spent, remaining: Number(b.data.amount || 0) - spent };
  });
}
export function nextChoreStatus(status, admin) {
  if (status === "open") return "submitted";
  if (admin && status === "submitted") return "approved";
  if (admin && status === "approved") return "paid";
  return null;
}
export function icsExport(events) {
  const esc = (s) =>
    String(s || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Anderson//Family Hub//EN",
    ...events.flatMap((r) => [
      "BEGIN:VEVENT",
      `UID:${r.id}@anderson-family`,
      `DTSTAMP:${new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
      `DTSTART;VALUE=DATE:${r.data.date.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${shiftDate(r.data.date, 1).replace(/-/g, "")}`,
      `SUMMARY:${esc(r.data.title)}`,
      `DESCRIPTION:${esc([r.data.time, r.data.notes].filter(Boolean).join(" "))}`,
      `LOCATION:${esc(r.data.location)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
export function sampleRecords() {
  const today = dateKey();
  const week = weekDates(today);
  const entries = [
    ["member", { title: "Dad", color: "teal", role: "Parent" }],
    ["member", { title: "Mom", color: "pink", role: "Parent" }],
    ["member", { title: "Mia", color: "purple", role: "Child" }],
    ["member", { title: "Lily", color: "amber", role: "Child" }],
    ...week.flatMap((date, i) => [
      [
        "event",
        {
          title:
            i === 0
              ? "Family breakfast"
              : i === 6
                ? "Park & picnic"
                : "School drop-off",
          date,
          time: i === 0 ? "09:00" : "07:30",
          member: i % 2 ? "Mom" : "Dad",
          category: i === 3 ? "Work" : i === 0 || i === 6 ? "Family" : "Daycare",
          video_url: i === 0 ? "/demo-recipe.mp4" : "",
          location: "",
          notes: "",
        },
      ],
      ...(i > 0 && i < 6
        ? [
            [
              "event",
              {
                title:
                  i === 2
                    ? "Soccer practice"
                    : i === 4
                      ? "Library afternoon"
                      : "Homework club",
                date,
                time: "16:00",
                member: i % 2 ? "Mia" : "Lily",
                category: i === 2 || i === 4 ? "Activities" : "School",
                location: "",
                notes: "",
              },
            ],
          ]
        : []),
    ]),
    [
      "chore",
      {
        title: "Empty the dishwasher",
        member: "Mia",
        date: today,
        amount: 3,
        status: "open",
      },
    ],
    [
      "chore",
      {
        title: "Tidy the playroom",
        member: "Lily",
        date: today,
        amount: 5,
        status: "submitted",
      },
    ],
    [
      "chore",
      {
        title: "Take out recycling",
        member: "Mia",
        date: today,
        amount: 2,
        status: "approved",
      },
    ],
    [
      "meal",
      {
        title: "Smoked chicken & dirty rice",
        date: today,
        type: "Dinner",
        notes: "Family favorite. The sample clip demonstrates the recipe player.",
        video_url: "/demo-recipe.mp4",
      },
    ],
    [
      "meal",
      { title: "Taco night", date: shiftDate(today, 1), type: "Dinner" },
    ],
    [
      "pantry",
      {
        title: "Long-grain rice",
        quantity: 2,
        unit: "bags",
        date: shiftDate(today, 40),
      },
    ],
    [
      "pantry",
      { title: "Milk", quantity: 1, unit: "gallon", date: shiftDate(today, 2) },
    ],
    [
      "shopping",
      { title: "Fresh vegetables", quantity: 1, unit: "bag", done: false },
    ],
    [
      "shopping",
      { title: "Tortillas", quantity: 2, unit: "packs", done: false },
    ],
    [
      "study",
      {
        title: "Read for 20 minutes",
        member: "Mia",
        date: today,
        subject: "Reading",
        done: false,
      },
    ],
    ["grade", { title: "Math", member: "Lily", grade: "A−" }],
    [
      "trip",
      {
        title: "A weekend together",
        date: shiftDate(today, 20),
        end: shiftDate(today, 22),
        location: "Hill Country",
        notes: "Plan the stops, pack the snacks.",
        amount: 600,
      },
    ],
    ["budget", { title: "Groceries", amount: 800, color: "teal" }],
    ["budget", { title: "Family & kids", amount: 400, color: "purple" }],
    ["budget", { title: "Trips", amount: 600, color: "amber" }],
    [
      "photo",
      {
        title: "Mountain mornings",
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80",
      },
    ],
  ];
  const records = entries.map(([kind, data], i) => ({
    id: `sample-${i}`,
    kind,
    data,
  }));
  records.push({
    id: "sample-transaction",
    kind: "transaction",
    data: {
      title: "Weekly groceries",
      amount: 146.28,
      date: today,
      type: "expense",
      category: records.find((r) => r.kind === "budget").id,
    },
  });
  return records;
}

export function holidays(year) {
  const nth = (month, weekday, n) => {
    const first = new Date(year, month, 1);
    return dateKey(
      new Date(
        year,
        month,
        1 + ((weekday - first.getDay() + 7) % 7) + 7 * (n - 1),
      ),
    );
  };
  const last = (month, weekday) => {
    const end = new Date(year, month + 1, 0);
    return dateKey(
      new Date(year, month, end.getDate() - ((end.getDay() - weekday + 7) % 7)),
    );
  };
  return [
    [`${year}-01-01`, "New Year's Day"],
    [nth(0, 1, 3), "Martin Luther King Jr. Day"],
    [nth(1, 1, 3), "Presidents' Day"],
    [last(4, 1), "Memorial Day"],
    [`${year}-06-19`, "Juneteenth"],
    [`${year}-07-04`, "Independence Day"],
    [nth(8, 1, 1), "Labor Day"],
    [`${year}-11-11`, "Veterans Day"],
    [nth(10, 4, 4), "Thanksgiving"],
    [`${year}-12-25`, "Christmas Day"],
  ].map(([date, title]) => ({
    id: `holiday-${date}`,
    kind: "event",
    readOnly: true,
    data: { title, date, member: "Family", category: "Holidays" },
  }));
}
