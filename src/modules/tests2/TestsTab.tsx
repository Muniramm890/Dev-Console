// @ts-nocheck
// Quick Test 2.0 - list of tests with publish / close / duplicate / delete and links to results and analytics.
import { useEffect, useState } from "react";
import { CardGrid, Crumbs, groupBy } from "./Drill";
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
  // drill-down: class > subject > chapter > tests (a class is loaded only when it is opened)
  const [path, setPath] = useState({ grade: null, subject: null, chapter: null });
  const [cls, setCls] = useState({ tests: [], loading: false, error: "" });
  const [cpage, setCpage] = useState(1);
  const flat = !!search.trim(); // typing in the search box switches to a flat server-side search

  useEffect(() => { setPage(1); }, [status, grade, search, currentYear && currentYear.id]);
  useEffect(() => {
    if (!search.trim()) { setLoading(false); return undefined; }
    let live = true;
    const t = setTimeout(() => {
      setLoading(true); setError("");
      cbt.get(`/tests${qs({ academic_year_id: currentYear && currentYear.id, status, grade_id: grade, search, page, limit })}`)
        .then((r) => { if (live) setData(unwrap(r)); }).catch((e) => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    }, search ? 350 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [status, grade, search, page, tick, currentYear && currentYear.id]); // eslint-disable-line

  useEffect(() => { setCpage(1); }, [status, path.grade, path.subject, path.chapter]);
  useEffect(() => {
    if (!path.grade || flat) return undefined;
    let live = true;
    setCls({ tests: [], loading: true, error: "" });
    (async () => {
      try {
        let all = [], p = 1, total = 0;
        do {
          const r = unwrap(await cbt.get(`/tests${qs({ academic_year_id: currentYear && currentYear.id, grade_id: path.grade.id, page: p, limit: 100 })}`));
          all = all.concat(r.tests || []); total = r.total || 0; p += 1;
        } while (all.length < total && p <= 10);
        if (live) setCls({ tests: all, loading: false, error: "" });
      } catch (e) { if (live) setCls({ tests: [], loading: false, error: e.message }); }
    })();
    return () => { live = false; };
  }, [path.grade && path.grade.id, tick, flat, currentYear && currentYear.id]); // eslint-disable-line

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

  const renderTest = (t) => (
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
  );
  const STATUS_TABS = [{ id: "", label: "All" }, { id: "0", label: "Draft" }, { id: "1", label: "Live" }, { id: "2", label: "Closed" }, { id: "3", label: "Archived" }];
  const listBody = (items, ld, er) => er ? (
    <div className="card" style={{ color: C.red, fontSize: 13 }}>{er}</div>
  ) : ld ? (
    <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading</div>
  ) : items.length === 0 ? (
    <EmptyState icon="test" title="No tests found" sub="Change the filter or create a new test." action={<button className="btn btn-primary" onClick={() => setEditor({ open: true, id: null })}>Create test</button>} />
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{items.map((t) => <div key={t.id}>{renderTest(t)}</div>)}</div>
  );
  const resetTo = (lvl) => setPath((p) => (lvl === 0 ? { grade: null, subject: null, chapter: null } : lvl === 1 ? { ...p, subject: null, chapter: null } : { ...p, chapter: null }));
  const count = (n) => `${n} test${n === 1 ? "" : "s"}`;

  const renderDrill = () => {
    const g = path.grade, sb = path.subject, ch = path.chapter;
    const crumbs = [{ label: "All classes", onClick: g ? () => resetTo(0) : null }];
    if (g) crumbs.push({ label: g.name, onClick: sb ? () => resetTo(1) : null });
    if (sb) crumbs.push({ label: sb.label, onClick: ch ? () => resetTo(2) : null });
    if (ch) crumbs.push({ label: ch.label });
    let content;
    if (!g) {
      content = grades.length === 0 ? <EmptyState icon="test" title="No classes found" sub="Add classes in setup first." /> : (
        <CardGrid big cards={grades.map((x) => ({ key: x.id, label: x.name, sub: "View subjects", icon: "academic" }))} onPick={(c) => setPath({ grade: { id: c.key, name: c.label }, subject: null, chapter: null })} />
      );
    } else if (cls.loading || cls.error) {
      content = listBody([], cls.loading, cls.error);
    } else if (!sb) {
      const gs = groupBy(cls.tests, (t) => t.subject_id || "none", (t) => t.subject_name || "General");
      content = gs.length === 0 ? listBody([], false, "") : (
        <CardGrid cards={gs.map((x) => ({ key: x.key, label: x.label, sub: count(x.items.length), icon: "book" }))} onPick={(c) => setPath((p) => ({ ...p, subject: { key: c.key, label: c.label }, chapter: null }))} />
      );
    } else {
      const inSub = cls.tests.filter((t) => (t.subject_id || "none") === sb.key);
      if (!ch) {
        const cg = groupBy(inSub, (t) => t.chapter_name || "", (t) => t.chapter_name || "No chapter");
        content = <CardGrid cards={cg.map((x) => ({ key: x.key, label: x.label, sub: count(x.items.length), icon: "test" }))} onPick={(c) => setPath((p) => ({ ...p, chapter: { key: c.key, label: c.label } }))} />;
      } else {
        const all = inSub.filter((t) => (t.chapter_name || "") === ch.key);
        const shown = status === "" ? all : all.filter((t) => String(t.status) === status);
        const cp = Math.max(1, Math.ceil(shown.length / limit));
        content = (
          <div>
            <PillTabs tabs={STATUS_TABS} active={status} onChange={setStatus} />
            {listBody(shown.slice((cpage - 1) * limit, cpage * limit), false, "")}
            {cp > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 14 }}>
                <button className="btn btn-ghost" disabled={cpage <= 1} onClick={() => setCpage(cpage - 1)}>Previous</button>
                <span style={{ fontSize: 12.5, color: C.textMuted }}>Page {cpage} of {cp}</span>
                <button className="btn btn-ghost" disabled={cpage >= cp} onClick={() => setCpage(cpage + 1)}>Next</button>
              </div>
            )}
          </div>
        );
      }
    }
    return <div><Crumbs items={crumbs} />{content}</div>;
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={() => setEditor({ open: true, id: null })}><Icon name="plus" size={14} /> Create test</button>
        <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Search all tests by title or chapter" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {flat ? (
        <div>
          <PillTabs tabs={STATUS_TABS} active={status} onChange={setStatus} />
          {listBody(data.tests, loading, error)}
      {flat && pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 14 }}>
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span style={{ fontSize: 12.5, color: C.textMuted }}>Page {page} of {pages}</span>
          <button className="btn btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
        </div>
      ) : renderDrill()}
      <TestEditor open={editor.open} testId={editor.id} onClose={() => setEditor({ open: false, id: null })} onSaved={() => setTick((v) => v + 1)} />
    </div>
  );
};
