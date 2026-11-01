// @ts-nocheck
// Quick Test 2.0 - create / edit a test: details, window, audience (sections), questions picked from the bank.
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { useSession } from "../../contexts/SessionContext";
import { C } from "../../theme/theme";
import { useGradesAndSections } from "../attendance/useGradesAndSections";
import { cbt, unwrap, useSubjects } from "./cbtApi";
import { QuestionList } from "./QuestionBankTab";
import { PROCTOR_LABELS, VIS_LABELS, fromLocalInput, toLocalInput, typeShort } from "./helpers";

const blank = () => ({ title: "", grade_id: "", subject_id: "", chapter_no: "", chapter_name: "", instructions: "", duration_min: 30, pass_marks: "", max_attempts: 1,
  negative_marking: false, shuffle_questions: false, shuffle_options: false, result_visibility: 0, proctoring: 0, starts_at: "", ends_at: "", section_ids: [], questions: [] });

const Row = ({ label, children, flex = 1 }) => (
  <div style={{ flex, minWidth: 150 }}>
    <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 5, fontWeight: 600 }}>{label}</label>
    {children}
  </div>
);

export const TestEditor = ({ open, onClose, testId, onSaved }) => {
  const { dialogAlert } = useDialog();
  const { currentYear } = useSession();
  const { grades, sections } = useGradesAndSections();
  const subjects = useSubjects();
  const [f, setF] = useState(blank());
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [allowProctor, setAllowProctor] = useState(true);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const editing = !!testId;

  useEffect(() => {
    if (!open) return;
    cbt.get("/settings").then((r) => { const s = unwrap(r).settings; setAllowProctor(!!s.allow_proctoring); if (!testId) setF((p) => ({ ...p, duration_min: s.default_duration_min || 30 })); }).catch(() => {});
    if (!testId) { setF(blank()); setLocked(false); return; }
    setLoading(true);
    cbt.get(`/tests/${testId}`).then((r) => {
      const t = unwrap(r);
      setLocked(!!t.has_attempts);
      setF({ title: t.title, grade_id: t.grade_id, subject_id: t.subject_id || "", chapter_no: t.chapter_no || "", chapter_name: t.chapter_name || "", instructions: t.instructions || "", duration_min: t.duration_min,
        pass_marks: t.pass_marks == null ? "" : t.pass_marks, max_attempts: t.max_attempts, negative_marking: !!t.negative_marking, shuffle_questions: !!t.shuffle_questions, shuffle_options: !!t.shuffle_options,
        result_visibility: Math.min(2, t.result_visibility), proctoring: t.proctoring, starts_at: toLocalInput(t.starts_at), ends_at: toLocalInput(t.ends_at), section_ids: t.section_ids || [],
        questions: (t.questions || []).map((q) => ({ question_id: q.question_id, rev_no: q.rev_no, q_type: q.q_type, snippet: String(q.body || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "[image]").slice(0, 120), marks: q.marks, negative_marks: q.negative_marks, section_label: q.section_label || "" })) });
    }).catch((e) => dialogAlert(e.message || "Could not load the test")).finally(() => setLoading(false));
  }, [open, testId]); // eslint-disable-line

  const gradeSections = useMemo(() => sections.filter((s) => s.grade_id === f.grade_id), [sections, f.grade_id]);
  const selectedIds = useMemo(() => new Set(f.questions.map((q) => q.question_id)), [f.questions]);
  const total = f.questions.reduce((s, q) => s + (q.q_type === 9 ? 0 : Number(q.marks) || 0), 0);

  const toggleQuestion = (q) => setF((p) => {
    if (p.questions.some((x) => x.question_id === q.id)) return { ...p, questions: p.questions.filter((x) => x.question_id !== q.id) };
    return { ...p, questions: [...p.questions, { question_id: q.id, rev_no: null, q_type: q.q_type, snippet: String(q.snippet || "").replace(/!\[[^\]]*\]\([^)]*\)?/g, "[image]").slice(0, 120), marks: q.marks, negative_marks: 0, section_label: "" }] };
  });
  const move = (i, d) => setF((p) => { const a = p.questions.slice(); const j = i + d; if (j < 0 || j >= a.length) return p; [a[i], a[j]] = [a[j], a[i]]; return { ...p, questions: a }; });
  const patchQ = (i, patch) => set("questions", f.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const toggleSection = (id) => set("section_ids", f.section_ids.includes(id) ? f.section_ids.filter((x) => x !== id) : [...f.section_ids, id]);

  const save = async () => {
    if (!f.title.trim()) return dialogAlert("Enter a test title.");
    if (!f.grade_id) return dialogAlert("Choose the class.");
    const light = { title: f.title, instructions: f.instructions || null, starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at), pass_marks: f.pass_marks === "" ? null : Number(f.pass_marks),
      result_visibility: Number(f.result_visibility), section_ids: f.section_ids };
    const full = { ...light, grade_id: f.grade_id, subject_id: f.subject_id || null, chapter_no: f.chapter_no || null, chapter_name: f.chapter_name || null, duration_min: Number(f.duration_min),
      max_attempts: Number(f.max_attempts), negative_marking: f.negative_marking, shuffle_questions: f.shuffle_questions, shuffle_options: f.shuffle_options, proctoring: Number(f.proctoring),
      questions: f.questions.map((q) => ({ question_id: q.question_id, rev_no: q.rev_no || undefined, marks: Number(q.marks), negative_marks: Number(q.negative_marks || 0), section_label: q.section_label || undefined })) };
    setSaving(true);
    try {
      if (editing) await cbt.put(`/tests/${testId}`, locked ? light : full);
      else await cbt.post("/tests", { ...full, academic_year_id: currentYear && currentYear.id });
      onSaved && onSaved(); onClose();
    } catch (e) { dialogAlert(e.message || "Could not save the test"); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={editing ? "Edit Test" : "New Test"} width={860}>
        {loading ? <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading</div> : (
          <div>
            {locked && <div style={{ background: `${C.yellow}18`, border: `1px solid ${C.yellow}55`, color: C.yellow, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, marginBottom: 14 }}>Students have already attempted this test, so only the title, instructions, time window, pass marks, result visibility and sections can be changed.</div>}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <Row label="Test title" flex={3}><input className="input" style={{ width: "100%" }} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Chapter 3 - Linear Equations" /></Row>
              <Row label="Class"><select className="select" style={{ width: "100%" }} disabled={locked} value={f.grade_id} onChange={(e) => setF((p) => ({ ...p, grade_id: e.target.value, section_ids: [] }))}><option value="">Select</option>{grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Row>
              <Row label="Subject"><select className="select" style={{ width: "100%" }} disabled={locked} value={f.subject_id} onChange={(e) => set("subject_id", e.target.value)}><option value="">Not set</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Row>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <Row label="Chapter no."><input className="input" style={{ width: "100%" }} disabled={locked} value={f.chapter_no} onChange={(e) => set("chapter_no", e.target.value)} /></Row>
              <Row label="Chapter name" flex={2}><input className="input" style={{ width: "100%" }} disabled={locked} value={f.chapter_name} onChange={(e) => set("chapter_name", e.target.value)} /></Row>
              <Row label="Duration (minutes)"><input className="input" type="number" min="1" style={{ width: "100%" }} disabled={locked} value={f.duration_min} onChange={(e) => set("duration_min", e.target.value)} /></Row>
              <Row label="Pass marks"><input className="input" type="number" min="0" style={{ width: "100%" }} value={f.pass_marks} onChange={(e) => set("pass_marks", e.target.value)} placeholder="Optional" /></Row>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <Row label="Opens at"><input className="input" type="datetime-local" style={{ width: "100%" }} value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} /></Row>
              <Row label="Closes at"><input className="input" type="datetime-local" style={{ width: "100%" }} value={f.ends_at} onChange={(e) => set("ends_at", e.target.value)} /></Row>
              <Row label="Attempts allowed"><input className="input" type="number" min="1" max="20" style={{ width: "100%" }} disabled={locked} value={f.max_attempts} onChange={(e) => set("max_attempts", e.target.value)} /></Row>
              <Row label="Results"><select className="select" style={{ width: "100%" }} value={f.result_visibility} onChange={(e) => set("result_visibility", e.target.value)}>{VIS_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></Row>
            </div>
            <div style={{ marginBottom: 14 }}><Row label="Instructions for students"><textarea className="input" rows={2} style={{ width: "100%" }} value={f.instructions} onChange={(e) => set("instructions", e.target.value)} /></Row></div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14, fontSize: 13 }}>
              <label><input type="checkbox" disabled={locked} checked={f.negative_marking} onChange={(e) => set("negative_marking", e.target.checked)} /> Negative marking</label>
              <label><input type="checkbox" disabled={locked} checked={f.shuffle_questions} onChange={(e) => set("shuffle_questions", e.target.checked)} /> Shuffle questions</label>
              <label><input type="checkbox" disabled={locked} checked={f.shuffle_options} onChange={(e) => set("shuffle_options", e.target.checked)} /> Shuffle options</label>
              {allowProctor && <label>Proctoring: <select className="select" disabled={locked} value={f.proctoring} onChange={(e) => set("proctoring", e.target.value)}>{PROCTOR_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></label>}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>Sections (leave all unticked to give the test to the whole class)</label>
              {!f.grade_id ? <span style={{ fontSize: 12.5, color: C.textMuted }}>Choose a class first.</span> : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {gradeSections.map((s) => (
                    <label key={s.id} className="badge" style={{ cursor: "pointer", padding: "6px 12px", background: f.section_ids.includes(s.id) ? `${C.primary}33` : C.surfaceAlt, color: f.section_ids.includes(s.id) ? C.primaryText : C.text }}>
                      <input type="checkbox" style={{ marginRight: 6 }} checked={f.section_ids.includes(s.id)} onChange={() => toggleSection(s.id)} />{s.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>Questions ({f.questions.length}) - total {total} marks</label>
                {!locked && <button type="button" className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12.5 }} onClick={() => setPicker(true)}><Icon name="plus" size={13} /> Add from bank</button>}
              </div>
              {f.questions.length === 0 ? <div style={{ fontSize: 13, color: C.textMuted, padding: 14, border: `1px dashed ${C.border}`, borderRadius: 10, textAlign: "center" }}>No questions yet.</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {f.questions.map((q, i) => (
                    <div key={q.question_id} className="card" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <b style={{ width: 26, fontSize: 13 }}>{i + 1}</b>
                      <span className="badge" style={{ background: `${C.primary}22`, color: C.primaryText }}>{typeShort(q.q_type)}</span>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.snippet}</div>
                      {q.q_type !== 9 && <input className="input" type="number" min="0" step="0.5" title="Marks" style={{ width: 70 }} disabled={locked} value={q.marks} onChange={(e) => patchQ(i, { marks: e.target.value })} />}
                      {!locked && <>
                        <button type="button" className="btn btn-ghost" onClick={() => move(i, -1)} disabled={i === 0} style={{ padding: "4px 8px" }}>&uarr;</button>
                        <button type="button" className="btn btn-ghost" onClick={() => move(i, 1)} disabled={i === f.questions.length - 1} style={{ padding: "4px 8px" }}>&darr;</button>
                        <button type="button" className="btn btn-danger" onClick={() => set("questions", f.questions.filter((_, k) => k !== i))} style={{ padding: "4px 8px" }}><Icon name="close" size={12} /></button>
                      </>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : editing ? "Save changes" : "Create test (draft)"}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={picker} onClose={() => setPicker(false)} title="Add questions from the bank" width={820} zIndex={1100}>
        <QuestionList selectable selected={selectedIds} onToggle={toggleQuestion} fixed={{ grade_id: f.grade_id, subject_id: f.subject_id }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <span style={{ fontSize: 12.5, color: C.textMuted }}>{f.questions.length} selected</span>
          <button className="btn btn-primary" onClick={() => setPicker(false)}>Done</button>
        </div>
      </Modal>
    </>
  );
};
