// FILE: teacher-app/src/modules/exams/helpers.ts
// Source: admin App.tsx -> EXAM_TYPES [16543-16548], EXAM_STATUS_META [16550-16556], MARK_STATUS_OPTIONS [16558-16565]
// @ts-nocheck
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// EXAM MANAGEMENT MODULE — full lifecycle: Setup → Date Sheet →
// Marks Entry → Result Processing → Publish, plus a school-wide


// ═══════════════════════════════════════════════════════════════

export const EXAM_TYPES = [
  { v: "unit_test", l: "Unit Test" },
  { v: "half_yearly", l: "Half Yearly" },
  { v: "annual", l: "Annual" },
  { v: "custom", l: "Custom" },
];

export const EXAM_STATUS_META = {
  draft: { label: "Draft", color: C.textMuted },
  scheduled: { label: "Scheduled", color: C.blue },
  ongoing: { label: "Ongoing", color: C.yellow },
  completed: { label: "Completed", color: C.cyan },
  published: { label: "Published", color: C.green },
};

export const MARK_STATUS_OPTIONS = [
  { v: "present", l: "Present" },
  { v: "absent", l: "Absent (AB)" },
  { v: "leave", l: "Leave (L)" },
  { v: "tc", l: "TC" },
  { v: "malpractice", l: "Malpractice" },
  { v: "exempted", l: "Exempted" },
];
