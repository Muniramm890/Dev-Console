// @ts-nocheck
// Quick Test 2.0 - analytics of one test (summary, distribution, sections, question-wise, toppers, absentees).
import { useEffect, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { TableWrap } from "../../components/ui/TableWrap";
import { C } from "../../theme/theme";
import { cbt, unwrap } from "./cbtApi";
import { downloadCsv, mmss, typeShort } from "./helpers";

const levelColor = (l) => (l === "easy" ? C.green : l === "hard" ? C.red : C.yellow);

export const AnalyticsView = ({ test, onBack }) => {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    cbt.get(`/tests/${test.id}/analytics`).then((r) => { if (live) setD(unwrap(r)); }).catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [test.id]);
  if (error) return <div className="card" style={{ color: C.red, fontSize: 13 }}>{error} <button className="btn btn-ghost" onClick={onBack}>Back</button></div>;
  if (!d) return <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading</div>;
  const s = d.summary; const maxBin = Math.max(1, ...d.distribution.map((b) => b.count));
  const person = (p) => `${p.name}${p.section ? ` (${p.section})` : ""}`;
  return (
    <div className="slide-in">
      <SectionHeader title={d.test.title} sub="Analytics (best attempt of each student)" action={<div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-ghost" onClick={() => downloadCsv(`${d.test.title}-questions.csv`, [["Q", "Type", "Topic", "Attempted", "Correct", "Wrong", "Skipped", "Correct %", "Avg time (s)", "Level"], ...d.questions.map((q) => [q.q_no, typeShort(q.q_type), q.topic, q.attempted, q.correct, q.incorrect, q.unattempted, q.correct_pct, q.avg_time_sec, q.level])])}><Icon name="download" size={14} /> Question CSV</button>
        <button className="btn btn-ghost" onClick={onBack}>Back</button></div>} />
      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
        <KpiCard label="Participation" value={s.participation_pct == null ? "-" : `${s.participation_pct}%`} sub={`${s.submitted} of ${s.assigned} students`} icon="users" color={C.blue} />
        <KpiCard label="Average" value={s.avg_pct == null ? "-" : `${s.avg_pct}%`} sub={`Std dev ${s.std_dev == null ? "-" : s.std_dev}`} icon="chart" color={C.primary} />
        <KpiCard label="Highest / Lowest" value={s.highest_pct == null ? "-" : `${s.highest_pct}% / ${s.lowest_pct}%`} sub="Of submitted" icon="trophy" color={C.green} />
        <KpiCard label="Pass rate" value={s.pass_pct == null ? "-" : `${s.pass_pct}%`} sub={s.passed == null ? "No pass marks set" : `${s.passed} passed`} icon="check" color={C.cyan} />
      </div>
      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard label="Avg time" value={mmss(s.avg_time_sec)} sub="Per attempt" icon="schedule" color={C.purple} />
        <KpiCard label="Started" value={s.started} sub="Attempts begun" icon="test" color={C.blue} />
        <KpiCard label="Needs marking" value={s.pending_grading} sub="Written answers" icon="edit" color={C.yellow} />
        <KpiCard label="Flagged" value={s.flagged} sub="Proctoring events" icon="warning" color={C.red} />
      </div>

      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <SectionCard icon="chart" title="Score distribution" sub="Students per 10% band">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 150 }}>
            {d.distribution.map((b) => (
              <div key={b.from} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{b.count || ""}</div>
                <div style={{ height: `${(b.count / maxBin) * 110}px`, minHeight: b.count ? 4 : 1, background: b.from < 40 ? C.red : b.from < 70 ? C.yellow : C.green, borderRadius: "4px 4px 0 0" }} />
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{b.from}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard icon="students" title="Section-wise" sub="Average of best attempts">
          {d.sections.length === 0 ? <div style={{ fontSize: 13, color: C.textMuted }}>No submissions yet.</div> : d.sections.map((x) => (
            <div key={x.section_id || x.name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><b>{x.name || "-"}</b><span>{x.avg_pct}% ({x.submitted})</span></div>
              <div style={{ height: 7, background: C.surfaceAlt, borderRadius: 5, marginTop: 4 }}><div style={{ width: `${Math.min(100, x.avg_pct)}%`, height: 7, background: C.primary, borderRadius: 5 }} /></div>
            </div>
          ))}
        </SectionCard>
      </div>

      <SectionCard icon="book" title="Question-wise analysis" sub="How each question performed">
        <TableWrap>
          <table className="table">
            <thead><tr><th>Q</th><th>Type</th><th>Question</th><th>Right</th><th>Wrong</th><th>Skipped</th><th>Correct %</th><th>Avg time</th><th>Option picks</th></tr></thead>
            <tbody>
              {d.questions.map((q) => (
                <tr key={q.q_no}>
                  <td>{q.q_no}</td><td>{typeShort(q.q_type)}</td>
                  <td style={{ maxWidth: 260 }}>{String(q.snippet || "").replace(/!\[[^\]]*\]\([^)]*\)?/g, "[image]")}{q.topic && <div style={{ fontSize: 11, color: C.textMuted }}>{q.topic}</div>}</td>
                  <td style={{ color: C.green }}>{q.correct}</td><td style={{ color: C.red }}>{q.incorrect}</td><td>{q.unattempted}</td>
                  <td>{q.correct_pct == null ? "-" : <span className="badge" style={{ background: `${levelColor(q.level)}22`, color: levelColor(q.level) }}>{q.correct_pct}% {q.level}</span>}</td>
                  <td>{q.avg_time_sec == null ? "-" : `${q.avg_time_sec}s`}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{q.options.map((o) => <span key={o.pos} style={{ marginRight: 8, fontSize: 12, color: o.is_correct ? C.green : C.textMuted, fontWeight: o.is_correct ? 700 : 400 }}>{"ABCDEFGHIJKLMNO"[o.pos]}:{o.picked}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </SectionCard>

      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
        <SectionCard icon="trophy" title="Toppers">
          {d.toppers.length === 0 ? <div style={{ fontSize: 13, color: C.textMuted }}>No submissions yet.</div> : d.toppers.map((p, i) => <div key={p.student_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}><span>{i + 1}. {person(p)}</span><b>{p.pct}%</b></div>)}
        </SectionCard>
        <SectionCard icon="warning" title="Needs attention" sub="Below the pass level">
          {d.needs_attention.length === 0 ? <div style={{ fontSize: 13, color: C.textMuted }}>Nobody is below the pass level.</div> : d.needs_attention.map((p) => <div key={p.student_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}><span>{person(p)}</span><b style={{ color: C.red }}>{p.pct}%</b></div>)}
        </SectionCard>
      </div>
      <div style={{ marginTop: 20 }}>
        <SectionCard icon="users" title={`Not attempted (${d.absentees.length}${d.absentees.length === 100 ? "+" : ""})`} sub="Assigned students with no submission">
          {d.absentees.length === 0 ? <div style={{ fontSize: 13, color: C.textMuted }}>Everyone has attempted.</div> : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{d.absentees.map((p) => <span key={p.student_id} className="badge" style={{ background: C.surfaceAlt, color: C.text }}>{person(p)}</span>)}</div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};
