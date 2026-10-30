// @ts-nocheck
// Dashboard row (same 2fr | 1fr grid + cards as the Class-wise Enrollment / donut row):
//   left  = Today's attendance summary (one existing route),  right = Quick Actions (navigation only).
// Nothing from the Attendance / Fees modules is re-implemented here: every cell, chip and tile just navigates.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useSession } from "../../contexts/SessionContext";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import { Icon } from "../../components/ui/Icon";
import { STATUS_META } from "../../utils/status";
import { C } from "../../theme/theme";

const iso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const n = (v) => Number(v) || 0;

const ACTIONS = [
  { label: "Send Notice", icon: "send", to: "/commhub" },
  { label: "Collect Fee", icon: "fee", to: "/fees?tab=ledger" },
  { label: "Timetable", icon: "calendar", to: "/timetable" },
  { label: "Add Student", icon: "students", to: "/students" },
];

export const TodayPanel = ({ tick = 0, feeDues = 0 }) => {
  const navigate = useNavigate();
  const { currentYear } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState([]);
  const upRef = useAutoScroll(upcoming); // same auto-scroll as the Recent Activities card
  const [leavesPending, setLeavesPending] = useState(0);

  const load = async (silent) => {
    if (!silent) setLoading(true);
    const d = iso();
    try {
      const res = await apiRequest(`/attendance/students/school-overview?date=${d}&from=${d}&to=${d}${currentYear?.id ? `&academic_year_id=${currentYear.id}` : ""}`);
      setData(res?.data || null);
    } catch { /* keep the last data */ } finally { setLoading(false); }
    try { const u = await apiRequest("/calendar/upcoming?limit=20"); setUpcoming(Array.isArray(u?.data) ? u.data : []); } catch { /* calendar not available */ }
    try { const l = await apiRequest("/calendar/leaves?status=pending"); setLeavesPending(Number(l?.pending_count) || 0); } catch { setLeavesPending(0); }
  };
  useEffect(() => { load(false); }, [tick, currentYear?.id]); // eslint-disable-line
  useEffect(() => { const t = setInterval(() => load(true), 60000); return () => clearInterval(t); }, [currentYear?.id]); // eslint-disable-line

  const t = data?.today || {};
  const total = n(t.total), present = n(t.present), absent = n(t.absent);
  const pct = total ? Math.round((present / total) * 100) : 0;
  const classes = data?.classes || [];
  const pending = data?.pending || [];
  const absentAll = classes.reduce((s, c) => s + n(c.A), 0);
  const alerted = classes.reduce((s, c) => s + n(c.alerted), 0);
  const notAlerted = Math.max(0, absentAll - alerted);

  const cells = [
    { label: "Present", value: total ? `${pct}%` : "-", sub: total ? `${present} of ${total} marked` : "Not marked yet", color: C.green },
    { label: "Absent", value: absent, sub: absentAll ? `${alerted}/${absentAll} parents alerted` : "No absentees", color: C.red },
    { label: "Classes pending", value: pending.length, sub: `${classes.length} of ${classes.length + pending.length} marked`, color: pending.length ? C.yellow : C.green },
  ];
  const segs = ["P", "A", "L", "OD"].map((k) => ({ k, v: n(t[{ P: "present", A: "absent", L: "leave", OD: "od" }[k]]) }));
  const chips = [
    ...pending.slice(0, 6).map((p) => ({ text: p.label || "Class", color: STATUS_META.L.color, to: "/attendance" })),
    pending.length > 6 && { text: `+${pending.length - 6} more`, color: STATUS_META.L.color, to: "/attendance" },
    notAlerted > 0 && { text: `${notAlerted} parent${notAlerted === 1 ? "" : "s"} not alerted`, color: C.red, to: "/attendance" },
    leavesPending > 0 && { text: `${leavesPending} leave request${leavesPending === 1 ? "" : "s"}`, color: C.blue, to: "/calendar?tab=leaves" },
    feeDues > 0 && { text: `${feeDues} fee due${feeDues === 1 ? "" : "s"}`, color: C.red, to: "/fees?tab=ledger&status=pending" },
  ].filter(Boolean);

  return (
    <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
      <div className="card">
        <h3 className="syne" style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 0 3px ${C.green}33` }} />
          Today&apos;s Attendance
        </h3>
        {loading && !data ? (
          <div className="pulse" style={{ padding: 24, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading…</div>
        ) : !data ? (
          <div style={{ color: C.textMuted, fontSize: 13 }}>Today&apos;s attendance summary is not available for your account.</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
              {cells.map((c) => (
                <div key={c.label} role="button" onClick={() => navigate("/attendance")}
                  style={{ cursor: "pointer", padding: "10px 12px", borderLeft: `3px solid ${c.color}`, borderRadius: 6, background: `${c.color}10` }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: C.textMuted }}>{c.label}</div>
                  <div className="syne" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15 }}>{c.value}</div>
                  <div style={{ fontSize: 11.5, color: C.textMuted }}>{c.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", height: 6, borderRadius: 4, overflow: "hidden", background: C.surfaceAlt, margin: "14px 0 6px" }}>
              {total > 0 && segs.filter((s) => s.v > 0).map((s) => (<div key={s.k} title={`${STATUS_META[s.k].label}: ${s.v}`} style={{ width: `${(s.v / total) * 100}%`, background: STATUS_META[s.k].color }} />))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 11.5, color: C.textMuted, marginBottom: 14 }}>
              {segs.map((s) => (<span key={s.k}><span style={{ color: STATUS_META[s.k].color }}>&#9679;</span> {STATUS_META[s.k].label} <b style={{ color: C.text }}>{s.v}</b></span>))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.textMuted }}>Needs attention</span>
              {chips.length === 0 ? (
                <span style={{ fontSize: 12, color: C.green, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Icon name="check" size={13} /> All clear</span>
              ) : chips.map((ch) => (
                <button key={ch.text} onClick={() => navigate(ch.to)}
                  style={{ border: `1px solid ${ch.color}55`, background: `${ch.color}14`, color: C.text, borderRadius: 14, padding: "3px 10px", fontSize: 11.5, cursor: "pointer" }}>
                  {ch.text}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        <h3 className="syne" style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Upcoming Events &amp; Holidays</h3>
        <div ref={upRef} style={{ maxHeight: 280, overflowY: "auto", overflowX: "auto", paddingRight: 4, scrollbarWidth: "none", msOverflowStyle: "none" }} className="hide-scrollbar">
          <div>
            {upcoming.length === 0 ? (
              <div style={{ color: C.textMuted, fontSize: 13, padding: "6px 0" }}>No upcoming holidays or events.</div>
            ) : upcoming.map((e) => {
              const col = e.kind === "holiday" ? C.red : C.blue, [, mo, dd] = String(e.start_date).split("-"), multi = e.end_date && e.end_date !== e.start_date;
              return (
                <div key={e.id} onClick={() => navigate("/calendar")} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                  <div style={{ minWidth: 42, textAlign: "center", borderRadius: 10, padding: "4px 0", background: `${col}14`, flexShrink: 0 }}>
                    <div className="syne" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>{dd}</div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: col, textTransform: "uppercase" }}>{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(mo) - 1]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{e.kind === "holiday" ? "Holiday" : "Event"}{multi ? ` · till ${String(e.end_date).split("-").slice(1).reverse().join("/")}` : ""}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="syne" style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Quick Actions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {ACTIONS.map((a) => (
            <button key={a.label} onClick={() => navigate(a.to)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 6px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.text, cursor: "pointer", fontSize: 11.5, textAlign: "center" }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: `${C.primary}18`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={a.icon} size={15} />
              </span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
