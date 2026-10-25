// FILE: teacher-app/src/modules/attendance/StaffAnalysisTab.tsx
// Source: admin App.tsx -> StaffAnalysisTab [13762-13970]
// @ts-nocheck
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { C } from "../../theme/theme";
import { daysAgoISO, todayISO } from "../../utils/date";

// ═══════════════════════════════════════════════════════════════
// TEACHERS — TAB 2: STAFF ANALYSIS
// ═══════════════════════════════════════════════════════════════
export const StaffAnalysisTab = () => {
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState({ teachers: [], trend: [] });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(
        `/attendance/staff/analysis?from=${from}&to=${to}`
      );
      setData(res?.data || { teachers: [], trend: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [from, to]); // eslint-disable-line

  const defaulters = data.teachers.filter((t) => t.percentage < 85);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            className="input"
            type="date"
            style={{ width: 150 }}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span style={{ alignSelf: "center", color: C.textMuted }}>to</span>
          <input
            className="input"
            type="date"
            style={{ width: 150 }}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            max={todayISO()}
          />
        </div>
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
            Staff Attendance Trend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="staffTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
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
                stroke={C.blue}
                fill="url(#staffTrendGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3
            className="syne"
            style={{
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 14,
              color: C.red,
            }}
          >
            ⚠ Frequently Absent (Below 85%)
          </h3>
          {defaulters.length === 0 ? (
            <div
              style={{
                color: C.textMuted,
                fontSize: 13,
                padding: "20px 0",
                textAlign: "center",
              }}
            >
              All staff regular ✓
            </div>
          ) : (
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {defaulters.map((t) => (
                <div
                  key={t.user_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: `1px solid ${C.border}22`,
                    fontSize: 13,
                  }}
                >
                  <span>{t.full_name}</span>
                  <span style={{ color: C.red, fontWeight: 700 }}>
                    {t.percentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3
          className="syne"
          style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}
        >
          Teacher-wise Breakdown
        </h3>
        {loading ? (
          <div
            className="pulse"
            style={{ textAlign: "center", color: C.primary, padding: 20 }}
          >
            Loading…
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Department</th>
                  <th>P</th>
                  <th>A</th>
                  <th>L</th>
                  <th>OD</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {data.teachers.map((t) => (
                  <tr key={t.user_id}>
                    <td style={{ fontWeight: 600 }}>{t.full_name}</td>
                    <td style={{ fontSize: 12, color: C.textMuted }}>
                      {t.department || "—"}
                    </td>
                    <td style={{ color: C.green }}>{t.present_days}</td>
                    <td style={{ color: C.red }}>{t.absent_days}</td>
                    <td style={{ color: C.yellow }}>{t.leave_days}</td>
                    <td style={{ color: C.blue }}>{t.od_days}</td>
                    <td>
                      <span
                        className="syne"
                        style={{
                          fontWeight: 700,
                          color:
                            t.percentage >= 90
                              ? C.green
                              : t.percentage >= 75
                              ? C.yellow
                              : C.red,
                        }}
                      >
                        {t.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
