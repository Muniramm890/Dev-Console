// @ts-nocheck
// Quick Test 2.0 - list of tests with publish / close / duplicate / delete and links to results and analytics.
import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { PillTabs } from "../../components/ui/PillTabs";
import { useAuth } from "../../contexts/AuthContext";
import { useDialog } from "../../contexts/DialogContext";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { useSession } from "../../contexts/SessionContext";
import { C } from "../../theme/theme";
import { useGradesAndSections } from "../attendance/useGradesAndSections";
import { cbt, unwrap } from "./cbtApi";
import { STATUS_LABEL, fmtDT, qs, statusColor } from "./helpers";
import { TestEditor } from "./TestEditor";

export const TestsTab = ({ onResults, onAnalytics }) => {
  const { dialogConfirm, dialogAlert } = useDialog();
  const { currentYear } = useSession();
  const { user } = useAuth();
  const { grades } = useGradesAndSections();
  const [status, setStatus] = useState("");
  const [grade, setGrade] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ tests: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [editor, setEditor] = useState({ open: false, id: null });
  const limit = 12;
  const isAdmin = user && user.role === "school_admin";

  useEffect(() => { setPage(1); }, [status, grade, search, currentYear && currentYear.id]);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      setLoading(true); setError("");
      cbt.get(`/tests${qs({ academic_year_id: currentYear && currentYear.id, status, grade_id: grade, search, page, limit })}`)
        .then((r) => { if (live) setData(unwrap(r)); }).catch((e) => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    }, search ? 350 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [status, grade, search, page, tick, currentYear && currentYear.id]); // eslint-disable-line

  const act = async (fn, okMsg) => { try { await fn(); setTick((v) => v + 1); if (okMsg) dialogAlert(okMsg); } catch (e) { dialogAlert(e.message); } };
  const setSt = (t, s) => act(() => cbt.put(`/tests/${t.id}/status`, { status: s }));
  // question paper PDF (built by the backend, same as Quick Test 1: school header, brand colour, images)
  const [printing, setPrinting] = useState("");
  const printPaper = async (t) => {
    setPrinting(String(t.id));
    try { await openGeneratedPdf(`/cbt/tests/${t.id}/print-paper`, { name: `${t.title || "Test"}-paper.pdf`, title: t.title || "Question Paper", method: "POST", body: { settings: {} } }); }
    catch (e) { dialogAlert(e.message || "Could not create the question paper"); }
    finally { setPrinting(""); }
  };
  const del = async (t) => {
    const hard = isAdmin && t.n_submitted > 0 && (await dialogConfirm(`"${t.title}" has ${t.n_submitted} result(s).\n\nPress OK to delete the test AND all its results permanently. Press Cancel to keep the results (the test will only be hidden).`, "Delete with results?"));
    if (!hard && !(await dialogConfirm(`Remove "${t.title}"?${t.n_submitted ? " Its results are kept." : ""}`, "Remove test"))) return;
    act(() => cbt.del(`/tests/${t.id}${hard ? "?hard=1" : ""}`));
  };
  const pages = Math.max(1, Math.ceil((data.total || 0) / limit));
  const nextActions = (t) => {
    const a = [];
    if (t.status === 0) a.push(["Publish", () => setSt(t, 1), "btn-primary"]);
    if (t.status === 1) a.push(["Close", () => setSt(t, 2), "btn-ghost"]);
    if (t.status === 2) a.push(["Reopen", () => setSt(t, 1), "btn-ghost"]);
    if (t.status === 3) a.push(["Unarchive", () => setSt(t, 2), "btn-ghost"]);
    if (t.status !== 3) a.push(["Archive", () => setSt(t, 3), "btn-ghost"]);
    return a;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
          <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Search tests" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="select" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">All classes</option>{grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        </div>
        <button className="btn btn-primary" onClick={() => setEditor({ open: true, id: null })}><Icon name="plus" size={14} /> New test</button>
      </div>
      <PillTabs tabs={[{ id: "", label: "All" }, { id: "0", label: "Draft" }, { id: "1", label: "Live" }, { id: "2", label: "Closed" }, { id: "3", label: "Archived" }]} active={status} onChange={setStatus} />

      {error ? <div className="card" style={{ color: C.red, fontSize: 13 }}>{error}</div> : loading ? (
        <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading</div>
      ) : data.tests.length === 0 ? (
        <EmptyState icon="test" title="No tests yet" sub="Create a test from your question bank." action={<button className="btn btn-primary" onClick={() => setEditor({ open: true, id: null })}>New test</button>} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.tests.map((t) => (
            <div key={t.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b className="syne" style={{ fontSize: 15 }}>{t.title}</b>
                    <span className="badge" style={{ background: `${statusColor(C, t.status)}22`, color: statusColor(C, t.status) }}>{STATUS_LABEL[t.status]}</span>
                    <span style={{ fontSize: 11.5, color: C.textMuted }}>{t.code}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 5 }}>
                    {t.grade_name}{t.subject_name ? ` - ${t.subject_name}` : ""}{t.chapter_name ? ` - ${t.chapter_name}` : ""} | {t.q_count} questions | {t.total_marks} marks | {t.duration_min} min
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>
                    {t.starts_at || t.ends_at ? `${fmtDT(t.starts_at)} to ${fmtDT(t.ends_at)}` : "Open any time"} | by {t.created_by_name || "-"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="syne" style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>{t.n_submitted}</div>
                  <div style={{ fontSize: 11.5, color: C.textMuted }}>submitted{t.avg_pct != null ? ` | avg ${t.avg_pct}%` : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => onResults(t)}><Icon name="result" size={13} /> Results</button>
                <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => onAnalytics(t)}><Icon name="chart" size={13} /> Analytics</button>
                {(t.mine || isAdmin) && <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => setEditor({ open: true, id: t.id })}><Icon name="edit" size={13} /> Edit</button>}
                <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => act(() => cbt.post(`/tests/${t.id}/duplicate`, {}), "Copied as a draft.")}>Duplicate</button>
                {(t.mine || isAdmin) && nextActions(t).map(([label, fn, cls]) => <button key={label} className={`btn ${cls}`} style={{ fontSize: 12.5 }} onClick={fn}>{label}</button>)}
                {(t.mine || isAdmin) && <button className="btn btn-ghost" style={{ fontSize: 12.5 }} disabled={printing === String(t.id)} onClick={() => printPaper(t)}><Icon name="file" size={13} /> {printing === String(t.id) ? "Preparing..." : "Print"}</button>}
                {(t.mine || isAdmin) && <button className="btn btn-danger" style={{ fontSize: 12.5 }} onClick={() => del(t)}><Icon name="trash" size={13} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 14 }}>
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span style={{ fontSize: 12.5, color: C.textMuted }}>Page {page} of {pages}</span>
          <button className="btn btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
      <TestEditor open={editor.open} testId={editor.id} onClose={() => setEditor({ open: false, id: null })} onSaved={() => setTick((v) => v + 1)} />
    </div>
  );
};
