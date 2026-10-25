// FILE: teacher-app/src/modules/attendance/StudentClassAnalysisTab.tsx
// Source: admin App.tsx -> StudentClassAnalysisTab [12664-12944]
// @ts-nocheck
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { useGradesAndSections } from "./useGradesAndSections";
import { C } from "../../theme/theme";
import { daysAgoISO, todayISO } from "../../utils/date";
import { STATUS_META } from "../../utils/status";

// ═══════════════════════════════════════════════════════════════
// STUDENTS — TAB 2: CLASS ANALYSIS
// ═══════════════════════════════════════════════════════════════
export const StudentClassAnalysisTab = () => {
  const { grades, sections, loading: secLoading } = useGradesAndSections();
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState({ students: [], trend: [] });
  const [loading, setLoading] = useState(false);

  const filteredSections = sections.filter((s) => s.grade_id === gradeId);

  useEffect(() => {
    if (grades.length && !gradeId) setGradeId(grades[0].id);
  }, [grades]); // eslint-disable-line
  useEffect(() => {
    if (!secLoading && sectionId && !sections.some((s) => s.id === sectionId)) {
      setSectionId(filteredSections[0]?.id || "");
      if (!filteredSections.length) setData({ students: [], trend: [] });
    }
  }, [sections, secLoading]); // eslint-disable-line

  useEffect(() => {
    if (gradeId && filteredSections.length && !sectionId)
      setSectionId(filteredSections[0].id);
  }, [gradeId, sections]); // eslint-disable-line

  const load = async () => {
    if (!sectionId) return;
    setLoading(true);
    try {
      const res = await apiRequest(
        `/attendance/students/analysis?section_id=${sectionId}&from=${from}&to=${to}`
      );
      setData(res?.data || { students: [], trend: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sectionId, from, to]); // eslint-disable-line

  const defaulters = data.students.filter((s) => s.percentage < 75);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select
            className="select"
            style={{ width: 150 }}
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSectionId("");
            }}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 120 }}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            {filteredSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div className="card">
          <h3
            className="syne"
            style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}
          >
            Attendance % Trend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="attTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fill: C.textMuted, fontSize: 9 }} />
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
                fill="url(#attTrendGrad)"
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
            ⚠ Defaulters (Below 75%)
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
              No defaulters — great attendance! ✓
            </div>
          ) : (
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {defaulters.map((s) => (
                <div
                  key={s.student_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: `1px solid ${C.border}22`,
                    fontSize: 13,
                  }}
                >
                  <span>
                    {[s.first_name, s.last_name].filter(Boolean).join(" ")}
                  </span>
                  <span style={{ color: C.red, fontWeight: 700 }}>
                    {s.percentage}%
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
          Student-wise Breakdown
        </h3>
        {loading ? (
          <div
            className="pulse"
            style={{ textAlign: "center", color: C.primary, padding: 20 }}
          >
            Loading…
          </div>
        ) : (
          <>
            {(data.dates || []).length > 45 && (
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
                {data.dates.length} dates in this range — scroll horizontally to see the full register.
              </div>
            )}
            <div style={{ overflowX: "auto", maxWidth: "100%" }}>
              <table className="table" style={{ minWidth: 420 + (data.dates || []).length * 34 }}>
                <thead>
                  <tr>
                    <th style={{ position: "sticky", left: 0, background: C.surface, zIndex: 2 }}>Roll</th>
                    <th style={{ position: "sticky", left: 44, background: C.surface, zIndex: 2 }}>Student</th>
                    {(data.dates || []).map((d) => (
                      <th key={d} style={{ fontSize: 10, fontWeight: 600, textAlign: "center", padding: "6px 4px", whiteSpace: "nowrap" }}>
                        {new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </th>
                    ))}
                    <th style={{ textAlign: "center" }}>P</th>
                    <th style={{ textAlign: "center" }}>A</th>
                    <th style={{ textAlign: "center" }}>L</th>
                    <th style={{ textAlign: "center" }}>OD</th>
                    <th style={{ textAlign: "center" }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s) => (
                    <tr key={s.student_id}>
                      <td style={{ color: C.textMuted, position: "sticky", left: 0, background: C.surface, zIndex: 1 }}>{s.roll_no || "—"}</td>
                      <td style={{ fontWeight: 600, position: "sticky", left: 44, background: C.surface, zIndex: 1, whiteSpace: "nowrap" }}>
                        {[s.first_name, s.last_name].filter(Boolean).join(" ")}
                      </td>
                      {(data.dates || []).map((d) => {
                        const st = s.daily?.[d];
                        return (
                          <td key={d} style={{ textAlign: "center", padding: "6px 4px" }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: st ? STATUS_META[st]?.color || C.textMuted : C.border,
                              }}
                            >
                              {st || "·"}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ color: C.green, textAlign: "center" }}>{s.present_days}</td>
                      <td style={{ color: C.red, textAlign: "center" }}>{s.absent_days}</td>
                      <td style={{ color: C.yellow, textAlign: "center" }}>{s.leave_days}</td>
                      <td style={{ color: C.blue, textAlign: "center" }}>{s.od_days}</td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className="syne"
                          style={{
                            fontWeight: 700,
                            color:
                              s.percentage >= 90
                                ? C.green
                                : s.percentage >= 75
                                ? C.yellow
                                : C.red,
                          }}
                        >
                          {s.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
