// Attendance screens look at ONE session: the one picked in the top bar.
// Default dates stay inside that session (never after today), so a past session opens on its own last days.
import { useSession } from "../../contexts/SessionContext";
import { todayISO } from "../../utils/date";

const ymd = (v) => String(v || "").slice(0, 10);
export const shiftDay = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "2026-10-12" -> "12 Oct" (chart axis: every day is told apart, unlike Mon / Tue / Mon ...)
export const shortDate = (v) => { const p = ymd(v).split("-"); return p.length === 3 ? `${Number(p[2])} ${MON[Number(p[1]) - 1]}` : String(v || ""); };

export const useSessionWindow = () => {
  const { currentYear } = useSession();
  const start = ymd(currentYear?.start_date);
  const end = ymd(currentYear?.end_date);
  const today = todayISO();
  let last = end && end < today ? end : today; // latest day that can have attendance in this session
  if (start && last < start) last = start;
  return {
    yearId: currentYear?.id || "",
    start, end, last,
    fromDays: (n) => { const f = shiftDay(last, -n); return start && f < start ? start : f; },
  };
};
