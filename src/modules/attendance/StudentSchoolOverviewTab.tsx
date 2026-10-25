// FILE: teacher-app/src/modules/attendance/StudentSchoolOverviewTab.tsx
// Source: admin App.tsx -> StudentSchoolOverviewTab [12949-13231]
// @ts-nocheck
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { KpiCard } from "../../components/ui/KpiCard";
import { C } from "../../theme/theme";
import { daysAgoISO, todayISO } from "../../utils/date";
import { STATUS_KEYS, STATUS_META } from "../../utils/status";

// ═══════════════════════════════════════════════════════════════
// STUDENTS — TAB 3: SCHOOL OVERVIEW
// ═══════════════════════════════════════════════════════════════
export const StudentSchoolOverviewTab = () => {
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState(daysAgoISO(6));
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState({ today: {}, gradeWise: [], trend: [] });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(
        `/attendance/students/school-overview?date=${date}&from=${from}&to=${to}`
      );
      setData(res?.data || { today: {}, gradeWise: [], trend: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [date, from, to]); // eslint-disable-line

  const t = data.today || {};
  const pieData = STATUS_KEYS.map((s) => ({
    name: STATUS_META[s].label,
    value:
      t[
        s === "P"
          ? "present"
          : s === "A"
          ? "absent"
          : s === "L"
          ? "leave"
          : "od"
      ] || 0,
    key: s,
  }));

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: C.textMuted,
                marginBottom: 4,
              }}
            >
              TODAY'S DATE
            </label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayISO()}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: C.textMuted,
                marginBottom: 4,
              }}
            >
              TREND FROM
            </label>
            <input
              className="input"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: C.textMuted,
                marginBottom: 4,
              }}
            >
              TO
            </label>
            <input
              className="input"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              max={todayISO()}
            />
          </div>
        </div>
      </div>

      <div
        className="grid-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {STATUS_KEYS.map((s) => (
          <KpiCard
            key={s}
            label={STATUS_META[s].label + " Today"}
            value={
              loading
                ? "—"
                : t[
                    s === "P"
                      ? "present"
                      : s === "A"
                      ? "absent"
                      : s === "L"
                      ? "leave"
                      : "od"
                  ] || 0
            }
            icon={s === "P" ? "check" : s === "A" ? "warning" : "attendance"}
            color={STATUS_META[s].color}
          />
        ))}
      </div>

      <div
        className="grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div className="card">
          <h3
            className="syne"
            style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}
          >
            School-wide Attendance Trend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="studentTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 11 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: C.textMuted, fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.text,
                }}
                formatter={(v) => `${v}%`}
              />
              <Area
                type="monotone"
                dataKey="percentage"
                stroke={C.primary}
                fill="url(#studentTrendGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3
            className="syne"
            style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}
          >
            Today's Mix
          </h3>
          {loading ? (
            <div
              className="pulse"
              style={{
                height: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.primary,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Loading today's mix…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={STATUS_META[d.key].color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    color: C.text,
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 8 }}
                  formatter={(v) => (
                    <span style={{ color: C.textMuted, fontSize: 11 }}>{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <h3
          className="syne"
          style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}
        >
          Class-wise Average Attendance
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.gradeWise} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis
              dataKey="grade_name"
              tick={{ fill: C.textMuted, fontSize: 10 }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: C.textMuted, fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text,
              }}
              formatter={(v) => `${v}%`}
            />
            <Bar dataKey="percentage" fill={C.primary} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
