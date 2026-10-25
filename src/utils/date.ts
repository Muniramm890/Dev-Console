// FILE: teacher-app/src/utils/date.ts
// Source: admin App.tsx -> toLocalISO [1098-1103], todayISO [1104-1104], daysAgoISO [1105-1109], timeAgo [1157-1165]
// @ts-nocheck

// Local-date formatter (no UTC shift) — avoids the midnight-IST off-by-one bug
export const toLocalISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayISO = () => toLocalISO(new Date());

export const daysAgoISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalISO(d);
};

export const timeAgo = (iso) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
