// FILE: teacher-app/src/modules/results/ResultsTeacherWiseTab.tsx
// Source: admin App.tsx -> ResultsTeacherWiseTab [19224-19285]
// @ts-nocheck
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { C } from "../../theme/theme";

// ─────────────────────────────────────────────────────────────
export const ResultsTeacherWiseTab = ({ examGroupId }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest(`/results/teacher-wise?exam_group_id=${examGroupId}`)
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [examGroupId]);

  const byTeacher = {};
  rows.forEach((r) => {
    if (!byTeacher[r.teacher_user_id]) byTeacher[r.teacher_user_id] = { name: r.teacher_name, total: 0, count: 0 };
    byTeacher[r.teacher_user_id].total += r.avg_percentage;
    byTeacher[r.teacher_user_id].count += 1;
  });
  const chartData = Object.values(byTeacher).map((t) => ({
    name: t.name, avg_percentage: Math.round((t.total / t.count) * 100) / 100,
  }));

  if (loading) return <div className="pulse" style={{ textAlign: "center", color: C.primary, padding: 30 }}>Loading…</div>;
  if (!rows.length) return <div className="card" style={{ padding: 30, textAlign: "center", color: C.textMuted }}>No data yet — check that Timetable has teacher assignments for these subjects.</div>;

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="syne" style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          Teacher-wise Average (across all their classes)
        </h3>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="avg_percentage" name="Avg %" fill={C.purple} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Class-wise Breakdown</h3>
        <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ minWidth: 640 }}>
          <thead><tr><th>Teacher</th><th>Subject</th><th>Class</th><th>Attempted</th><th>Pass %</th><th>Avg %</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.teacher_name}</td><td>{r.subject_name}</td><td>{r.grade_name} - {r.section_name}</td>
                <td>{r.total_attempted}</td><td>{r.pass_percent}%</td><td>{r.avg_percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
