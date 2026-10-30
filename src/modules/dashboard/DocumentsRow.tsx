// @ts-nocheck
// Dashboard row (50% | 50%): Registers | Documents. Sits right below the Today row.
// Both lists are DATA-DRIVEN - to add a register or a document, add ONE line to REGISTERS / DOCUMENTS below.
//   to(examId)  -> exact screen (ID cards: open the module, then the profile > "ID Card" button) (deep link read by that module);  needsExam: true -> uses the exam selected in the Documents card.
// Lists scroll inside the card (max-height), so the row never grows when many items are added.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useSession } from "../../contexts/SessionContext";
import { Icon } from "../../components/ui/Icon";
import { C } from "../../theme/theme";

// ONE button per register module (the sub-views live inside that module's own Registers tab).
// Attendance is the exception: students and staff are two different registers, so two buttons.
const REGISTERS = [
  { label: "Student Register", icon: "students", to: () => "/attendance?mode=students&tab=register" },
  { label: "Staff Register", icon: "teachers", to: () => "/attendance?mode=teachers&tab=register" },
  { label: "Fee Registers", icon: "fee", to: () => "/fees?tab=registers" },
  { label: "Payroll Registers", icon: "wallet", to: () => "/payroll?tab=registers" },
  { label: "Marks Register", icon: "result", needsExam: true, to: (id) => `/results?exam=${id}&tab=register` },
  { label: "TC Register", icon: "file", to: () => "/promotion?tab=exits" },
];

const DOCUMENTS = [
  { label: "Admit Cards", sub: "Class or student", icon: "result", needsExam: true, to: (id) => `/exams?exam=${id}&admit=1` },
  { label: "Report Cards", sub: "Student or class", icon: "download", needsExam: true, to: (id) => `/results?exam=${id}&tab=student` },
  { label: "Student ID Card", sub: "From student profile", icon: "students", to: () => "/students" },
  { label: "Staff ID Card", sub: "From staff profile", icon: "teachers", to: () => "/teachers" },
  // { label: "TC", ... }   <- future documents: add one line each, sub: "...", icon: "students", to: () => "/students" },   <- future: ID Card, TC, Bonafide ...
];

const SCROLL = { maxHeight: 250, overflowY: "auto", paddingRight: 2 };
const stamp = (e) => String(e.start_date || e.created_at || "");

export const DocumentsRow = ({ tick = 0 }) => {
  const navigate = useNavigate();
  const { currentYear } = useSession();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const res = await apiRequest(`/exams${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ""}`);
        if (off) return;
        const list = (Array.isArray(res?.data) ? res.data : []).slice().sort((a, b) => stamp(b).localeCompare(stamp(a)));
        setExams(list);
        setExamId((prev) => (prev && list.some((e) => e.id === prev) ? prev : list[0]?.id || ""));
      } catch { if (!off) setExams([]); }
    })();
    return () => { off = true; };
  }, [tick, currentYear?.id]); // eslint-disable-line

  const head = { fontSize: 15, fontWeight: 700 };
  const bar = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, minHeight: 32 };

  return (
    <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
      <div className="card">
        <div style={bar}><h3 className="syne" style={head}>Registers</h3></div>
        <div style={{ ...SCROLL, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, alignContent: "start" }}>
          {REGISTERS.map((r) => {
            const off = r.needsExam && !examId;
            return (
              <button key={r.label} disabled={off} onClick={() => navigate(r.to(examId))}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontSize: 12.5, fontWeight: 600, cursor: off ? "default" : "pointer", opacity: off ? 0.5 : 1, textAlign: "left", minWidth: 0 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: `${C.primary}18`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={r.icon} size={12} />
                </span>
                <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div style={bar}>
          <h3 className="syne" style={head}>Documents</h3>
          {exams.length > 0 && (
            <select className="select" style={{ width: "auto", maxWidth: 190, fontSize: 12, padding: "5px 10px" }} value={examId} onChange={(e) => setExamId(e.target.value)} aria-label="Exam">
              {exams.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
          )}
        </div>
        <div style={{ ...SCROLL, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, alignContent: "start" }}>
          {DOCUMENTS.map((d) => {
            const off = d.needsExam && !examId;
            return (
              <button key={d.label} disabled={off} onClick={() => navigate(d.to(examId))}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.text, cursor: off ? "default" : "pointer", opacity: off ? 0.5 : 1, textAlign: "left", minWidth: 0 }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", background: `${C.primary}18`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={d.icon} size={14} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.sub}</div>
                </span>
              </button>
            );
          })}
        </div>
        {exams.length === 0 && <div style={{ color: C.textMuted, fontSize: 12, marginTop: 10 }}>Create an exam to enable admit cards and report cards.</div>}
      </div>
    </div>
  );
};
