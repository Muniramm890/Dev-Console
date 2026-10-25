// FILE: teacher-app/src/modules/exams/ResultsPublishTab.tsx
// Source: admin App.tsx -> ResultsPublishTab [17625-18041]
// @ts-nocheck
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { apiRequest } from "../../api/client";
import { explain } from "../../utils/apiErrors";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { EXAM_STATUS_META } from "./helpers";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// RESULTS & PUBLISH TAB
// ═══════════════════════════════════════════════════════════════
export const ResultsPublishTab = ({ exam, examSections, onExamUpdated }) => {
  const { dialogConfirm } = useDialog();
  const [sectionId, setSectionId] = useState(examSections[0]?.id || "");
  const [results, setResults] = useState([]);
  const [subjectCols, setSubjectCols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // student row to reset
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [stale, setStale] = useState(false); // marks / date sheet changed after the last compute
  const locked = exam.status === "published";

  const load = async () => {
    if (!sectionId) return;
    setLoading(true);
    try {
      const res = await apiRequest(
        `/exams/${exam.id}/results?section_id=${sectionId}`
      );
      setResults(Array.isArray(res?.data?.rows) ? res.data.rows : []);
      setSubjectCols(
        Array.isArray(res?.data?.subjects) ? res.data.subjects : []
      );
      setStale(!!res?.data?.stale);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [sectionId]); // eslint-disable-line

      // 🔴 FIXED: Now points to the unified Result Engine and passes section_id
  // all = every class of the exam in one go (backend: no section_id)
  const handleProcess = async (all = false) => {
    if (locked) return alert("Results are published. Unpublish first to recompute.");
    if (!all && !sectionId) return alert("Please select a class/section first.");
    const q = all ? "Compute/Recompute results for ALL classes of this exam?" : "Compute/Recompute results for this class?";
    if (!(await dialogConfirm(q, "Recompute Results"))) return;
    setProcessing(true);
    try {
      const res = await apiRequest(`/results/compute/${exam.id}`, "POST", all ? {} : { section_id: sectionId });
      await load();
      alert(res?.message || "Results computed successfully!");
    } catch (e) {
      alert("Processing failed: " + explain(e));
    } finally {
      setProcessing(false);
    }
  };

  const handlePublish = async (publish, force = false) => {
    try {
      await apiRequest(`/exams/${exam.id}/${publish ? "publish" : "unpublish"}`, "PUT", publish && force ? { force: true } : undefined);
      onExamUpdated({ ...exam, status: publish ? "published" : "completed" });
      setConfirmPublish(false);
    } catch (e) {
      const list = Array.isArray(e?.errors) ? e.errors : [];
      // only "incomplete marks" left -> the admin may knowingly publish anyway
      if (publish && !force && e?.status === 409 && list.length && list.every((x) => /incomplete/i.test(x))) {
        if (await dialogConfirm(`${list.join("\n")}\n\nPublish anyway? Those students will show as "incomplete".`, "Incomplete results")) return handlePublish(true, true);
        return;
      }
      setConfirmPublish(false);
      alert("Failed: " + explain(e));
    }
  };

  const handleDeleteResult = async () => {
    if (!confirmDelete) return;
    try {
      await apiRequest(
        `/exams/${exam.id}/results/${confirmDelete.student_id}`,
        "DELETE"
      );
      setConfirmDelete(null);
      await load();
    } catch (e) {
      alert("Delete failed: " + explain(e));
    }
  };

  const gradeColor = (g) => {
    if (["A+", "A"].includes(g)) return C.green;
    if (["B+", "B"].includes(g)) return C.blue;
    if (g === "C") return C.yellow;
    return C.red;
  };

  const passCount = results.filter((r) => r.status === "pass").length;
  const gradeNames = [...new Set(results.map((r) => r.grade).filter(Boolean))];
  const gradeDist = gradeNames
    .map((g) => ({
      name: g,
      value: results.filter((r) => r.grade === g).length,
    }))
    .filter((d) => d.value > 0);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <select
            className="select"
            style={{ width: 220 }}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            {examSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.grade_name} — {s.name}
              </option>
            ))}
          </select>
          <span
            className="badge"
            style={{
              background: `${EXAM_STATUS_META[exam.status]?.color}22`,
              color: EXAM_STATUS_META[exam.status]?.color,
            }}
          >
            {EXAM_STATUS_META[exam.status]?.label}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={() => handleProcess(false)}
              disabled={processing || locked}
              title={locked ? "Unpublish to recompute" : ""}
            >
              {processing ? "Computing..." : "Process / Recompute Results"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => handleProcess(true)}
              disabled={processing || locked}
              title={locked ? "Unpublish to recompute" : "Compute every class of this exam"}
            >
              Compute All Classes
            </button>
            {exam.status === "published" ? (
              <button
                className="btn btn-ghost"
                onClick={() => handlePublish(false)}
              >
                Unpublish (Edit Mode)
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setConfirmPublish(true)}
                disabled={results.length === 0}
              >
                Publish Results
              </button>
            )}
          </div>
        </div>
      </div>

      {stale && !locked && (
        <div className="card" style={{ marginBottom: 16, borderColor: C.yellow, color: C.yellow, fontSize: 13, fontWeight: 600 }}>
          Marks or the date sheet changed after the last compute - press "Process / Recompute Results" before publishing.
        </div>
      )}

      {results.length > 0 && (
        <div
          className="grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 20,
            marginBottom: 20,
          }}
        >
          <div className="card">
            <h3
              className="syne"
              style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}
            >
              Grade Distribution
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={gradeDist}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {gradeDist.map((d, i) => (
                    <Cell key={i} fill={gradeColor(d.name)} />
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
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 14,
            }}
          >
            {[
              ["Students", results.length, C.blue],
              ["Passed", passCount, C.green],
              [
                "Pass Rate",
                `${Math.round((passCount / results.length) * 100)}%`,
                C.primary,
              ],
              [
                "Class Topper",
                `${Math.max(...results.map((r) => r.percentage))}%`,
                C.yellow,
              ],
            ].map(([l, v, c]) => (
              <div
                key={l}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span style={{ fontSize: 12, color: C.textMuted }}>{l}</span>
                <span
                  className="syne"
                  style={{ fontSize: 16, fontWeight: 800, color: c }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div
            className="pulse"
            style={{ padding: 30, textAlign: "center", color: C.primary }}
          >
            Loading results…
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
            No results yet — enter marks for all subjects, then click "Process /
            Recompute Results".
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Student</th>
                  {subjectCols.map((s) => (
                    <th key={s.id} style={{ fontSize: 10 }}>
                      {s.name}
                    </th>
                  ))}
                  <th>Total</th>
                  <th>%</th>
                  <th>Grade</th>
                  <th>Rank</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.student_id}>
                    <td style={{ color: C.textMuted }}>{r.roll_no || "—"}</td>
                    <td style={{ fontWeight: 600 }}>
                      {[r.first_name, r.last_name].filter(Boolean).join(" ")}
                    </td>
                    {subjectCols.map((s) => {
                    const markData = r.marks?.[s.id];
                    return (
                      <td 
                        key={s.id} 
                        style={{ 
                          fontSize: 12, 
                          color: markData?.status && markData.status !== 'present' ? C.red : C.text,
                          fontWeight: markData?.status && markData.status !== 'present' ? 700 : 400
                        }}
                      >
                        {markData?.val ?? "—"}
                      </td>
                    );
                  })}
                    <td className="syne" style={{ fontWeight: 700 }}>
                      {r.total_marks}/{r.max_total}
                    </td>
                    <td
                      className="syne"
                      style={{
                        fontWeight: 700,
                        color:
                          r.percentage >= 60
                            ? C.green
                            : r.percentage >= 33
                            ? C.yellow
                            : C.red,
                      }}
                    >
                      {r.percentage}%
                    </td>
                    <td>
                      <span
                        style={{
                          background: `${gradeColor(r.grade)}22`,
                          color: gradeColor(r.grade),
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {r.grade}
                      </span>
                    </td>
                    <td>#{r.class_rank}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "4px 8px" }}
                        title="Delete this student's result"
                        onClick={() => setConfirmDelete(r)}
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm publish */}
      <Modal
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        title="Publish Results?"
        width={420}
      >
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📢</div>
          <div
            style={{
              color: C.textMuted,
              fontSize: 13,
              marginBottom: 22,
              lineHeight: 1.6,
            }}
          >
            Once published, this class's results become final and visible on
            report cards. You can unpublish later to make corrections.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmPublish(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handlePublish(true)}
            >
              Yes, Publish
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete one student's result */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Result?"
        width={420}
      >
        {confirmDelete && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
            <div
              style={{
                color: C.textMuted,
                fontSize: 13,
                marginBottom: 22,
                lineHeight: 1.6,
              }}
            >
              This will remove the processed result for{" "}
              <b style={{ color: C.text }}>
                {confirmDelete.first_name} {confirmDelete.last_name}
              </b>
              . Their entered marks stay intact — you can recompute anytime.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteResult}>
                Delete Result
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
