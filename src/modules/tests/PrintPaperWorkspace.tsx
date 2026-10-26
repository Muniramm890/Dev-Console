// @ts-nocheck
// Print Studio: the paper itself is built by the backend (school brand colour, Hindi, math, images) and opened in the in-app PDF viewer.
import { useEffect, useState } from "react";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { explain } from "../../utils/apiErrors";
import { C } from "../../theme/theme";

const defaultSection = (q) => {
  let t = "MCQ";
  if (q.id && String(q.id).includes("_")) t = String(q.id).split("_").pop().toUpperCase();
  else if (q.type || q.qType) t = String(q.type || q.qType).toUpperCase();
  if (t === "DESC" || t === "DESCRIPTIVE") return { t, s: (q.marks || 1) >= 4 ? "C" : "B" };
  return { t, s: "A" };
};
const card = { background: C.surface, padding: 16, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 16 };
const h3 = { fontSize: 12, fontWeight: 800, color: C.primary, textTransform: "uppercase", marginBottom: 12 };

export const PrintPaperWorkspace = ({ testData, school, onClose }) => {
  const [printQs, setPrintQs] = useState([]);
  const [instructions, setInstructions] = useState(["All questions are compulsory.", "Read the instructions carefully before answering.", "Write neatly and legibly in the space provided."]);
  const [sections] = useState([{ id: "A", title: "Objective Type Questions" }, { id: "B", title: "Short Answer Questions" }, { id: "C", title: "Long / Descriptive Questions" }, { id: "D", title: "Miscellaneous" }]);
  const [theme, setTheme] = useState("board");
  const [mode, setMode] = useState("paper");
  const [accent, setAccent] = useState("brand");
  const [lineMultiplier, setLineMultiplier] = useState(3);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!testData?.questions) return;
    setPrintQs(testData.questions.map((q, i) => { const d = defaultSection(q); return { ...q, _i: i, qType: d.t, printSection: d.s, customLines: (q.marks || 1) * 3 }; }));
  }, [testData]);

  const totalMarks = printQs.reduce((n, q) => n + (Number(q.marks) || 1), 0);
  const upd = (i, patch) => setPrintQs((p) => p.map((q, k) => (k === i ? { ...q, ...patch } : q)));

  const generate = async () => {
    setBusy(true);
    try {
      const overrides = {}; printQs.forEach((q, i) => { overrides[i] = { section: q.printSection, lines: q.customLines }; });
      const m = testData?.meta || {};
      await openGeneratedPdf("/quick-tests/print-paper", {
        method: "POST", name: `${m.testName || "Question Paper"}.pdf`, title: m.testName || "Question Paper",
        body: { testId: m.testId, settings: { theme, mode, accent, lineMultiplier, instructions, sections, overrides } },
      });
    } catch (e) { alert("Could not create the paper: " + explain(e)); } finally { setBusy(false); }
  };

  return (
    <div className="slide-in" style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: "8px 12px", background: C.surfaceAlt }}><Icon name="close" size={16} /> Close</button>
          <div><h2 className="syne" style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Print Studio</h2>
            <p style={{ fontSize: 11, color: C.primary, fontWeight: 700, margin: 0, textTransform: "uppercase" }}>{testData?.meta?.testName || "Question Paper"}</p></div>
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px" }}>
          <Icon name="download" size={16} /> {busy ? "Preparing PDF..." : "Generate PDF"}
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 20 }} className="custom-scroll">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={card}>
            <h3 style={h3}>Overview</h3>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
              <span><b>{printQs.length}</b> questions</span><span><b>{totalMarks}</b> marks</span>
              {sections.map((s) => { const n = printQs.filter((q) => q.printSection === s.id); return n.length ? <span key={s.id} style={{ color: C.textMuted }}>Section {s.id}: {n.length} Q</span> : null; })}
            </div>
            <p style={{ fontSize: 11.5, color: C.textMuted, marginTop: 10 }}>The paper is built on the server with your school header, colour and footer. It opens in the viewer where you can download or print it.</p>
          </div>

          <div style={card}>
            <h3 style={h3}>1. Paper settings</h3>
            <FormRow label="Design theme">
              <select className="select" value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="board">Board (double border)</option><option value="standard">Standard (single line)</option>
                <option value="premium">Premium (rounded)</option><option value="minimal">Minimal (no border)</option>
              </select>
            </FormRow>
            <FormRow label="Colour">
              <select className="select" value={accent} onChange={(e) => setAccent(e.target.value)}>
                <option value="brand">School colour</option><option value="black">Black and white (for printing)</option>
              </select>
            </FormRow>
            <FormRow label="Format mode">
              <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="paper">Compact question paper</option><option value="worksheet">Worksheet (with answer spaces)</option>
              </select>
            </FormRow>
            {mode === "worksheet" && (
              <div style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${C.border}66` }}>
                <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 6 }}>Blank lines per mark</label>
                <input type="range" min="1" max="10" value={lineMultiplier} onChange={(e) => { const v = Number(e.target.value); setLineMultiplier(v); setPrintQs((p) => p.map((q) => ({ ...q, customLines: (q.marks || 1) * v }))); }} style={{ width: "100%", accentColor: C.primary }} />
                <div style={{ textAlign: "right", fontSize: 11, fontWeight: 800, color: C.primary }}>{lineMultiplier} lines / mark</div>
              </div>
            )}
          </div>

          <div style={card}>
            <h3 style={h3}>2. General instructions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {instructions.map((inst, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input className="input" value={inst} onChange={(e) => { const n = [...instructions]; n[i] = e.target.value; setInstructions(n); }} style={{ flex: 1, fontSize: 12, padding: "6px 10px" }} />
                  <button className="btn btn-danger" style={{ padding: "6px 8px" }} onClick={() => setInstructions(instructions.filter((_, k) => k !== i))}><Icon name="trash" size={14} /></button>
                </div>))}
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: 6 }} onClick={() => setInstructions([...instructions, ""])}>+ Add instruction</button>
            </div>
          </div>

          <div style={card}>
            <h3 style={h3}>3. Question relocator</h3>
            <p style={{ fontSize: 10.5, color: C.textMuted, marginBottom: 12 }}>Move a question to another section{mode === "worksheet" ? " or change its blank lines" : ""}.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {printQs.map((q, i) => (
                <div key={i} style={{ background: C.surfaceAlt, padding: 12, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Q{i + 1} [{q.marks || 1}]: {String(q.text || "").replace(/<[^>]+>/g, " ")}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select className="select" value={q.printSection} onChange={(e) => upd(i, { printSection: e.target.value })} style={{ flex: 1, minWidth: 140, fontSize: 11, padding: "4px 8px" }}>
                      {sections.map((s) => <option key={s.id} value={s.id}>Section {s.id}</option>)}
                    </select>
                    {mode === "worksheet" && (
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, color: C.textMuted }}>LINES
                        <input type="number" min="0" max="40" value={q.customLines} onChange={(e) => upd(i, { customLines: parseInt(e.target.value) || 0 })} style={{ width: 46, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: 4 }} />
                      </label>)}
                  </div>
                </div>))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
