// FILE: teacher-app/src/modules/promotion/PromoteStudentsTab.tsx
// Source: admin App.tsx -> PromoteStudentsTab [8879-9078]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { C } from "../../theme/theme";

export const PromoteStudentsTab = ({ fromYearId, toYearId, onDone }) => {
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState("");
  const [students, setStudents] = useState([]);
  const [suggestedSection, setSuggestedSection] = useState(null);
  const [toSections, setToSections] = useState([]); // sections available in the "to" year
  const [rowActions, setRowActions] = useState({}); // { student_id: { action, to_section_id, roll_no, reason, enrolment_id } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fromYearId) return;
    apiRequest(`/setup/sections?academic_year_id=${fromYearId}`)
      .then((res) => setSections(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setSections([]));
  }, [fromYearId]);

  useEffect(() => {
    if (!toYearId) { setToSections([]); return; }
    apiRequest(`/setup/sections?academic_year_id=${toYearId}`)
      .then((res) => setToSections(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setToSections([]));
  }, [toYearId]);

  const loadStudents = async () => {
    if (!sectionId || !fromYearId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await apiRequest(`/promotion/section-students?section_id=${sectionId}&academic_year_id=${fromYearId}`);
      const list = res?.data?.students || [];
      setStudents(list);
      setSuggestedSection(res?.data?.suggested_next_section || null);
      const defaultActions = {};
      list.forEach((s) => {
        defaultActions[s.student_id] = {
          action: "promote",
          to_section_id: res?.data?.suggested_next_section?.id || "",
          roll_no: s.roll_no || "",
          reason: "",
          enrolment_id: s.enrolment_id,
        };
      });
      setRowActions(defaultActions);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, [sectionId]); // eslint-disable-line

  const setAction = (studentId, patch) => {
    setRowActions((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
  };

  const applyToAll = (action) => {
    setRowActions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sid) => {
        next[sid] = { ...next[sid], action, to_section_id: suggestedSection?.id || next[sid].to_section_id };
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!fromYearId || !toYearId) { setError("Select both the From and To sessions"); return; }
    const actions = Object.entries(rowActions).map(([student_id, a]) => ({
      student_id,
      enrolment_id: a.enrolment_id,
      action: a.action,
      to_section_id: a.action === "promote" ? a.to_section_id : undefined,
      roll_no: a.roll_no,
      reason: a.reason,
    }));
    const invalidPromote = actions.find((a) => a.action === "promote" && !a.to_section_id);
    if (invalidPromote) { setError("'Promote to Section' is not selected for some students"); return; }

    setSaving(true);
    setError("");
    try {
      const res = await apiRequest("/promotion/run", "POST", {
        from_academic_year_id: fromYearId,
        to_academic_year_id: toYearId,
        actions,
      });
      setResult(res?.data?.counts || null);
      setStudents([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <FormRow label="Section (from current session)">
          <select className="select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">Select section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.grade_name ? `${s.grade_name} - ${s.name}` : s.name}</option>
            ))}
          </select>
        </FormRow>
        {students.length > 0 && (
          <>
            <button className="btn btn-ghost" onClick={() => applyToAll("promote")}>Set all → Promote</button>
            <button className="btn btn-ghost" onClick={() => applyToAll("retain")}>Set all → Retain</button>
          </>
        )}
      </div>

      {error && <div style={{ color: C.red, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      {result && (
        <div style={{ padding: 14, background: `${C.green}11`, border: `1px solid ${C.green}33`, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          ✅ Done — Promoted: <strong>{result.promoted}</strong>, Retained: <strong>{result.retained}</strong>, TC: <strong>{result.tc}</strong>, Graduated: <strong>{result.graduated}</strong>
          {result.skipped > 0 && <span> ({result.skipped} skipped — already processed)</span>}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Loading students…</div>
      ) : students.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
          {sectionId ? "All students in this section have already been processed." : "Select a section above."}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Student</th>
                  <th>Last Result</th>
                  <th>Action</th>
                  <th>Promote To Section</th>
                  <th>New Roll No</th>
                  <th>Reason (TC/Graduate)</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const a = rowActions[s.student_id] || {};
                  return (
                    <tr key={s.student_id}>
                      <td>{s.roll_no}</td>
                      <td>{s.first_name} {s.last_name}</td>
                      <td>{s.percentage != null ? `${s.percentage}% (${s.result_grade || "-"})` : "—"}</td>
                      <td>
                        <select className="select" style={{ width: 120 }} value={a.action} onChange={(e) => setAction(s.student_id, { action: e.target.value })}>
                          <option value="promote">Promote</option>
                          <option value="retain">Retain</option>
                          <option value="tc">Issue TC</option>
                          <option value="graduate">Graduate</option>
                        </select>
                      </td>
                      <td>
                        {a.action === "promote" ? (
                          <select className="select" style={{ width: 150 }} value={a.to_section_id || ""} onChange={(e) => setAction(s.student_id, { to_section_id: e.target.value })}>
                            <option value="">Select</option>
                            {toSections.map((ts) => (
                              <option key={ts.id} value={ts.id}>{ts.grade_name ? `${ts.grade_name} - ${ts.name}` : ts.name}</option>
                            ))}
                          </select>
                        ) : "—"}
                      </td>
                      <td>
                        {(a.action === "promote" || a.action === "retain") ? (
                          <input className="input" style={{ width: 70 }} value={a.roll_no || ""} onChange={(e) => setAction(s.student_id, { roll_no: e.target.value })} />
                        ) : "—"}
                      </td>
                      <td>
                        {(a.action === "tc" || a.action === "graduate") ? (
                          <input className="input" style={{ width: 160 }} value={a.reason || ""} placeholder="Reason" onChange={(e) => setAction(s.student_id, { reason: e.target.value })} />
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: 16, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving} style={{ minWidth: 180, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Processing…" : `Confirm for ${students.length} Students`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
