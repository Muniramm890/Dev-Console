// FILE: teacher-app/src/modules/promotion/SectionTransferTab.tsx
// Source: admin App.tsx -> SectionTransferTab [9080-9189]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { useSession } from "../../contexts/SessionContext";
import { C } from "../../theme/theme";

export const SectionTransferTab = () => {
  const { currentYear } = useSession();
  const [sections, setSections] = useState([]);
  const [fromSectionId, setFromSectionId] = useState("");
  const [students, setStudents] = useState([]);
  const [moves, setMoves] = useState({}); // { student_id: { to_section_id, roll_no, enrolment_id } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!currentYear) return;
    apiRequest(`/setup/sections?academic_year_id=${currentYear.id}`)
      .then((res) => setSections(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setSections([]));
  }, [currentYear]);

  const loadStudents = async () => {
    if (!fromSectionId || !currentYear) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await apiRequest(`/promotion/section-students?section_id=${fromSectionId}&academic_year_id=${currentYear.id}`);
      const list = res?.data?.students || [];
      setStudents(list);
      const m = {};
      list.forEach((s) => { m[s.student_id] = { to_section_id: "", roll_no: s.roll_no || "", enrolment_id: s.enrolment_id }; });
      setMoves(m);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, [fromSectionId]); // eslint-disable-line

  const setMove = (sid, patch) => setMoves((p) => ({ ...p, [sid]: { ...p[sid], ...patch } }));

  const handleTransfer = async (studentId) => {
    const m = moves[studentId];
    if (!m?.to_section_id) return;
    try {
      await apiRequest("/promotion/section-change", "POST", {
        student_id: studentId,
        enrolment_id: m.enrolment_id,
        to_section_id: m.to_section_id,
        roll_no: m.roll_no,
      });
      setStudents((prev) => prev.filter((s) => s.student_id !== studentId));
      setMsg("Section updated ✅");
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 12.5, color: C.textMuted }}>
        Move a student from one section to another within the same session — no new history entry is created, only the current section changes.
      </div>
      <FormRow label="From Section">
        <select className="select" value={fromSectionId} onChange={(e) => setFromSectionId(e.target.value)}>
          <option value="">Select section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.grade_name ? `${s.grade_name} - ${s.name}` : s.name}</option>
          ))}
        </select>
      </FormRow>

      {msg && <div style={{ fontSize: 12.5, color: C.textMuted, margin: "10px 0" }}>{msg}</div>}

      {loading ? (
        <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Loading…</div>
      ) : students.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr><th>Roll</th><th>Student</th><th>Move To Section</th><th>New Roll No</th><th></th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.student_id}>
                  <td>{s.roll_no}</td>
                  <td>{s.first_name} {s.last_name}</td>
                  <td>
                    <select className="select" style={{ width: 150 }} value={moves[s.student_id]?.to_section_id || ""} onChange={(e) => setMove(s.student_id, { to_section_id: e.target.value })}>
                      <option value="">Select</option>
                      {sections.filter((sec) => sec.id !== fromSectionId && sec.grade_id === sections.find((f) => f.id === fromSectionId)?.grade_id).map((sec) => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input className="input" style={{ width: 70 }} value={moves[s.student_id]?.roll_no || ""} onChange={(e) => setMove(s.student_id, { roll_no: e.target.value })} />
                  </td>
                  <td>
                    <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => handleTransfer(s.student_id)} disabled={!moves[s.student_id]?.to_section_id}>
                      Move
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
