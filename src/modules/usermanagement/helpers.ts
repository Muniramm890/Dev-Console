// FILE: teacher-app/src/modules/usermanagement/helpers.ts
// Source: admin App.tsx -> PERMISSION_MODULES [22429-22442]
// @ts-nocheck

//============================================================
// USER MANAGEMENT 
//====================================================

// [teacher-app] Sidebar ke saare assignable modules (sidebar order me). Pehle missing the:
// homework, arrangement (Substitution), commhub, payroll, transport, promotion.
// usermanagement + auditlogs yaha nahi hain (sirf school_admin ke liye, assign nahi hote).
// NOTE: key "transport" hai (sidebar ka id "TransportModule" hai; mapping navigation me hogi).
export const PERMISSION_MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "attendance", label: "Attendance" },
  { id: "homework", label: "Homework" },
  { id: "tests", label: "Quick Tests" },
  { id: "timetable", label: "Timetable" },
  { id: "arrangement", label: "Substitution" },
  { id: "exams", label: "Exam Management" },
  { id: "results", label: "Results" },
  { id: "students", label: "Students" },
  { id: "commhub", label: "Announcements" },
  { id: "teachers", label: "Teachers" },
  { id: "fees", label: "Fee Management" },
  { id: "payroll", label: "Payroll" },
  { id: "transport", label: "Transport" },
  { id: "promotion", label: "Promotion & TC" },
  { id: "setup", label: "School Setup" },
];
