// FILE: teacher-app/src/modules/results/ResultsSubjectWiseTab.tsx
// Source: admin App.tsx -> ResultsSubjectWiseTab [19174-19221]
// @ts-nocheck
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { C } from "../../theme/theme";

// ─────────────────────────────────────────────────────────────
export const ResultsSubjectWiseTab = ({ examGroupId }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest(`/results/subject-wise?exam_group_id=${examGroupId}`)
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [examGroupId]);

  if (loading) return <div className="pulse" style={{ textAlign: "center", color: C.primary, padding: 30 }}>Loading…</div>;
  if (!rows.length) return <div className="card" style={{ padding: 30, textAlign: "center", color: C.textMuted }}>No data yet.</div>;

  return (
    <div className="card">
      <h3 className="syne" style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Subject-wise Performance</h3>
      <div style={{ width: "100%", height: 300, marginBottom: 20 }}>
        <ResponsiveContainer>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="subject_name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="avg_percentage" name="Avg %" fill={C.primary} radius={[6, 6, 0, 0]} />
            <Bar dataKey="pass_percent" name="Pass %" fill={C.green} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ overflowX: "auto" }}>
      <table className="table" style={{ minWidth: 640 }}>
        <thead><tr><th>Subject</th><th>Attempted</th><th>Absent</th><th>Pass %</th><th>Avg %</th><th>Highest</th><th>Lowest</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.subject_id}>
              <td>{r.subject_name}</td><td>{r.total_attempted}</td><td>{r.absent_count}</td>
              <td>{r.pass_percent}%</td><td>{r.avg_percentage}%</td>
              <td>{r.highest_marks ?? "-"}</td><td>{r.lowest_marks ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};
