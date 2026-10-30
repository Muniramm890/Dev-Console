// @ts-nocheck
// Admit-card popup: theme + editable instructions (pre-filled, deletable), whole class or a single student.
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { explain } from "../../utils/apiErrors";
import { useDialog } from "../../contexts/DialogContext";
import { Modal } from "../../components/ui/Modal";
import { Icon } from "../../components/ui/Icon";
import { C } from "../../theme/theme";

const DEFAULTS = [
  "Bring this admit card to the examination hall every day.",
  "Reach the examination centre at least 15 minutes before the exam starts.",
  "Mobile phones and other electronic devices are not allowed in the hall.",
];
const KEY = "admit_card_settings_v1";
const load = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || "null"); if (j && Array.isArray(j.instructions)) return j; } catch { /* ignore */ } return null; };
const lab = { display: "block", fontSize: 11, color: C.textMuted, marginBottom: 4 };

export const AdmitCardPanel = ({ open, onClose, examId, sectionId, sectionLabel }) => {
  const { dialogAlert } = useDialog();
  const saved = load();
  const [theme, setTheme] = useState(saved?.theme || "board");
  const [instructions, setInstructions] = useState(saved?.instructions || DEFAULTS);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ theme, instructions })); } catch { /* ignore */ } }, [theme, instructions]);

  useEffect(() => {
    setStudentId("");
    if (!open || !sectionId) return;
    (async () => {
      try {
        const res = await apiRequest(`/students?section_id=${sectionId}&limit=2000`);
        setStudents(Array.isArray(res?.data) ? res.data : []);
      } catch { setStudents([]); }
    })();
  }, [open, sectionId]);

  const nameOf = (s) => s.student_name || s.name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Student";

  const generate = async () => {
    if (!sectionId) { await dialogAlert("Please select a class / section.", "Admit Cards"); return; }
    setBusy(true);
    try {
      await openGeneratedPdf(`/exams/${examId}/admit-cards`, {
        method: "POST",
        name: studentId ? "Admit Card" : "Admit Cards",
        title: studentId ? "Admit Card" : "Admit Cards",
        body: { section_id: sectionId, student_ids: studentId ? [studentId] : [], settings: { theme, instructions } },
      });
    } catch (e) {
      await dialogAlert(explain(e) || e?.message || "Could not generate the admit card.", "Admit Cards");
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Admit Cards" width={580}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
        Admit cards are generated from the saved date sheet{sectionLabel ? ` of ${sectionLabel}` : ""}. Save the date sheet first if you changed it.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={lab}>DESIGN THEME</label>
          <select className="select" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="board">Board (double border)</option>
            <option value="standard">Standard (single line)</option>
            <option value="premium">Premium (rounded)</option>
            <option value="minimal">Minimal (no border)</option>
          </select>
        </div>
        <div>
          <label style={lab}>GENERATE FOR</label>
          <select className="select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Entire class ({students.length || "…"} students)</option>
            {students.map((s) => (<option key={s.id} value={s.id}>{s.roll_no ? `${s.roll_no}. ` : ""}{nameOf(s)}</option>))}
          </select>
        </div>
      </div>
      <label style={lab}>INSTRUCTIONS (editable)</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {instructions.map((inst, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <input className="input" value={inst} style={{ flex: 1, fontSize: 12, padding: "6px 10px" }}
              onChange={(e) => { const n = [...instructions]; n[i] = e.target.value; setInstructions(n); }} />
            <button className="btn btn-danger" style={{ padding: "6px 8px" }} aria-label="Delete instruction" onClick={() => setInstructions(instructions.filter((_, k) => k !== i))}><Icon name="trash" size={14} /></button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: 6 }} onClick={() => setInstructions([...instructions, ""])}>+ Add instruction</button>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: 6 }} onClick={() => setInstructions(DEFAULTS)}>Reset to default</button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={generate} disabled={busy}>{busy ? "Generating…" : studentId ? "Generate Admit Card" : "Generate Admit Cards"}</button>
      </div>
    </Modal>
  );
};
