// FILE: teacher-app/src/modules/results/helpers.ts
// Source: admin App.tsx -> RESULT_TABS [18964-18972], GRADE_COLORS [18974-18974]
// @ts-nocheck
import { C } from "../../theme/theme";

// end ExamManagementModule
// ═══════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════
// MODULE: RESULTS
// ═══════════════════════════════════════════════════════════════


export const RESULT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "classwise", label: "Class-wise" },
  { id: "sectionwise", label: "Section-wise" },
  { id: "subjectwise", label: "Subject-wise" },
  { id: "teacherwise", label: "Teacher-wise" },
  { id: "toppers", label: "Toppers" },
  { id: "student", label: "Student Report Card" },
];

export const GRADE_COLORS = [C.primary, C.purple, C.blue, C.green, C.yellow];
