// FILE: teacher-app/src/modules/arrangement/ArrangementModule.tsx
// Source: admin App.tsx -> ArrangementModule [12178-12301]
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { KpiCard } from "../../components/ui/KpiCard";
import { useDialog } from "../../contexts/DialogContext";
import { ArrangementHistoryTab } from "./ArrangementHistoryTab";
import { TodayArrangementTab } from "./TodayArrangementTab";
import { C } from "../../theme/theme";
import { daysAgoISO, todayISO } from "../../utils/date";

// ═══════════════════════════════════════════════════════════════
// MAIN MODULE
// ═══════════════════════════════════════════════════════════════
export const ArrangementModule = ({ school }) => {
  const { dialogAlert } = useDialog();
  const [tab, setTab] = useState("overview");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const reqId = useRef(0);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const loadHistory = React.useCallback(async () => {
    const my = ++reqId.current; // stale response guard
    setLoading(true);
    try {
      const res = await apiRequest(`/arrangement/history?from=${daysAgoISO(90)}&to=${todayISO()}`);
      if (!mounted.current || my !== reqId.current) return;
      setHistory(Array.isArray(res?.data) ? res.data : []); // non-array response par crash nahi
    } catch (e) {
      if (mounted.current && my === reqId.current) dialogAlert("Failed to load history: " + e.message, "Error");
    } finally {
      if (mounted.current && my === reqId.current) setLoading(false);
    }
  }, [dialogAlert]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const overview = useMemo(() => {
    const today = todayISO();
    const todayCount = history.filter((h) => h.substitution_date?.slice(0, 10) === today).length;
    const last30 = history.filter((h) => h.substitution_date >= daysAgoISO(30));

    const byTeacher = {};
    last30.forEach((h) => { byTeacher[h.substitute_teacher_name] = (byTeacher[h.substitute_teacher_name] || 0) + 1; });
    const workload = Object.entries(byTeacher).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, count]) => ({ name, count }));

    const byDate = {};
    last30.forEach((h) => { const d = h.substitution_date?.slice(0, 10); byDate[d] = (byDate[d] || 0) + 1; });
    const trend = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))
      .map(([d, count]) => ({ date: d.slice(5), count }));

    const bySubject = {};
    last30.forEach((h) => { const s = h.subject_name || "General"; bySubject[s] = (bySubject[s] || 0) + 1; });
    const subjectChart = Object.entries(bySubject).map(([name, value]) => ({ name, value }));

    return { todayCount, last30Count: last30.length, workload, trend, subjectChart };
  }, [history]);

  const PIE_COLORS = [C.primary, C.blue, C.green, C.yellow, C.red, "#8b5cf6"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>Substitution & Arrangement</h1>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Auto-detects gaps from absent teachers and suggests the best-fit substitute.</p>
        </div>
        <div style={{ display: "flex", gap: 8, background: C.surfaceAlt, padding: 4, borderRadius: 12, border: `1px solid ${C.border}` }}>
          {[{ id: "overview", label: "Overview" }, { id: "today", label: "Today's Arrangement" }, { id: "history", label: "History" }].map((t) => (
            <button key={t.id} className="btn" onClick={() => setTab(t.id)}
              style={{ padding: "8px 14px", fontSize: 12.5, fontWeight: 700, borderRadius: 9, background: tab === t.id ? C.surface : "transparent", color: tab === t.id ? C.primary : C.textMuted, boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="slide-in">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <KpiCard label="Substitutions Today" value={overview.todayCount} icon="calendar" color={C.primary} />
            <KpiCard label="Last 30 Days" value={overview.last30Count} icon="refresh" color={C.blue} />
            <KpiCard label="Most Loaded Teacher" value={overview.workload[0]?.name || "—"} sub={overview.workload[0] ? `${overview.workload[0].count} periods` : ""} icon="users" color={C.yellow} />
            <KpiCard label="Top Affected Subject" value={[...overview.subjectChart].sort((a, b) => b.value - a.value)[0]?.name || "—"} icon="book" color={C.green} />
          </div>

          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ padding: 20, minWidth: 0 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Substitution Trend (Last 30 Days)</h4>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={overview.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke={C.primary} strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: 20, minWidth: 0 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Gaps by Subject</h4>
              {overview.subjectChart.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>No data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={overview.subjectChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                      {overview.subjectChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 20, minWidth: 0 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Substitution Workload — Top Teachers (Last 30 Days)</h4>
            {overview.workload.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: C.textMuted, fontSize: 13 }}>No substitutions recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={overview.workload} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill={C.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {tab === "today" && <TodayArrangementTab onSaved={loadHistory} />}
      {tab === "history" && <ArrangementHistoryTab history={history} onRefresh={loadHistory} />}
    </div>
  );
};
