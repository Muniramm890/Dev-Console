// FILE: teacher-app/src/modules/results/ResultsSectionWiseTab.tsx
// Source: admin App.tsx -> ResultsSectionWiseTab [19069-19171]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { C } from "../../theme/theme";

// ─────────────────────────────────────────────────────────────
export const ResultsSectionWiseTab = ({ examGroupId }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(null);
  const [drillRows, setDrillRows] = useState([]);
    const [drillSubjects, setDrillSubjects] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiRequest(`/results/section-wise?exam_group_id=${examGroupId}`)
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [examGroupId]);

  const openDrill = async (row) => {
    setDrill(row);
    setDrillLoading(true);
    try {
      // Same API used by Exam Management → "Results & Publish" tab
      const res = await apiRequest(`/exams/${examGroupId}/results?section_id=${row.section_id}`);
      setDrillRows(Array.isArray(res?.data?.rows) ? res.data.rows : []);
      setDrillSubjects(Array.isArray(res?.data?.subjects) ? res.data.subjects : []);
    } catch (e) { console.error(e); } finally { setDrillLoading(false); }
  };

  if (loading) return <div className="pulse" style={{ textAlign: "center", color: C.primary, padding: 30 }}>Loading…</div>;

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ minWidth: 560 }}>
          <thead><tr><th>Class</th><th>Section</th><th>Students</th><th>Pass %</th><th>Avg %</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.section_id}>
                <td>{r.grade_name}</td><td>Section {r.section_name}</td><td>{r.total_students}</td>
                <td>{r.pass_percent}%</td><td>{r.avg_percentage}%</td>
                <td>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => openDrill(r)}>
                    View Students
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {drill && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 className="syne" style={{ fontSize: 15, fontWeight: 700 }}>
              {drill.grade_name} - Section {drill.section_name} — Student Results
            </h3>
            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setDrill(null)}>Close</button>
          </div>
          {drillLoading ? (
            <div className="pulse" style={{ textAlign: "center", color: C.primary, padding: 20 }}>Loading…</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 620 + drillSubjects.length * 90 }}>
              <thead>
                <tr>
                  <th>Rank</th><th>Roll</th><th>Name</th>
                  {drillSubjects.map((sub) => (<th key={sub.id}>{sub.name}</th>))}
                  <th>Total</th><th>%</th><th>Grade</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {drillRows.map((s) => (
                  <tr key={s.student_id}>
                    <td>{s.class_rank ?? "-"}</td>
                    <td>{s.roll_no || "-"}</td>
                    <td>{s.first_name} {s.last_name || ""}</td>
                    {drillSubjects.map((sub) => {
                      const m = s.marks?.[sub.id];
                      if (!m) return <td key={sub.id}>-</td>;
                      if (m.status !== "present") return <td key={sub.id} style={{ color: C.red }}>{m.val}</td>;
                      return <td key={sub.id}>{m.val ?? "-"}</td>;
                    })}
                    <td>{s.status === "incomplete" ? "-" : `${s.total_marks}/${s.max_total}`}</td>
                    <td>{s.percentage ?? "-"}</td>
                    <td>{s.grade || "-"}</td>
                    <td>
                      <span className={`badge ${s.status === "pass" ? "badge-green" : s.status === "fail" ? "badge-red" : "badge-purple"}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
