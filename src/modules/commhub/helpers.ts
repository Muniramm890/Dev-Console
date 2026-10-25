// FILE: teacher-app/src/modules/commhub/helpers.ts
// Source: admin App.tsx -> TARGET_TYPE_META [10070-10079], ATTACHMENT_CHANNEL_MATRIX [10082-10088], detectAttachmentType [10089-10094]
// @ts-nocheck

// =========================================================
// COMMUNICATION HUB -- targeted notices across App / Email, with attachments
// (No WhatsApp -- Meta blocks freeform business-initiated messages outside approved templates)
// =========================================================
export const TARGET_TYPE_META = {
  all_school: { label: "Whole School", icon: "users" },
  grade: { label: "Entire Class/Grade", icon: "academic" },
  section: { label: "Specific Section", icon: "students" },
  gender_in_section: { label: "Boys/Girls in a Section", icon: "students" },
  student: { label: "Individual Student", icon: "user" },
  subject_teachers: { label: "Teachers of a Subject", icon: "book" },
  class_teachers: { label: "Class Teacher(s)", icon: "teachers" },
  role: { label: "Staff by Role", icon: "setup" },
};

// Mirrors backend ATTACHMENT_CHANNEL_MATRIX -- keep both in sync if it ever changes
export const ATTACHMENT_CHANNEL_MATRIX = {
  none: ["app", "email", "sms"],
  image: ["app", "email"],
  pdf: ["app", "email"],
  document: ["app", "email"],
  video: ["app"],
};

export const detectAttachmentType = (file) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "document";
};

// [teacher-app] Announcements UI meta. `color` is a key of theme `C` (resolved at render so light/dark theme works).
export const CATEGORY_META = {
  general: { label: "General", color: "blue", icon: "book" },
  exam: { label: "Exam", color: "purple", icon: "test" },
  fee: { label: "Fee", color: "yellow", icon: "fee" },
  event: { label: "Event", color: "cyan", icon: "calendar" },
  emergency: { label: "Emergency", color: "red", icon: "alert" },
};

export const CHANNEL_META = {
  app: { label: "In-App Notification", sub: "Instant alert inside the app", icon: "bell" },
  email: { label: "Email", sub: "Sent to registered email addresses", icon: "mail" },
  sms: { label: "SMS", sub: "Text message", icon: "message", alwaysDisabled: true },
};

export const ATTACHMENT_TYPE_META = {
  image: { label: "Image", color: "purple" },
  pdf: { label: "PDF", color: "red" },
  document: { label: "Document", color: "blue" },
  video: { label: "Video", color: "cyan" },
};

export const fmtSize = (bytes = 0) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const fmtTime = (v) =>
  v ? new Date(v).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";
