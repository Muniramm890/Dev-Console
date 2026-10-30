// FILE: teacher-app/src/utils/access.ts
// [teacher-app] NEW — module-wise access (User Management > Permissions) ka frontend check.
// Backend (moduleGate) asli enforcement karta hai; ye sirf sidebar/route me wahi dikhata hai jo user ko assigned hai.
// @ts-nocheck

// Sidebar nav id -> permission key (backend VALID_MODULES). Baaki ids ka key wahi hota hai.
export const PERMISSION_KEY_BY_NAV_ID = { TransportModule: "transport" };

// Ye modules assign nahi hote — sirf school_admin ko.
const ADMIN_ONLY_IDS = ["usermanagement", "auditlogs"];

// school_admin = sab; baaki = sirf user.permissions (modules array) me jo keys hain.
export const canAccess = (user, navId) => {
  if (!user) return false;
  if (user.role === "school_admin") return true;
  if (navId === "calendar") return true; // every staff member can view the calendar and apply for leave (backend rules are open for it)
  if (ADMIN_ONLY_IDS.includes(navId)) return false;
  const key = PERMISSION_KEY_BY_NAV_ID[navId] || navId;
  return Array.isArray(user.permissions) && user.permissions.includes(key);
};
