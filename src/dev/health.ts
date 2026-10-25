// @ts-nocheck
// quick "what needs my attention" flags for a school row
const days = (d) => Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
export const healthFlags = (s) => {
  const f = [];
  if (s.valid_until) { const d = days(s.valid_until); if (d < 0) f.push(["Expired", "red"]); else if (d <= 15) f.push([`Expires in ${d}d`, "yellow"]); }
  if (s.max_students != null && s.students > s.max_students) f.push(["Over student limit", "red"]);
  if (s.max_staff != null && s.staff > s.max_staff) f.push(["Over staff limit", "red"]);
  const last = s.last_login_at ? Date.now() - new Date(s.last_login_at).getTime() : null;
  const age = Date.now() - new Date(s.created_at).getTime();
  if ((last === null && age > 7 * 86400000) || (last !== null && last > 14 * 86400000)) f.push(["Inactive 14d+", "grey"]);
  return f;
};
export const pct = (n, max) => (max ? Math.min(100, Math.round((n / max) * 100)) : 0);
