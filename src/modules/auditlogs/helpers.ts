// FILE: teacher-app/src/modules/auditlogs/helpers.ts
// Source: admin App.tsx -> AUDIT_ACTION_META [23089-23108], getAuditMeta [23110-23110]
// @ts-nocheck
import { C } from "../../theme/theme";

export const AUDIT_ACTION_META = {
  LOGIN: { label: "Login", color: C.green, icon: "check" },
  LOGOUT: { label: "Logout", color: C.textMuted, icon: "user" },
  LOGIN_FAILED: { label: "Failed Login", color: C.red, icon: "warning" },
  ATTENDANCE_MARKED: { label: "Attendance Marked", color: C.blue, icon: "attendance" },
  STAFF_ATTENDANCE_MARKED: { label: "Staff Attendance", color: C.blue, icon: "attendance" },
  FEE_PAID: { label: "Fee Collected", color: C.primary, icon: "fee" },
  NOTICE_CREATED: { label: "Notice Created", color: C.yellow, icon: "warning" },
  TEST_CREATED: { label: "Test Created", color: C.purple, icon: "test" },
  EXAM_CREATED: { label: "Exam Created", color: C.purple, icon: "test" },
  STUDENT_ADDED: { label: "Student Added", color: C.cyan, icon: "students" },
  HOMEWORK_ASSIGNED: { label: "Homework Assigned", color: C.cyan, icon: "timetable" },
  USER_BLOCKED: { label: "User Blocked", color: C.red, icon: "warning" },
  USER_UNBLOCKED: { label: "User Unblocked", color: C.green, icon: "check" },
  USER_ROLE_CHANGED: { label: "Role Changed", color: C.yellow, icon: "setup" },
  USER_PERMISSIONS_CHANGED: { label: "Permissions Changed", color: C.yellow, icon: "eye" },
  USER_PASSWORD_RESET: { label: "Password Reset", color: C.red, icon: "edit" },
  AUDIT_CLEANUP: { label: "Logs Cleaned Up", color: C.textMuted, icon: "trash" },
  API_CALL: { label: "API Call", color: C.textMuted, icon: "chart" },
};

export const getAuditMeta = (type) => AUDIT_ACTION_META[type] || { label: type, color: C.textMuted, icon: "chart" };
