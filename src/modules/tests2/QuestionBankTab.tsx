// @ts-nocheck
// Quick Test 2.0 - question bank: filters, list (also used as the picker inside the test editor), bulk paste import.
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";
import { useGradesAndSections } from "../attendance/useGradesAndSections";
import { cbt, unwrap, useSubjects } from "./cbtApi";
import { QuestionEditor } from "./QuestionEditor";
import { RichText } from "./RichText";
import { TEMPLATE_ROWS, TYPES, csvToQuestions, downloadCsv, qs, questionRef, typeShort } from "./helpers";

export const QuestionList = ({ selectable = false, selected, onToggle, onEdit, onDelete, reloadKey = 0, fixed = {} }) => {
  const { grades } = useGradesAndSections();
  const subjects = useSubjects();
  const [f, setF] = useState({ grade_id: fixed.grade_id || "", subject_id: fixed.subject_id || "", q_type: "", difficulty: "", search: "", mine: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ questions: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 15;

  useEffect(() => { setPage(1); }, [f.grade_id, f.subject_id, f.q_type, f.difficulty, f.search, f.mine]);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      setLoading(true); setError("");
      cbt.get(`/questions${qs({ ...f, page, limit })}`).then((r) => { if (live) setData(unwrap(r)); }).catch((e) => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    }, f.search ? 350 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [f.grade_id, f.subject_id, f.q_type, f.difficulty, f.search, f.mine, page, reloadKey]); // eslint-disable-line

  const pages = Math.max(1, Math.ceil((data.total || 0) / limit));
  const setK = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input className="input" style={{ flex: 2, minWidth: 180 }} placeholder="Search question text or topic" value={f.search} onChange={(e) => setK("search", e.target.value)} />
        <select className="select" value={f.grade_id} onChange={(e) => setK("grade_id", e.target.value)}><option value="">All classes</option>{grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        <select className="select" value={f.subject_id} onChange={(e) => setK("subject_id", e.target.value)}><option value="">All subjects</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select className="select" value={f.q_type} onChange={(e) => setK("q_type", e.target.value)}><option value="">All types</option>{TYPES.map((t) => <option key={t.id} value={t.id}>{t.short}</option>)}</select>
        <select className="select" value={f.difficulty} onChange={(e) => setK("difficulty", e.target.value)}><option value="">Any difficulty</option>{[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>Level {d}</option>)}</select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}><input type="checkbox" checked={f.mine === "1"} onChange={(e) => setK("mine", e.target.checked ? "1" : "")} /> Mine</label>
      </div>
      {error ? <div className="card" style={{ color: C.red, fontSize: 13 }}>{error}</div> : loading ? (
        <div className="pulse" style={{ padding: 30, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading</div>
      ) : data.questions.length === 0 ? (
        <EmptyState icon="book" title="No questions found" sub="Change the filters or add a new question." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.questions.map((q) => (
            <div key={q.id} className="card" style={{ padding: 12, display: "flex", gap: 12, alignItems: "flex-start", border: selectable && selected && selected.has(q.id) ? `1px solid ${C.primary}` : undefined }}>
              {selectable && <input type="checkbox" style={{ marginTop: 4 }} checked={!!(selected && selected.has(q.id))} onChange={() => onToggle(q)} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  <span className="badge" style={{ background: `${C.primary}22`, color: C.primaryText }}>{typeShort(q.q_type)}</span>
                  <span className="badge" style={{ background: `${C.blue}22`, color: C.blue }}>{q.marks} mark{q.marks === 1 ? "" : "s"}</span>
                  {q.subject_name && <span className="badge" style={{ background: `${C.green}22`, color: C.green }}>{q.subject_name}</span>}
                  {q.grade_name && <span className="badge" style={{ background: `${C.purple}22`, color: C.purple }}>{q.grade_name}</span>}
                  {q.topic && <span className="badge" style={{ background: `${C.cyan}22`, color: C.cyan }}>{q.topic}</span>}
                  {q.platform && <span className="badge" style={{ background: `${C.yellow}22`, color: C.yellow }}>Library</span>}
                  {q.difficulty && <span className="badge" style={{ background: C.surfaceAlt, color: C.textMuted }}>Level {q.difficulty}</span>}
                </div>
                <RichText text={String(q.snippet || "").replace(/!\[[^\]]*\]\([^)]*\)?/g, "[image]")} style={{ fontSize: 13.5 }} />
              </div>
              {!selectable && (
                <div style={{ display: "flex", gap: 6 }}>
                  {q.mine && <button className="btn btn-ghost" title="Edit" onClick={() => onEdit(q)} style={{ padding: "6px 9px" }}><Icon name="edit" size={14} /></button>}
                  {q.mine && <button className="btn btn-danger" title="Delete" onClick={() => onDelete(q)} style={{ padding: "6px 9px" }}><Icon name="trash" size={14} /></button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 14 }}>
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span style={{ fontSize: 12.5, color: C.textMuted }}>Page {page} of {pages} ({data.total} questions)</span>
          <button className="btn btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};

const SAMPLE_URL = `${import.meta.env.BASE_URL}samples/quick-test-sample-100.csv`;

const BulkImport = ({ open, onClose, onDone }) => {
  const { dialogAlert } = useDialog();
  const { grades } = useGradesAndSections();
  const subjects = useSubjects();
  const fileRef = useRef(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  // everything is checked here first, so the server only ever receives valid rows
  const parsed = useMemo(
    () => (text.trim() ? csvToQuestions(text, { grade_id: grade || null, subject_id: subject || null, topic: topic || undefined }) : { questions: [], errors: [], counts: { single: 0, multi: 0, tf: 0 } }),
    [text, grade, subject, topic]
  );
  const { questions, errors, counts } = parsed;

  const readFile = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return dialogAlert("This file is too large (max 2 MB). Split it into smaller files.");
    try { setText(await file.text()); setFileName(file.name); }
    catch { dialogAlert("Could not read this file. Save it as CSV (comma separated) and try again."); }
  };
  const loadSample = async () => {
    try { const r = await fetch(SAMPLE_URL); if (!r.ok) throw new Error(); setText(await r.text()); setFileName("quick-test-sample-100.csv"); }
    catch { dialogAlert("Could not load the sample file."); }
  };

  const run = async () => {
    if (errors.length || !questions.length) return;
    setBusy(true);
    try {
      // the same question is never sent twice: it gets a fixed id, so a second import of the same file only skips what is already there
      const refs = await Promise.all(questions.map((q) => questionRef(q)));
      const seen = new Set(); const list = [];
      questions.forEach((q, i) => { if (!seen.has(refs[i])) { seen.add(refs[i]); list.push({ ...q, legacy_ref: refs[i] }); } });
      const dupInFile = questions.length - list.length;
      let added = 0, existed = 0;
      for (let i = 0; i < list.length; i += 100) {
        setProgress(`Importing ${Math.min(i + 100, list.length)} of ${list.length}...`);
        const res = await cbt.post("/questions/bulk", { questions: list.slice(i, i + 100) });
        (unwrap(res)?.questions || []).forEach((x) => { if (x.existed) existed++; else added++; });
      }
      await dialogAlert(`${added} question(s) added to the bank.` + (existed ? `\n${existed} already in your bank were skipped.` : "") + (dupInFile ? `\n${dupInFile} repeated row(s) in the file were skipped.` : ""), "Import complete");
      setText(""); setFileName(""); onDone(); onClose();
    } catch (e) { dialogAlert((e.message || "Import failed") + "\n\nYou can import the same file again: questions that were already added are skipped.", "Import stopped"); }
    finally { setBusy(false); setProgress(""); }
  };

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Bulk Import Questions" width={760}>
      <p style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 10, lineHeight: 1.55 }}>
        Upload a CSV file, or paste rows copied from Excel / Google Sheets. Use the template: <b>question, option_a ... option_f, correct, marks, negative_marks, difficulty, topic, explanation, type</b>.
        <br />Correct: <b>B</b>, or <b>A,C</b> for several. Type (optional): <b>mcq</b>, <b>multi</b> or <b>tf</b> (True/False, correct = True or False). Difficulty: 1 to 5 or easy / medium / hard.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" style={{ display: "none" }} onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ""; }} />
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()}><Icon name="upload" size={14} /> Choose file</button>
        <button className="btn btn-ghost" onClick={() => downloadCsv("quick-test-template.csv", TEMPLATE_ROWS)}>Download template</button>
        <button className="btn btn-ghost" onClick={loadSample}>Try the 100-question sample</button>
        {fileName && <span style={{ alignSelf: "center", fontSize: 12, color: C.textMuted }}>{fileName}</span>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <select className="select" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">Class (optional)</option>{grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        <select className="select" value={subject} onChange={(e) => setSubject(e.target.value)}><option value="">Subject (optional)</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input className="input" placeholder="Default topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
      </div>
      <textarea className="input" rows={7} style={{ width: "100%", fontFamily: "monospace", fontSize: 12.5 }} value={text} onChange={(e) => { setText(e.target.value); setFileName(""); }}
        placeholder={"question,option_a,option_b,option_c,option_d,option_e,option_f,correct,marks,negative_marks,difficulty,topic,explanation,type\nWhat is 2 + 2?,3,4,5,6,,,B,1,0,1,Arithmetic,Two plus two is four.,mcq"} />
      {text.trim() && (
        <div style={{ marginTop: 10, fontSize: 12.5 }}>
          {questions.length > 0 && <div style={{ color: C.green, fontWeight: 700 }}>{questions.length} question(s) ready: {counts.single} single answer, {counts.multi} multiple answer, {counts.tf} True/False</div>}
          {errors.length > 0 && (
            <div style={{ marginTop: 6, padding: 10, borderRadius: 10, background: `${C.red}12`, border: `1px solid ${C.red}33`, color: C.red, maxHeight: 130, overflowY: "auto" }}>
              <b>{errors.length} row(s) need a fix before importing:</b>
              {errors.slice(0, 12).map((e, i) => <div key={i}>{e}</div>)}
              {errors.length > 12 && <div>...and {errors.length - 12} more</div>}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 12 }}>
        {progress && <span style={{ fontSize: 12, color: C.textMuted, marginRight: "auto" }}>{progress}</span>}
        <button className="btn btn-ghost" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy || !questions.length || errors.length > 0} onClick={run}>{busy ? "Importing..." : `Import ${questions.length || ""} questions`.trim()}</button>
      </div>
    </Modal>
  );
};

export const QuestionBankTab = () => {
  const { dialogConfirm, dialogAlert } = useDialog();
  const [editor, setEditor] = useState({ open: false, id: null });
  const [bulk, setBulk] = useState(false);
  const [tick, setTick] = useState(0);
  const del = async (q) => {
    if (!(await dialogConfirm("Delete this question? Tests that already use it keep their copy.", "Delete question"))) return;
    try { await cbt.del(`/questions/${q.id}`); setTick((v) => v + 1); } catch (e) { dialogAlert(e.message); }
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 14, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => setBulk(true)}><Icon name="upload" size={14} /> Bulk import</button>
        <button className="btn btn-primary" onClick={() => setEditor({ open: true, id: null })}><Icon name="plus" size={14} /> New question</button>
      </div>
      <QuestionList reloadKey={tick} onEdit={(q) => setEditor({ open: true, id: q.id })} onDelete={del} />
      <QuestionEditor open={editor.open} questionId={editor.id} onClose={() => setEditor({ open: false, id: null })} onSaved={() => setTick((v) => v + 1)} />
      <BulkImport open={bulk} onClose={() => setBulk(false)} onDone={() => setTick((v) => v + 1)} />
    </div>
  );
};
