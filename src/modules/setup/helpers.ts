// FILE: teacher-app/src/modules/setup/helpers.ts
// Source: admin App.tsx -> PERIOD_TYPES [5142-5148], addMinutes [5151-5155]
// @ts-nocheck

// ═══════════════════════════════════════════════════════════════
// 🔴 NEW: Daily Routine Builder — full period-wise schedule editor.
// Replaces old flat "Start/End Time + Periods/Day" fields.
// Backed by period_slots via GET/PUT /timetable/periods.
// ═══════════════════════════════════════════════════════════════

export const PERIOD_TYPES = [
  { v: "period", l: "Teaching Period" },
  { v: "assembly", l: "Assembly" },
  { v: "lunch", l: "Lunch Break" },
  { v: "break", l: "Short Break" },
  { v: "custom", l: "Other (custom label)" },
];

export const addMinutes = (time, mins) => {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + mins) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
