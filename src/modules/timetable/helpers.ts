// FILE: teacher-app/src/modules/timetable/helpers.ts
// Source: admin App.tsx -> DAYS [10567-10574], SUBJECT_PALETTE [10578-10589], subjectColor [10591-10597], DAY_LABELS_FULL [11411-11419]
// @ts-nocheck
import { C } from "../../theme/theme";

// MODULE: TIMETABLE MANAGEMENT — VISUAL REBUILD
// Replaces the old DAYS / TimetableModule / BuildTimetableTab.
// PeriodStructureTab and TeacherWeeklyViewTab stay unchanged from before.
// ═══════════════════════════════════════════════════════════════

export const DAYS = [
  { num: 1, label: "Mon" },
  { num: 2, label: "Tue" },
  { num: 3, label: "Wed" },
  { num: 4, label: "Thu" },
  { num: 5, label: "Fri" },
  { num: 6, label: "Sat" },
];

// Deterministic color per subject name — same subject always gets same color,
// so the grid visually groups subjects at a glance across the whole week.
export const SUBJECT_PALETTE = [
  C.blue,
  C.green,
  C.purple,
  C.cyan,
  C.yellow,
  C.red,
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#8B5CF6",
];

export const subjectColor = (name) => {
  if (!name) return C.border;
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
};

// ═══════════════════════════════════════════════════════════════
// TAB 3: TEACHER WEEKLY VIEW (admin preview of any teacher's 7-day grid)
// ═══════════════════════════════════════════════════════════════
export const DAY_LABELS_FULL = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

// Daily Routine (bell schedule) helpers - backed by period_slots via GET/PUT /timetable/periods
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
