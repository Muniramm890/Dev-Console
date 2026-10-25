// @ts-nocheck
// Floating control while inside a school (the copied Admin app runs underneath, unchanged).
import { useEffect, useState } from "react";
import { papi } from "./api";
import { Modal, Field, useLoad } from "./ui";
import { C } from "../theme/theme";

export const OpenSchoolModal = ({ school, initialWrite = false, onClose, onOpen }) => {
  const [reason, setReason] = useState(sessionStorage.getItem("dc_reason") || ""); const [write, setWrite] = useState(initialWrite); const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); sessionStorage.setItem("dc_reason", reason); try { await onOpen(school, { write, reason: reason.trim() }); onClose(); } finally { setBusy(false); } };
  return (
    <Modal title={school.userName ? `Open ${school.name} as ${school.userName}` : `Open ${school.name}`} onClose={onClose}>
      <p style={{ fontSize: 13, color: C.textMuted }}>You will see the school exactly as its admin sees it. Every open is written to the audit log.</p>
      <Field label="Reason (min 5 characters)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Support ticket / checking fees report" /></Field>
      <label className="dc-row" style={{ marginTop: 12, fontSize: 13 }}><input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} /> Write mode (can change data - every change is logged)</label>
      <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy || reason.trim().length < 5} onClick={go}>{busy ? "Opening..." : write ? "Open (write mode)" : "Open (read-only)"}</button>
    </Modal>
  );
};

const SwitchModal = ({ onClose, onPick }) => {
  const [q, setQ] = useState(""); const l = useLoad(() => papi(`/schools?q=${encodeURIComponent(q)}&limit=20`), [q]);
  return (
    <Modal title="Switch school" onClose={onClose}>
      <input className="input" autoFocus placeholder="Search school" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ marginTop: 10, maxHeight: "50vh", overflow: "auto" }}>
        {(l.data?.items || []).filter((s) => !s.deleted_at).map((s) => (
          <div key={s.id} className="card" style={{ marginBottom: 8, cursor: "pointer" }} onClick={() => onPick({ id: s.id, name: s.name })}><b>{s.name}</b> <span style={{ fontSize: 12, color: C.textMuted }}>{s.slug} - {s.platform_status}</span></div>))}
      </div>
    </Modal>
  );
};

export const DevPanel = ({ acting, onEnter, onExit }) => {
  const [open, setOpen] = useState(false); const [sw, setSw] = useState(false); const [ask, setAsk] = useState(null); const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  const mins = Math.max(0, Math.round((acting.expires - Date.now()) / 60000));
  return (
    <>
      <button className="btn btn-primary dc-fab" style={{ background: acting.write ? C.red : C.primary, borderRadius: 100 }} onClick={() => setOpen(!open)}>DEV {acting.write ? "RW" : "RO"}</button>
      {open && (
        <div className="card dc-panel">
          <b>{acting.school.name}</b>
          <div style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 10px" }}>Viewing as {acting.role} ({acting.name}) - {acting.write ? "WRITE mode" : "read-only"} - {mins} min left</div>
          <div className="dc-row">
            <button className="btn btn-ghost" onClick={() => { setSw(true); setOpen(false); }}>Switch school</button>
            <button className="btn btn-ghost" onClick={() => { setAsk({ school: acting.school, write: !acting.write }); setOpen(false); }}>{acting.write ? "Back to read-only" : "Enable write mode"}</button>
            <button className="btn btn-primary" onClick={() => onExit("Back to console")}>Exit to console</button>
          </div>
        </div>)}
      {sw && <SwitchModal onClose={() => setSw(false)} onPick={(s) => { setSw(false); setAsk({ school: s, write: false }); }} />}
      {ask && <OpenSchoolModal school={ask.school} initialWrite={ask.write} onClose={() => setAsk(null)} onOpen={onEnter} />}
    </>
  );
};
