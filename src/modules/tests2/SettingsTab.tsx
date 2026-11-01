// @ts-nocheck
// Quick Test 2.0 - school level controls: storage quota + usage, proctoring snapshot retention, defaults, clean-up.
import { useEffect, useState } from "react";
import { KpiCard } from "../../components/ui/KpiCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { useAuth } from "../../contexts/AuthContext";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";
import { cbt, unwrap } from "./cbtApi";
import { mb } from "./helpers";

export const SettingsTab = () => {
  const { dialogAlert } = useDialog();
  const { user } = useAuth();
  const isAdmin = user && user.role === "school_admin";
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => cbt.get("/settings").then((r) => { const x = unwrap(r); setD(x); setF(x.settings); }).catch((e) => dialogAlert(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line
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
  return (
    <div>
      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard label="Questions" value={u.questions} sub="In your bank" icon="book" color={C.primary} />
        <KpiCard label="Tests" value={u.tests} sub="All years" icon="test" color={C.blue} />
        <KpiCard label="Attempts" value={u.attempts} sub="By students" icon="users" color={C.green} />
        <KpiCard label="Image storage" value={mb(u.used_bytes)} sub={`of ${mb(u.quota_bytes)} (${pct}%)`} icon="upload" color={pct > 85 ? C.red : C.cyan} />
      </div>
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
    </div>
  );
};
