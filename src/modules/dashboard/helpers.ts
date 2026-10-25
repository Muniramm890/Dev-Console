// FILE: teacher-app/src/modules/dashboard/helpers.ts
// Source: admin App.tsx -> ACTIVITY_META [1113-1156]
// @ts-nocheck
import { C } from "../../theme/theme";

  // 🔴 Recent Activity helpers — module level, DashboardModule ke bahar
 
export const ACTIVITY_META = {
  LOGIN: { icon: "user", color: C.cyan, title: "System Login", desc: (d, user) => `By ${user}` },
  LOGOUT: { icon: "user", color: C.textMuted, title: "System Logout", desc: (d, user) => `By ${user}` },
  ATTENDANCE_MARKED: { 
    icon: "attendance", color: C.green, 
    title: "Student Attendance", 
    desc: (d, user) => `${d.section_name ? `Class ${d.section_name}` : "Unknown Class"}${d.count ? ` (${d.count} students)` : ""} • By ${user}` 
  },
  STAFF_ATTENDANCE_MARKED: { 
    icon: "attendance", color: C.green, 
    title: "Staff Attendance", 
    desc: (d, user) => `${d.count ? `${d.count} staff members` : "Marked"} • By ${user}` 
  },
  FEE_PAID: { 
    icon: "fee", color: C.primary, 
    title: "Fee Collected", 
    desc: (d, user) => `₹${d.amount || ""} from ${d.studentName || "Student"} • By ${user}` 
  },
  NOTICE_CREATED: { 
    icon: "warning", color: C.yellow, 
    title: "New Notice", 
    desc: (d, user) => `${d.title || "Published"} • By ${user}` 
  },
  TEST_CREATED: { 
    icon: "test", color: C.blue, 
    title: "Test Created", 
    desc: (d, user) => `${d.testName || "New test"} • By ${user}` 
  },
  EXAM_CREATED: { 
    icon: "test", color: C.blue, 
    title: "Exam Scheduled", 
    desc: (d, user) => `${d.examName || "New exam"} • By ${user}` 
  },
  STUDENT_ADDED: { 
    icon: "students", color: C.purple, 
    title: "New Admission", 
    desc: (d, user) => `${d.studentName || "Student enrolled"} • By ${user}` 
  },
  HOMEWORK_ASSIGNED: { 
    icon: "timetable", color: C.cyan, 
    title: "Homework Assigned", 
    desc: (d, user) => `${d.subject || "Subject"} • By ${user}` 
  },
};
