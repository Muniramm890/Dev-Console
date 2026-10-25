// FILE: teacher-app/src/components/layout/navItems.ts
// Source: admin App.tsx -> NAV_ITEMS [1794-1844]
// @ts-nocheck

// ═══════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════
// [teacher-app] Regrouped: roz ke kaam upar, kam use hone wale (management/admin) sabse neeche.
// Sirf order + group badla hai; id/label/icon same hain (SchoolERP.tsx ka switch aur URL ids unchanged).
export const NAV_ITEMS = [
  {
    group: "MAIN",
    items: [{ id: "dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    group: "DAILY OPS",
    items: [
      { id: "attendance", label: "Attendance", icon: "attendance" },
      { id: "homework", label: "Homework", icon: "homework" },
      { id: "tests", label: "Quick Tests", icon: "test" },
      { id: "timetable", label: "Timetable", icon: "timetable" },
      { id: "arrangement", label: "Substitution", icon: "refresh" },
    ],
  },
  {
    group: "ACADEMICS",
    items: [
      { id: "exams", label: "Exam Management", icon: "test" },
      { id: "results", label: "Results", icon: "result" },
    ],
  },
  {
    group: "STUDENTS & STAFF",
    items: [
      { id: "students", label: "Students", icon: "students" },
      { id: "commhub", label: "Announcements", icon: "megaphone" },
      { id: "teachers", label: "Teachers", icon: "teachers" },
    ],
  },
  {
    group: "SCHOOL MANAGEMENT",
    items: [
      { id: "fees", label: "Fee Management", icon: "fee" },
      { id: "payroll", label: "Payroll", icon: "wallet" },
      { id: "TransportModule", label: "Transport", icon: "bus" },
      { id: "promotion", label: "Promotion & TC", icon: "arrow_right" },
      { id: "setup", label: "School Setup", icon: "setup" },
    ],
  },
  {
    group: "ADMINISTRATION",
    superAdminOnly: true,
    items: [
      { id: "usermanagement", label: "User Management", icon: "user" },
      { id: "auditlogs", label: "Audit Logs", icon: "attendance" },
    ],
  },
];
