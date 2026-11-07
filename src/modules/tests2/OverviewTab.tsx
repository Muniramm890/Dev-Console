// @ts-nocheck
// Quick Test 2.0 - Overview: live numbers for the school (tests, attempts, marking queue, storage) + school level settings.
import { useEffect, useState } from "react";
import { KpiCard } from "../../components/ui/KpiCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { useAuth } from "../../contexts/AuthContext";
import { useDialog } from "../../contexts/DialogContext";
import { useSession } from "../../contexts/SessionContext";
import { C } from "../../theme/theme";
import { cbt, unwrap } from "./cbtApi";
import { STATUS_LABEL, mb, qs, statusColor } from "./helpers";

export const OverviewTab = ({ onResults }) => {
  const { dialogAlert } = useDialog();
  const { user } = useAuth();
  const { currentYear } = useSession();
  const isAdmin = user && user.role === "school_admin";
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [dash, setDash] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showSet, setShowSet] = useState(typeof window !== "undefined" && window.innerWidth > 768);
  const load = () => Promise.all([
    cbt.get("/settings"),
    cbt.get(`/dashboard${qs({ academic_year_id: currentYear && currentYear.id })}`).catch(() => null),
  ]).then(([sr, dr]) => { const x = unwrap(sr); setD(x); setF(x.settings); setDash(dr ? unwrap(dr) : null); }).catch((e) => dialogAlert(e.message));
  useEffect(() => { load(); }, [currentYear && currentYear.id]); // eslint-disable-line
  if (!d || !f) return <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading</div>;
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const u = d.usage; const pct = Math.min(100, Math.round((u.used_bytes / Math.max(1, u.quota_bytes)) * 100));
  const save = async () => {
    setBusy(true);
    try { await cbt.put("/settings", { storage_quota_mb: Number(f.storage_quota_mb), proctor_retention_days: Number(f.proctor_retention_days), default_duration_min: Number(f.default_duration_min), default_negative_marks: Number(f.default_negative_marks), allow_proctoring: !!f.allow_proctoring, allow_platform_library: !!f.allow_platform_library }); await load(); dialogAlert("Settings saved."); }
    catch (e) { dialogAlert(e.message); } finally { setBusy(false); }
  };
  const clean = async () => {
    setBusy(true);
    try { const r = unwrap(await cbt.post("/maintenance/cleanup", {})); await load(); dialogAlert(`Removed ${r.proctor_snapshots_removed} old proctoring photo(s) and ${r.unused_images_removed} unused image(s). Freed ${mb(r.bytes_freed)}.`, "Clean-up done"); }
    catch (e) { dialogAlert(e.message); } finally { setBusy(false); }
  };
  const Num = ({ label, k, min, step = 1 }) => (
    <div style={{ minWidth: 170, flex: 1 }}>
      <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 5, fontWeight: 600 }}>{label}</label>
      <input className="input" type="number" min={min} step={step} style={{ width: "100%" }} disabled={!isAdmin} value={f[k]} onChange={(e) => set(k, e.target.value)} />
    </div>
  );
  const grid = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 };
  const openTest = async (t) => { if (!onResults) return; try { onResults(unwrap(await cbt.get(`/tests/${t.id}`))); } catch (e) { dialogAlert(e.message); } };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <span style={{ fontSize: 12.5, color: C.textMuted }}>{currentYear && currentYear.name ? `Academic year ${currentYear.name}` : ""}</span>
        <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={load}>Refresh</button>
      </div>
      {dash && dash.needs_grading > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${C.red}`, fontSize: 13.5 }}>
          <b>{dash.needs_grading}</b> attempt{dash.needs_grading === 1 ? " is" : "s are"} waiting for manual marking. Open a test from the Tests tab and go to Results.
        </div>
      )}
      {dash && (
        <div className="qt-kpi" style={grid}>
          <KpiCard label="Live tests" value={dash.tests.live} sub="Open for students" icon="test" color={C.green} />
          <KpiCard label="Taking now" value={dash.taking_now} sub="Students in a test" icon="users" color={C.cyan} />
          <KpiCard label="Needs marking" value={dash.needs_grading} sub="Written answers" icon="edit" color={dash.needs_grading > 0 ? C.red : C.textMuted} />
          <KpiCard label="Draft tests" value={dash.tests.draft} sub={`${dash.tests.closed} closed, ${dash.tests.archived} archived`} icon="file" color={C.yellow} />
        </div>
      )}
      <div className="qt-kpi" style={grid}>
        {dash && <KpiCard label="Attempts (30 days)" value={dash.attempts_last_30_days} sub="Submitted this year" icon="result" color={C.blue} />}
        {dash && <KpiCard label="Average score" value={dash.avg_pct_last_30_days == null ? "-" : `${dash.avg_pct_last_30_days}%`} sub="Last 30 days" icon="chart" color={C.purple} />}
        <KpiCard label="Questions" value={u.questions} sub="In your bank" icon="book" color={C.primary} />
        <KpiCard label="Tests" value={u.tests} sub={`${u.attempts} attempts, all years`} icon="test" color={C.blue} />
      </div>
      {dash && (dash.recent_tests || []).length > 0 && (
        <SectionCard icon="test" title="Recent tests" sub="Latest five tests of this academic year. Tap one to open its results.">
          {dash.recent_tests.map((t, i) => (
            <div key={t.id || t.code || i} onClick={() => openTest(t)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "9px 0", borderBottom: i < dash.recent_tests.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: 13.5 }}>{t.title}</b>{" "}
                <span className="badge" style={{ background: `${statusColor(C, t.status)}22`, color: statusColor(C, t.status) }}>{STATUS_LABEL[t.status]}</span>
              </div>
              <div style={{ fontSize: 12.5, color: C.textMuted }}>{t.q_count} questions | {t.n_submitted} submitted{t.avg_pct != null ? ` | avg ${t.avg_pct}%` : ""}</div>
            </div>
          ))}
        </SectionCard>
      )}
      <SectionCard icon="upload" title="Image storage" sub={`${mb(u.used_bytes)} of ${mb(u.quota_bytes)} used`}>
        <div style={{ height: 10, borderRadius: 6, background: C.surfaceAlt, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct > 85 ? C.red : C.cyan }} />
        </div>
        <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 8 }}>{pct}% used{pct > 85 ? " - almost full. Use Free up storage in the settings below." : ""}</div>
      </SectionCard>
      <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => setShowSet((v) => !v)}>{showSet ? "Hide settings" : "Show settings"}</button>
      {showSet && (
      <SectionCard icon="setup" title="Online test settings" sub={isAdmin ? "Applies to your whole school" : "Only the school admin can change these"}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
          <Num label="Image storage quota (MB)" k="storage_quota_mb" min="50" />
          <Num label="Keep proctoring photos (days)" k="proctor_retention_days" min="1" />
          <Num label="Default test duration (min)" k="default_duration_min" min="1" />
          <Num label="Default negative marks" k="default_negative_marks" min="0" step="0.25" />
        </div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 14, fontSize: 13 }}>
          <label><input type="checkbox" disabled={!isAdmin} checked={!!f.allow_proctoring} onChange={(e) => set("allow_proctoring", e.target.checked)} /> Allow proctoring (tab tracking + camera photos)</label>
          <label><input type="checkbox" disabled={!isAdmin} checked={!!f.allow_platform_library} onChange={(e) => set("allow_platform_library", e.target.checked)} /> Show the shared question library</label>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" disabled={busy} onClick={save}>Save settings</button>
            <button className="btn btn-ghost" disabled={busy} onClick={clean} title="Deletes proctoring photos older than the retention days and images no question uses">Free up storage</button>
          </div>
        )}
      </SectionCard>
      )}
    </div>
  );
};
