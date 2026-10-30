// FILE: teacher-app/src/modules/results/ResultsClassWiseTab.tsx
// Source: admin App.tsx -> ResultsClassWiseTab [19021-19066]
// @ts-nocheck
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { GRADE_COLORS } from "./helpers";
import { C } from "../../theme/theme";

// ─────────────────────────────────────────────────────────────
export const ResultsClassWiseTab = ({ examGroupId }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest(`/results/class-wise?exam_group_id=${examGroupId}`)
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [examGroupId]);

  if (loading) return <div className="pulse" style={{ textAlign: "center", color: C.primary, padding: 30 }}>Loading…</div>;
  if (!rows.length) return <div className="card" style={{ padding: 30, textAlign: "center", color: C.textMuted }}>No data yet.</div>;

  return (
    <div className="card">
      <h3 className="syne" style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Class-wise Average Performance</h3>
      <div style={{ width: "100%", height: 300, marginBottom: 20 }}>
        <ResponsiveContainer>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="grade_name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="avg_percentage" name="Avg %" radius={[6, 6, 0, 0]}>
              {rows.map((_, i) => <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="scroll-x">
      <table className="table" style={{ minWidth: 420 }}>
        <thead><tr><th>Class</th><th>Students</th><th>Pass %</th><th>Avg %</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.grade_id}>
              <td>{r.grade_name}</td><td>{r.total_students}</td><td>{r.pass_percent}%</td><td>{r.avg_percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};
