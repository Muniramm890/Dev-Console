// FILE: teacher-app/src/modules/promotion/PromotionOverviewTab.tsx
// Source: admin App.tsx -> PromotionOverviewTab [8799-8877]
// @ts-nocheck
import { useState } from "react";
import { KpiCard } from "../../components/ui/KpiCard";
import { C } from "../../theme/theme";

export const PromotionOverviewTab = ({ overview, loading, totals, toYearId, onPromoteSection }) => {
  const [gradeFilter, setGradeFilter] = useState("");
  const rows = overview?.by_grade_section || [];
  const filteredRows = gradeFilter ? rows.filter((r) => r.grade_id === gradeFilter) : rows;
  const grades = [...new Map(rows.map((r) => [r.grade_id, r.grade_name])).entries()];

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Loading overview…</div>;
  if (!overview) return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Select a session above.</div>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Total Students" value={totals.total} icon="students" color={C.blue} />
        <KpiCard label="Pending" value={totals.pending} icon="warning" color={C.orange || C.red} />
        <KpiCard label="Promoted" value={totals.promoted} icon="arrow_right" color={C.green} />
        <KpiCard label="Retained" value={totals.retained} icon="refresh" color={C.purple || C.blue} />
        <KpiCard label="TC Issued" value={totals.tc} icon="file" color={C.red} />
        <KpiCard label="Graduated" value={totals.graduated} icon="trophy" color={C.green} />
      </div>

      {!toYearId && (
        <div style={{ padding: "10px 14px", background: `${C.orange || C.red}11`, border: `1px solid ${C.orange || C.red}33`, borderRadius: 10, marginBottom: 16, fontSize: 12.5, color: C.textMuted }}>
          "To Session" is not selected — the promoted/retained/TC breakdown appears only after both sessions are selected. The grade-wise pending count is still shown below.
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <select className="select" style={{ width: 220 }} value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
          <option value="">All Grades</option>
          {grades.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Grade</th>
                <th>Section</th>
                <th>Total</th>
                <th>Processed</th>
                <th>Pending</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.section_id}>
                  <td>{r.grade_name}</td>
                  <td>{r.section_name}</td>
                  <td>{r.total_students}</td>
                  <td>{r.processed}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: r.pending > 0 ? (C.orange || C.red) : C.green }}>
                      {r.pending}
                    </span>
                  </td>
                  <td>
                    {r.pending > 0 && (
                      <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={onPromoteSection}>
                        Promote This Section →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: C.textMuted }}>No sections found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
