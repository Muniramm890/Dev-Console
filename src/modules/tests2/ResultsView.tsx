// @ts-nocheck
// Quick Test 2.0 - results of one test: list, review an attempt, mark written answers, delete a result, release results, CSV export.
import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { Modal } from "../../components/ui/Modal";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { TableWrap } from "../../components/ui/TableWrap";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";
import { cbt, unwrap } from "./cbtApi";
import { EVENT_LABELS, WRITTEN, downloadCsv, fmtDT, mmss, typeShort } from "./helpers";
import { RichText } from "./RichText";

const RESULT_COLOR = (r) => [C.textMuted, C.green, C.red, C.yellow, C.blue][r] || C.textMuted;

const RESULT_LABEL = ["Skipped", "Correct", "Wrong", "Needs marking", "Partly correct"];
const matchFilter = (f, r) => f === "all" || (f === "wrong" && r === 2) || (f === "skipped" && r === 0) || (f === "mark" && r === 3) || (f === "correct" && (r === 1 || r === 4));
const r1 = (n) => Math.round(Number(n) * 10) / 10;
const Bar = ({ pct, color, h = 10 }) => (
  <div style={{ height: h, borderRadius: h, background: C.surfaceAlt, overflow: "hidden" }}>
    <div style={{ width: `${Math.max(0, Math.min(100, Number(pct) || 0))}%`, height: "100%", background: color || C.primary }} />
  </div>
);
const Stat = ({ label, value, color }) => (
  <div style={{ flex: "1 1 90px", minWidth: 90, background: C.surfaceAlt, borderRadius: 10, padding: "8px 10px" }}>
    <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{label}</div>
    <div className="syne" style={{ fontSize: 16, fontWeight: 800, color: color || C.text }}>{value}</div>
  </div>
);

// header: who, which test, score vs class average, answer statistics
const AttemptSummary = ({ d, sa }) => {
  const a = d.attempt;
  const tr = sa && sa.trend ? sa.trend.find((t) => String(t.test_id) === String(d.test.id) || (d.test.code && t.test_code === d.test.code)) : null;
  const avg = tr && tr.class_avg_pct != null ? Number(tr.class_avg_pct) : null;
  const diff = avg == null ? null : r1(Number(a.pct) - avg);
  const tried = (a.correct || 0) + (a.incorrect || 0);
  return (
    <div className="card" style={{ padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div className="syne" style={{ fontSize: 17, fontWeight: 800 }}>{d.student ? d.student.name : "Student"}</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>{d.student && d.student.admission_no ? `Adm. no. ${d.student.admission_no} | ` : ""}{d.test.title}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{a.submitted_at ? `Submitted ${fmtDT(a.submitted_at)}` : "Not submitted yet"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="syne" style={{ fontSize: 28, fontWeight: 800, color: C.primary, lineHeight: 1 }}>{a.pct}%</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>{a.marks_obtained} / {a.marks_total} marks</div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}><Bar pct={a.pct} /></div>
      {avg != null && (
        <div style={{ fontSize: 12.5, marginTop: 8, color: C.textMuted }}>
          Class average <b style={{ color: C.text }}>{avg}%</b> - this student is{" "}
          <b style={{ color: diff >= 0 ? C.green : C.red }}>{diff === 0 ? "equal to the average" : `${Math.abs(diff)}% ${diff > 0 ? "above" : "below"}`}</b>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <Stat label="Correct" value={a.correct} color={C.green} />
        <Stat label="Wrong" value={a.incorrect} color={C.red} />
        <Stat label="Skipped" value={a.unattempted} />
        <Stat label="Accuracy" value={tried ? `${Math.round((a.correct / tried) * 100)}%` : "-"} sub="of attempted" />
        <Stat label="Time taken" value={mmss(a.time_taken_sec)} />
        <Stat label="Avg per answer" value={tried && a.time_taken_sec != null ? `${Math.round(a.time_taken_sec / tried)}s` : "-"} />
      </div>
      {a.needs_grading && <div className="badge" style={{ background: `${C.yellow}22`, color: C.yellow, marginTop: 10 }}>Written answers need marking</div>}
    </div>
  );
};

// the student's record across tests (existing /cbt/students/:id/analytics)
const StudentInsights = ({ sa }) => {
  if (!sa || !sa.summary || !sa.trend || sa.trend.length === 0) return null;
  const sm = sa.summary;
  const rows = sa.trend.slice(-6);
  return (
    <div className="card" style={{ padding: 14, marginBottom: 14 }}>
      <b style={{ fontSize: 13.5 }}>Performance across tests</b>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <Stat label="Tests taken" value={sm.tests_taken} />
        <Stat label="Average" value={sm.avg_pct != null ? `${sm.avg_pct}%` : "-"} />
        <Stat label="Best" value={sm.best_pct != null ? `${sm.best_pct}%` : "-"} />
        <Stat label="Overall accuracy" value={sm.accuracy_pct != null ? `${sm.accuracy_pct}%` : "-"} />
        <Stat label="Recent trend" value={sm.improvement_pct == null ? "-" : `${sm.improvement_pct > 0 ? "+" : ""}${sm.improvement_pct}%`} color={sm.improvement_pct == null ? undefined : sm.improvement_pct >= 0 ? C.green : C.red} />
      </div>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((t) => (
          <div key={t.attempt_id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, marginBottom: 3 }}>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}{t.subject ? ` (${t.subject})` : ""}</span>
              <span style={{ color: C.textMuted, flexShrink: 0 }}><b style={{ color: C.text }}>{t.pct}%</b>{t.class_avg_pct != null ? ` | class ${t.class_avg_pct}%` : ""}</span>
            </div>
            <div style={{ position: "relative" }}>
              <Bar pct={t.pct} />
              {t.class_avg_pct != null && <div title="Class average" style={{ position: "absolute", top: -2, bottom: -2, left: `${Math.min(100, t.class_avg_pct)}%`, width: 2, background: C.text, opacity: 0.55 }} />}
            </div>
          </div>
        ))}
      </div>
      {(sa.subjects || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>Subject average</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{sa.subjects.map((x) => <span key={x.subject} className="badge" style={{ background: `${C.blue}18`, color: C.blue }}>{x.subject} {x.avg_pct}% ({x.tests})</span>)}</div>
        </div>
      )}
      {((sa.strengths || []).length > 0 || (sa.weak_topics || []).length > 0) && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
          {(sa.strengths || []).length > 0 && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, color: C.green, marginBottom: 6, fontWeight: 700 }}>Strong topics</div>
              {sa.strengths.map((t) => <div key={t.topic} style={{ fontSize: 12.5, padding: "2px 0" }}>{t.topic} <span style={{ color: C.textMuted }}>- {t.accuracy_pct}% ({t.correct}/{t.attempted})</span></div>)}
            </div>
          )}
          {(sa.weak_topics || []).length > 0 && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, color: C.red, marginBottom: 6, fontWeight: 700 }}>Needs practice</div>
              {sa.weak_topics.map((t) => <div key={t.topic} style={{ fontSize: 12.5, padding: "2px 0" }}>{t.topic} <span style={{ color: C.textMuted }}>- {t.accuracy_pct}% ({t.correct}/{t.attempted})</span></div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// question map (jump to a question) + filter + slowest answers
const QuestionMap = ({ d, flt, setFlt }) => {
  const qsl = d.questions.filter((q) => q.q_type !== 9);
  const res = (q) => (q.answer ? q.answer.result : 0);
  const cnt = (f) => qsl.filter((q) => matchFilter(f, res(q))).length;
  const slow = qsl.filter((q) => q.answer && q.answer.time_sec != null).sort((x, y) => y.answer.time_sec - x.answer.time_sec).slice(0, 3);
  const go = (n) => { const el = document.getElementById(`aq-${n}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
  return (
    <div className="card" style={{ padding: 14, marginBottom: 14 }}>
      <b style={{ fontSize: 13.5 }}>Question map</b>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {qsl.map((q) => (
          <button key={q.q_no} title={`Q${q.q_no}: ${RESULT_LABEL[res(q)] || "-"}`} onClick={() => go(q.q_no)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: `${RESULT_COLOR(res(q))}33`, color: RESULT_COLOR(res(q)) }}>{q.q_no}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11.5, color: C.textMuted, marginTop: 8 }}>
        {[1, 2, 0, 3, 4].map((r) => <span key={r} style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: RESULT_COLOR(r) }} />{RESULT_LABEL[r]}</span>)}
      </div>
      {slow.length > 0 && <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 10 }}>Slowest answers: {slow.map((q) => `Q${q.q_no} (${q.answer.time_sec}s)`).join(", ")}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
        {[["all", "All"], ["wrong", "Wrong"], ["skipped", "Skipped"], ["mark", "Needs marking"], ["correct", "Correct"]].map(([id, label]) => (
          <button key={id} className={`btn ${flt === id ? "btn-primary" : "btn-ghost"}`} style={{ fontSize: 12, padding: "5px 11px" }} onClick={() => setFlt(id)}>{label} ({cnt(id)})</button>
        ))}
      </div>
    </div>
  );
};

const AttemptModal = ({ attemptId, onClose, onChanged }) => {
  const { dialogAlert } = useDialog();
  const [d, setD] = useState(null);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [snap, setSnap] = useState(null);
  const [sa, setSa] = useState(null);
  const [flt, setFlt] = useState("all");
  const load = () => cbt.get(`/attempts/${attemptId}`).then((r) => { const x = unwrap(r); setD(x); const m = {}; x.questions.forEach((q) => { if (WRITTEN.includes(q.q_type) && q.answer && q.answer.text) m[q.q_no] = q.answer.marks == null ? "" : q.answer.marks; }); setMarks(m); }).catch((e) => dialogAlert(e.message));
  useEffect(() => { if (attemptId) { setD(null); setFlt("all"); load(); } }, [attemptId]); // eslint-disable-line
  useEffect(() => {
    setSa(null);
    if (!d || !d.student || !d.student.id) return undefined;
    let live = true;
    cbt.get(`/students/${d.student.id}/analytics`).then((r) => { if (live) setSa(unwrap(r)); }).catch(() => {});
    return () => { live = false; };
  }, [d && d.student && d.student.id]); // eslint-disable-line

  const saveMarks = async () => {
    const answers = Object.entries(marks).filter(([, v]) => v !== "").map(([q, v]) => ({ q_no: Number(q), marks: Number(v) }));
    if (!answers.length) return dialogAlert("Enter marks for at least one written answer.");
    setSaving(true);
    try { await cbt.put(`/attempts/${attemptId}/grade`, { answers }); await load(); onChanged(); } catch (e) { dialogAlert(e.message); } finally { setSaving(false); }
  };
  const showSnap = async (ev) => { try { setSnap(unwrap(await cbt.get(`/attempts/${attemptId}/events/${ev.id}/snapshot`)).url); } catch (e) { dialogAlert(e.message); } };

  return (
    <Modal open={!!attemptId} onClose={onClose} title={d ? `${d.student ? d.student.name : "Student"} - ${d.test.title}` : "Result"} width={860}>
      {!d ? <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading</div> : (
        <div>
          <AttemptSummary d={d} sa={sa} />
          <StudentInsights sa={sa} />
          <QuestionMap d={d} flt={flt} setFlt={setFlt} />
          {d.proctor_events.length > 0 && (
            <div className="card" style={{ padding: 10, marginBottom: 14 }}>
              <b style={{ fontSize: 12.5 }}>Proctoring events ({d.attempt.flags})</b>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {d.proctor_events.map((ev) => (
                  <span key={ev.id} className="badge" style={{ background: `${C.red}18`, color: C.red, cursor: ev.has_snapshot ? "pointer" : "default" }} onClick={() => ev.has_snapshot && showSnap(ev)}>
                    {EVENT_LABELS[ev.type] || "Event"} - {fmtDT(ev.ts)}{ev.has_snapshot ? " (photo)" : ""}
                  </span>
                ))}
              </div>
              {snap && <img src={snap} alt="" style={{ maxWidth: 240, borderRadius: 8, marginTop: 8, display: "block" }} />}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {d.questions.filter((q) => q.q_type !== 9 && matchFilter(flt, q.answer ? q.answer.result : 0)).map((q) => {
              const a = q.answer; const chosen = new Set(a ? a.chosen : []);
              return (
                <div key={q.q_no} id={`aq-${q.q_no}`} className="card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <b>Q{q.q_no}</b><span className="badge" style={{ background: `${C.primary}22`, color: C.primaryText }}>{typeShort(q.q_type)}</span>
                    <span className="badge" style={{ background: `${RESULT_COLOR(a ? a.result : 0)}22`, color: RESULT_COLOR(a ? a.result : 0) }}>{["Skipped", "Correct", "Wrong", "Needs marking", "Partly correct"][a ? a.result : 0]}</span>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{a && a.marks != null ? a.marks : 0}/{q.marks} marks | {a && a.time_sec != null ? `${a.time_sec}s` : "-"}</span>
                  </div>
                  <RichText text={q.body} style={{ fontSize: 13.5, marginBottom: 8 }} />
                  {[1, 2, 3].includes(q.q_type) && q.options.map((o) => (
                    <div key={o.pos} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 8px", borderRadius: 6, fontSize: 13, background: o.is_correct ? `${C.green}18` : chosen.has(o.pos) ? `${C.red}14` : "transparent" }}>
                      <b>{"ABCDEFGHIJKLMNO"[o.pos]}</b>{o.image_url && <img src={o.image_url} alt="" style={{ height: 34, borderRadius: 4 }} />}<span>{o.text}</span>
                      {chosen.has(o.pos) && <span style={{ marginLeft: "auto", fontSize: 11.5, color: o.is_correct ? C.green : C.red }}>chosen</span>}
                      {o.is_correct && !chosen.has(o.pos) && <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.green }}>correct answer</span>}
                    </div>
                  ))}
                  {[4, 5].includes(q.q_type) && <div style={{ fontSize: 13 }}>Answer: <b>{a && a.text ? a.text : "-"}</b> <span style={{ color: C.textMuted }}>(expected: {q.q_type === 4 ? (q.answer_config.answers || []).join(" / ") : q.answer_config.value != null ? q.answer_config.value : `${q.answer_config.min} to ${q.answer_config.max}`})</span></div>}
                  {q.q_type === 8 && <div style={{ fontSize: 13 }}>Matches: <span style={{ color: C.textMuted }}>{a && a.text ? a.text : "-"}</span></div>}
                  {WRITTEN.includes(q.q_type) && (
                    <div>
                      {a && a.text && a.text !== "(Answer attached as photo / PDF)"
                        ? <div style={{ background: C.surfaceAlt, borderRadius: 8, padding: 10, fontSize: 13, whiteSpace: "pre-wrap" }}>{a.text}</div>
                        : !(a && a.files && a.files.length) ? <div style={{ background: C.surfaceAlt, borderRadius: 8, padding: 10, fontSize: 13 }}>No answer</div> : null}
                      {a && a.files && a.files.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Written on paper by the student - {a.files.length} file{a.files.length > 1 ? "s" : ""} (click to open, then enter marks below)</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {a.files.map((f) => (f.mime === "application/pdf"
                              ? <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: 12.5 }}>PDF: {f.name}</a>
                              : <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"><img src={f.url} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} /></a>))}
                          </div>
                        </div>
                      )}
                      {q.answer_config && q.answer_config.model_answer && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Model answer: {q.answer_config.model_answer}</div>}
                      {a && a.text && <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ fontSize: 12.5 }}>Marks (0 to {q.marks})</label>
                        <input className="input" type="number" min="0" max={q.marks} step="0.5" style={{ width: 90 }} value={marks[q.q_no] == null ? "" : marks[q.q_no]} onChange={(e) => setMarks((p) => ({ ...p, [q.q_no]: e.target.value }))} />
                      </div>}
                    </div>
                  )}
                  {q.explanation && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>Explanation: {q.explanation}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            {Object.keys(marks).length > 0 && <button className="btn btn-primary" disabled={saving} onClick={saveMarks}>{saving ? "Saving..." : "Save marks"}</button>}
          </div>
        </div>
      )}
    </Modal>
  );
};

export const ResultsView = ({ test, onBack }) => {
  const { dialogConfirm, dialogAlert } = useDialog();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [tick, setTick] = useState(0);
  const [vis, setVis] = useState(test.result_visibility);
  const [section, setSection] = useState("");
  useEffect(() => {
    let live = true;
    setData(null); setError("");
    cbt.get(`/tests/${test.id}/attempts`).then((r) => { if (live) setData(unwrap(r)); }).catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [test.id, tick]);

  const del = async (a) => { if (!(await dialogConfirm(`Delete ${a.student_name}'s result? They can attempt again if attempts remain.`, "Delete result"))) return; try { await cbt.del(`/attempts/${a.id}`); setTick((v) => v + 1); } catch (e) { dialogAlert(e.message); } };
  const release = async (on) => { try { await cbt.put(`/tests/${test.id}/release`, { release: on }); setVis(on ? 3 : 2); dialogAlert(on ? "Results are now visible to students." : "Results are hidden again."); } catch (e) { dialogAlert(e.message); } };
  const list = data ? data.attempts.filter((a) => !section || a.class_name === section) : [];
  const classes = data ? [...new Set(data.attempts.map((a) => a.class_name))] : [];
  const scored = list.filter((a) => a.pct != null && a.status !== 0);
  const avg = scored.length ? Math.round((scored.reduce((s, a) => s + a.pct, 0) / scored.length) * 10) / 10 : null;
  const exportCsv = () => downloadCsv(`${test.title}-results.csv`, [["Rank", "Student", "Admission no", "Roll", "Class", "Attempt", "Marks", "Total", "Percent", "Correct", "Wrong", "Skipped", "Time", "Flags", "Status"],
    ...list.map((a, i) => [i + 1, a.student_name, a.admission_no, a.roll_no, a.class_name, a.attempt_no, a.marks_obtained, a.marks_total, a.pct, a.correct, a.incorrect, a.unattempted, mmss(a.time_taken_sec), a.flags, ["In progress", "Submitted", "Auto-submitted", "Marked", "Void"][a.status]])]);

  return (
    <div className="slide-in">
      <SectionHeader title={test.title} sub="Results" action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {vis >= 2 && <button className="btn btn-primary" onClick={() => release(vis === 2)}>{vis === 2 ? "Release results" : "Hide results"}</button>}
        <button className="btn btn-ghost" onClick={exportCsv} disabled={!list.length}><Icon name="download" size={14} /> CSV</button>
        <button className="btn btn-ghost" onClick={onBack}>Back</button></div>} />
      {error ? <div className="card" style={{ color: C.red, fontSize: 13 }}>{error}</div> : !data ? (
        <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading</div>
      ) : (
        <>
          <div className="qt-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
            <KpiCard label="Attempts" value={list.length} sub="Including in progress" icon="users" color={C.blue} />
            <KpiCard label="Average" value={avg == null ? "-" : `${avg}%`} sub="Of submitted" icon="chart" color={C.primary} />
            <KpiCard label="Needs marking" value={list.filter((a) => a.needs_grading).length} sub="Written answers" icon="edit" color={C.yellow} />
            <KpiCard label="Flagged" value={list.filter((a) => a.flags > 0).length} sub="Proctoring events" icon="warning" color={C.red} />
          </div>
          {classes.length > 1 && <div style={{ marginBottom: 12 }}><select className="select" value={section} onChange={(e) => setSection(e.target.value)}><option value="">All sections</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>}
          {list.length === 0 ? <EmptyState icon="result" title="No attempts yet" sub="Results appear here as students submit." /> : (
            <>
            <div className="hide-mobile"><TableWrap>
              <table className="table">
                <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Marks</th><th>%</th><th>Time</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {list.map((a, i) => (
                    <tr key={a.id}>
                      <td>{i + 1}</td>
                      <td><b>{a.student_name}</b><div style={{ fontSize: 11.5, color: C.textMuted }}>{a.admission_no}{a.attempt_no > 1 ? ` | attempt ${a.attempt_no}` : ""}</div></td>
                      <td>{a.class_name}</td>
                      <td>{a.marks_obtained == null ? "-" : `${a.marks_obtained}/${a.marks_total}`}</td>
                      <td><b style={{ color: a.passed === false ? C.red : a.passed ? C.green : C.text }}>{a.pct == null ? "-" : `${a.pct}%`}</b></td>
                      <td>{mmss(a.time_taken_sec)}</td>
                      <td>
                        {a.status === 0 && <span className="badge" style={{ background: `${C.blue}22`, color: C.blue }}>In progress</span>}
                        {a.status === 2 && <span className="badge" style={{ background: `${C.yellow}22`, color: C.yellow }}>Auto-submitted</span>}
                        {a.needs_grading && <span className="badge" style={{ background: `${C.yellow}22`, color: C.yellow, marginLeft: 4 }}>Mark it</span>}
                        {a.flags > 0 && <span className="badge" style={{ background: `${C.red}22`, color: C.red, marginLeft: 4 }}>{a.flags} flag{a.flags > 1 ? "s" : ""}</span>}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn btn-ghost" style={{ padding: "5px 9px" }} onClick={() => setOpen(a.id)}><Icon name="eye" size={13} /></button>{" "}
                        <button className="btn btn-danger" style={{ padding: "5px 9px" }} onClick={() => del(a)}><Icon name="trash" size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap></div>
            <div className="qt-m-only">
              {list.map((a, i) => (
                <div key={a.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <b>{i + 1}. {a.student_name}</b>
                      <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{a.admission_no}{a.class_name ? ` | ${a.class_name}` : ""}{a.attempt_no > 1 ? ` | attempt ${a.attempt_no}` : ""}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <b style={{ fontSize: 18, color: a.passed === false ? C.red : a.passed ? C.green : C.text }}>{a.pct == null ? "-" : `${a.pct}%`}</b>
                      <div style={{ fontSize: 11.5, color: C.textMuted }}>{a.marks_obtained == null ? "-" : `${a.marks_obtained}/${a.marks_total}`}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: C.textMuted }}>
                      <span>{mmss(a.time_taken_sec)}</span>
                      {a.status === 0 && <span className="badge" style={{ background: `${C.blue}22`, color: C.blue }}>In progress</span>}
                      {a.status === 2 && <span className="badge" style={{ background: `${C.yellow}22`, color: C.yellow }}>Auto-submitted</span>}
                      {a.needs_grading && <span className="badge" style={{ background: `${C.yellow}22`, color: C.yellow }}>Mark it</span>}
                      {a.flags > 0 && <span className="badge" style={{ background: `${C.red}22`, color: C.red }}>{a.flags} flag{a.flags > 1 ? "s" : ""}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost" style={{ padding: "6px 11px" }} onClick={() => setOpen(a.id)}><Icon name="eye" size={14} /> View</button>
                      <button className="btn btn-danger" style={{ padding: "6px 10px" }} onClick={() => del(a)}><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </>
      )}
      <AttemptModal attemptId={open} onClose={() => setOpen(null)} onChanged={() => setTick((v) => v + 1)} />
    </div>
  );
};
