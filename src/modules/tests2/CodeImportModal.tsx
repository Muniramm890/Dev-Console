// @ts-nocheck
// Quick Test 2.0 - "Import from code": paste the AI answer, review every question (same editor as manual), then import to the bank
// and optionally create the test. Images given as links / base64 are uploaded as WebP exactly like manual uploads.
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { useSession } from "../../contexts/SessionContext";
import { C } from "../../theme/theme";
import { useGradesAndSections } from "../attendance/useGradesAndSections";
import { buildAiPrompt } from "./aiPrompt";
import { cbt, unwrap, uploadImage, useSubjects } from "./cbtApi";
import { matchClass, matchSubject, parseCode } from "./codeParser";
import { PROCTOR_LABELS, VIS_LABELS, fromLocalInput, questionRef, typeShort } from "./helpers";
import { QuestionEditor } from "./QuestionEditor";
import { buildPayload, validateForm } from "./questionForm";

const Field = ({ label, children, flex = 1 }) => (
  <div style={{ flex, minWidth: 140 }}>
    <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 5, fontWeight: 600 }}>{label}</label>
    {children}
  </div>
);

// ── the prompt for ChatGPT / Gemini / Claude ────────────────────────────────
export const PromptModal = ({ open, onClose }) => {
  const { grades } = useGradesAndSections();
  const subjects = useSubjects();
  const ref = useRef(null);
  const [ok, setOk] = useState(false);
  const text = useMemo(() => buildAiPrompt({ classNames: grades.map((g) => g.name), subjectNames: subjects.map((s) => s.name) }), [grades, subjects]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch { if (ref.current) { ref.current.select(); document.execCommand("copy"); } }
    setOk(true); setTimeout(() => setOk(false), 2200);
  };
  return (
    <Modal open={open} onClose={onClose} title="AI prompt for question code" width={780} zIndex={1200}>
      <p style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 10, lineHeight: 1.55 }}>
        Copy this prompt into ChatGPT, Gemini or Claude, fill the topic at the end, then paste the answer (the code block) into <b>Import from code</b>. Your school's class and subject names are already inside it.
      </p>
      <textarea ref={ref} readOnly className="input" rows={14} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} value={text} onFocus={(e) => e.target.select()} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={copy}><Icon name="check" size={14} /> {ok ? "Copied" : "Copy prompt"}</button>
      </div>
    </Modal>
  );
};

// ── import ──────────────────────────────────────────────────────────────────
export const CodeImportModal = ({ open, onClose, onDone }) => {
  const { dialogAlert } = useDialog();
  const { currentYear } = useSession();
  const { grades, sections } = useGradesAndSections();
  const subjects = useSubjects();
  const [raw, setRaw] = useState("");
  const [drafts, setDrafts] = useState(null);
  const [meta, setMeta] = useState(null);
  const [editIdx, setEditIdx] = useState(null);
  const [prompt, setPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const setM = (k, v) => setMeta((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (!open) { setRaw(""); setDrafts(null); setMeta(null); setEditIdx(null); setProgress(""); } }, [open]);

  const doParse = () => {
    try {
      const r = parseCode(raw);
      const g = matchClass(grades, r.meta.className), s = matchSubject(subjects, r.meta.subject);
      const gs = g ? sections.filter((x) => x.grade_id === g.id && r.meta.sections.some((n) => n.toLowerCase() === String(x.name).toLowerCase())).map((x) => x.id) : [];
      setDrafts(r.drafts);
      setMeta({ ...r.meta, grade_id: g ? g.id : "", subject_id: s ? s.id : "", section_ids: gs, makeTest: !!r.meta.title });
    } catch (e) { dialogAlert(e.message); }
  };

  const checked = useMemo(() => (drafts || []).map((d) => ({ ...d, err: validateForm(d.form) })), [drafts]);
  const included = checked.filter((d) => d.include);
  const blocking = included.filter((d) => d.err).length;
  const gradeSections = useMemo(() => (meta ? sections.filter((s) => s.grade_id === meta.grade_id) : []), [sections, meta && meta.grade_id]); // eslint-disable-line

  const runImport = async () => {
    if (!included.length) return dialogAlert("Tick at least one question.");
    if (blocking) return dialogAlert("Fix the red questions (Edit) or untick them first.");
    if (meta.makeTest && (!meta.title.trim() || !meta.grade_id)) return dialogAlert("To create a test, enter the test title and choose the class.");
    setBusy(true);
    const cache = new Map(); const notes = [];
    const asset = async (src, kind) => {
      if (!src) return null;
      if (cache.has(src)) return cache.get(src);
      let res = null;
      try {
        const r = await fetch(src); if (!r.ok) throw new Error("could not download");
        const blob = await r.blob();
        res = await uploadImage(new File([blob], "image", { type: /^image\//.test(blob.type) ? blob.type : "image/png" }), kind);
      } catch (e) { notes.push(`An image could not be added (${String(src).slice(0, 36)}...): ${e.message}. Add it manually from the question editor.`); }
      cache.set(src, res);
      return res;
    };
    try {
      let defNeg = 0;
      try { defNeg = Number(unwrap(await cbt.get("/settings")).settings.default_negative_marks) || 0; } catch { /* keep 0 */ }
      const prepared = [];
      for (let i = 0; i < included.length; i++) {
        setProgress(`Preparing question ${i + 1} of ${included.length}...`);
        const f = JSON.parse(JSON.stringify(included[i].form));
        const toks = [];
        for (const s of f.body_images || []) { const a = await asset(s, 1); if (a) toks.push(`![](asset://${a.id})`); }
        if (toks.length) f.body = `${f.body}${f.body ? "\n" : ""}${toks.join("\n")}\n`;
        const ex = [];
        for (const s of f.explanation_images || []) { const a = await asset(s, 3); if (a) ex.push(`![](asset://${a.id})`); }
        if (ex.length) f.explanation = `${f.explanation}${f.explanation ? "\n" : ""}${ex.join("\n")}\n`;
        const up = async (o) => {
          if (o.pending_src && !o.image_asset_id) { const a = await asset(o.pending_src, 2); if (a) { o.image_asset_id = a.id; o.image_url = a.url; } }
          if (!(o.text || "").trim() && !o.image_asset_id) o.text = "(image not available)";
        };
        for (const o of f.options) if (o.text || o.pending_src) await up(o);
        for (const p of f.pairs) { await up(p.l); await up(p.r); }
        for (const o of f.extras) await up(o);
        if (!f.grade_id) f.grade_id = meta.grade_id || "";
        if (!f.subject_id) f.subject_id = meta.subject_id || "";
        if (!f.topic && meta.chapter_name) f.topic = meta.chapter_name;
        if (meta.negative_marking && f.q_type !== 9 && !Number(f.negative_marks)) f.negative_marks = defNeg;
        prepared.push({ f, payload: buildPayload(f) });
      }
      // a stable id per question: importing the same code twice never creates duplicates
      for (const p of prepared) {
        const q = { ...p.payload, options: [...(p.payload.options || []), ...(p.payload.answer_config ? [{ text: JSON.stringify(p.payload.answer_config), is_correct: 0 }] : [])] };
        p.payload.legacy_ref = await questionRef(q);
      }
      const ids = new Array(prepared.length).fill(null); let added = 0, existed = 0;
      const send = async (items, label) => {
        for (let i = 0; i < items.length; i += 100) {
          setProgress(`Saving ${label} ${Math.min(i + 100, items.length)} of ${items.length}...`);
          const chunk = items.slice(i, i + 100);
          const res = unwrap(await cbt.post("/questions/bulk", { questions: chunk.map((x) => x.payload) }));
          (res.questions || []).forEach((x) => { chunk[x.index].id = x.id; if (x.existed) existed++; else added++; });
        }
      };
      const passages = prepared.filter((p) => p.f.q_type === 9), rest = prepared.filter((p) => p.f.q_type !== 9);
      const byClient = {};
      if (passages.length) { await send(passages, "passages"); passages.forEach((p) => { if (p.f.client_id) byClient[p.f.client_id] = p.id; }); }
      rest.forEach((p) => { if (p.f.passage_ref) { if (byClient[p.f.passage_ref]) p.payload.parent_id = byClient[p.f.passage_ref]; else notes.push(`A question refers to passage "${p.f.passage_ref}", which is not in the code. It was added without a passage.`); } });
      await send(rest, "questions");
      prepared.forEach((p, i) => { ids[i] = p.id; });

      let testMsg = "";
      if (meta.makeTest) {
        setProgress("Creating the test...");
        await cbt.post("/tests", {
          title: meta.title.trim(), grade_id: meta.grade_id, subject_id: meta.subject_id || null, chapter_no: meta.chapter_no || null, chapter_name: meta.chapter_name || null, instructions: meta.instructions || null,
          duration_min: Number(meta.duration_min) || 30, pass_marks: meta.pass_marks === "" ? null : Number(meta.pass_marks), max_attempts: Number(meta.max_attempts) || 1,
          negative_marking: !!meta.negative_marking, shuffle_questions: !!meta.shuffle_questions, shuffle_options: !!meta.shuffle_options, result_visibility: Number(meta.result_visibility), proctoring: Number(meta.proctoring),
          starts_at: fromLocalInput(meta.starts_at), ends_at: fromLocalInput(meta.ends_at), section_ids: meta.section_ids, academic_year_id: currentYear && currentYear.id,
          questions: ids.filter(Boolean).map((id) => ({ question_id: id })),
        });
        testMsg = `\nTest "${meta.title.trim()}" was created as a draft. Open the Tests tab to publish it.`;
      }
      await dialogAlert(`${added} question(s) added to the bank.` + (existed ? `\n${existed} were already in your bank and were reused.` : "") + testMsg + (notes.length ? `\n\nNotes:\n- ${notes.slice(0, 6).join("\n- ")}${notes.length > 6 ? `\n- ...and ${notes.length - 6} more` : ""}` : ""), "Import complete");
      onDone(); onClose();
    } catch (e) {
      dialogAlert((e.message || "Import failed") + "\n\nNothing is lost: you can import again and questions that were already saved are reused.", "Import stopped");
    } finally { setBusy(false); setProgress(""); }
  };

  return (
    <>
      <Modal open={open} onClose={busy ? () => {} : onClose} title="Import from code" width={940}>
        {!drafts ? (
          <div>
            <p style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
              Paste the code you got from an AI tool: <b>const testDetails = {"{...}"}; const mockQuestions = [...];</b>. It is only read as data, never run. All question types work: MCQ, multiple correct, True/False, fill in the blank, numeric, short, long, match and passage. Images can be links or base64.
            </p>
            <textarea className="input" rows={14} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"const testDetails = {\n  testName: \"Chapter 1\",\n  className: \"Class 8\",\n  subject: \"Mathematics\",\n  duration: 30\n};\nconst mockQuestions = [\n  { type: \"MCQ\", text: \"2 + 2 = ?\", options: [\"3\", \"4\", \"5\", \"6\"], correct: \"B\", marks: 1 }\n];"} />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn btn-ghost" onClick={() => setPrompt(true)}><Icon name="book" size={14} /> AI prompt</button>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" disabled={!raw.trim()} onClick={doParse}>Read the code</button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="card" style={{ padding: 14, marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>
                <input type="checkbox" checked={meta.makeTest} onChange={(e) => setM("makeTest", e.target.checked)} /> Also create a test (draft) from these questions
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <Field label="Test title" flex={2}><input className="input" style={{ width: "100%" }} value={meta.title} onChange={(e) => setM("title", e.target.value)} /></Field>
                <Field label={meta.className && !meta.grade_id ? `Class (not found: "${meta.className}")` : "Class"}>
                  <select className="select" style={{ width: "100%" }} value={meta.grade_id} onChange={(e) => setMeta((p) => ({ ...p, grade_id: e.target.value, section_ids: [] }))}><option value="">Select</option>{grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                </Field>
                <Field label={meta.subject && !meta.subject_id ? `Subject (not found: "${meta.subject}")` : "Subject"}>
                  <select className="select" style={{ width: "100%" }} value={meta.subject_id} onChange={(e) => setM("subject_id", e.target.value)}><option value="">Not set</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                </Field>
              </div>
              {meta.makeTest && (
                <>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                    <Field label="Chapter no."><input className="input" style={{ width: "100%" }} value={meta.chapter_no} onChange={(e) => setM("chapter_no", e.target.value)} /></Field>
                    <Field label="Chapter name" flex={2}><input className="input" style={{ width: "100%" }} value={meta.chapter_name} onChange={(e) => setM("chapter_name", e.target.value)} /></Field>
                    <Field label="Duration (min)"><input className="input" type="number" min="1" style={{ width: "100%" }} value={meta.duration_min} onChange={(e) => setM("duration_min", e.target.value)} /></Field>
                    <Field label="Pass marks"><input className="input" type="number" min="0" style={{ width: "100%" }} value={meta.pass_marks} onChange={(e) => setM("pass_marks", e.target.value)} /></Field>
                    <Field label="Attempts"><input className="input" type="number" min="1" max="20" style={{ width: "100%" }} value={meta.max_attempts} onChange={(e) => setM("max_attempts", e.target.value)} /></Field>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                    <Field label="Opens at"><input className="input" type="datetime-local" style={{ width: "100%" }} value={meta.starts_at} onChange={(e) => setM("starts_at", e.target.value)} /></Field>
                    <Field label="Closes at"><input className="input" type="datetime-local" style={{ width: "100%" }} value={meta.ends_at} onChange={(e) => setM("ends_at", e.target.value)} /></Field>
                    <Field label="Results"><select className="select" style={{ width: "100%" }} value={meta.result_visibility} onChange={(e) => setM("result_visibility", e.target.value)}>{VIS_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></Field>
                    <Field label="Proctoring"><select className="select" style={{ width: "100%" }} value={meta.proctoring} onChange={(e) => setM("proctoring", e.target.value)}>{PROCTOR_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></Field>
                  </div>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, marginBottom: gradeSections.length ? 10 : 0 }}>
                    <label><input type="checkbox" checked={meta.negative_marking} onChange={(e) => setM("negative_marking", e.target.checked)} /> Negative marking</label>
                    <label><input type="checkbox" checked={meta.shuffle_questions} onChange={(e) => setM("shuffle_questions", e.target.checked)} /> Shuffle questions</label>
                    <label><input type="checkbox" checked={meta.shuffle_options} onChange={(e) => setM("shuffle_options", e.target.checked)} /> Shuffle options</label>
                  </div>
                  {gradeSections.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12.5 }}>
                      <span style={{ color: C.textMuted }}>Sections (none = whole class):</span>
                      {gradeSections.map((s) => (
                        <label key={s.id} className="badge" style={{ cursor: "pointer", padding: "5px 11px", background: meta.section_ids.includes(s.id) ? `${C.primary}33` : C.surfaceAlt }}>
                          <input type="checkbox" style={{ marginRight: 5 }} checked={meta.section_ids.includes(s.id)} onChange={() => setM("section_ids", meta.section_ids.includes(s.id) ? meta.section_ids.filter((x) => x !== s.id) : [...meta.section_ids, s.id])} />{s.name}
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <b style={{ fontSize: 13.5 }}>{included.length} of {checked.length} questions will be imported{blocking ? <span style={{ color: C.red }}> ({blocking} need a fix)</span> : null}</b>
              <span style={{ fontSize: 12, color: C.textMuted }}>Edit opens the same editor as manual entry</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto", marginBottom: 14 }}>
              {checked.map((d, i) => (
                <div key={d.key} className="card" style={{ padding: 10, display: "flex", gap: 10, alignItems: "flex-start", opacity: d.include ? 1 : 0.5, border: d.err && d.include ? `1px solid ${C.red}66` : undefined }}>
                  <input type="checkbox" style={{ marginTop: 4 }} checked={d.include} onChange={(e) => setDrafts((ds) => ds.map((x, k) => (k === i ? { ...x, include: e.target.checked } : x)))} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4, alignItems: "center" }}>
                      <b style={{ fontSize: 12.5 }}>{i + 1}</b>
                      <span className="badge" style={{ background: `${C.primary}22`, color: C.primaryText }}>{typeShort(d.form.q_type)}</span>
                      {d.form.q_type !== 9 && <span className="badge" style={{ background: `${C.blue}22`, color: C.blue }}>{d.form.marks} mark{Number(d.form.marks) === 1 ? "" : "s"}</span>}
                      {(d.form.body_images || []).length > 0 && <span className="badge" style={{ background: `${C.cyan}22`, color: C.cyan }}>{d.form.body_images.length} image</span>}
                      {d.form.topic && <span className="badge" style={{ background: C.surfaceAlt, color: C.textMuted }}>{d.form.topic}</span>}
                    </div>
                    <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.form.body || "(no text)"}</div>
                    {d.err && <div style={{ fontSize: 12, color: C.red, marginTop: 3 }}>{d.err}</div>}
                    {!d.err && d.warnings.length > 0 && <div style={{ fontSize: 12, color: C.yellow, marginTop: 3 }}>{d.warnings.join(" | ")}</div>}
                  </div>
                  <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setEditIdx(i)}><Icon name="edit" size={13} /> Edit</button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
              {progress && <span style={{ fontSize: 12, color: C.textMuted, marginRight: "auto" }}>{progress}</span>}
              <button className="btn btn-ghost" disabled={busy} onClick={() => setDrafts(null)}>Back</button>
              <button className="btn btn-primary" disabled={busy || !included.length || blocking > 0} onClick={runImport}>{busy ? "Importing..." : `Import ${included.length} question${included.length === 1 ? "" : "s"}${meta.makeTest ? " + create test" : ""}`}</button>
            </div>
          </div>
        )}
      </Modal>
      <QuestionEditor open={editIdx !== null} draft={editIdx !== null && drafts ? drafts[editIdx].form : null} defaults={meta ? { grade_id: meta.grade_id, subject_id: meta.subject_id } : {}}
        onDraftSave={(form) => setDrafts((ds) => ds.map((d, k) => (k === editIdx ? { ...d, form, warnings: [] } : d)))} onClose={() => setEditIdx(null)} />
      <PromptModal open={prompt} onClose={() => setPrompt(false)} />
    </>
  );
};
