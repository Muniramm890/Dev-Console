// @ts-nocheck
import { useState } from "react";
import { papi, explain, toast, ago } from "../api";
import { Chip, Modal, Field, CopyBox, useLoad } from "../ui";
import { MODULE_KEYS } from "../moduleKeys";
import { C } from "../../theme/theme";

const Section = ({ title, children }) => (<div className="card" style={{ marginBottom: 14 }}><h3 className="syne" style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>{title}</h3>{children}</div>);

export const SchoolDetail = ({ id, go, onOpen }) => {
  const d = useLoad(() => papi(`/schools/${id}`), [id]);
  const audit = useLoad(() => papi(`/audit?school_id=${id}&limit=15`), [id]);
  const [modal, setModal] = useState(null);       // { kind: 'block'|'suspend'|'unblock'|'delete'|'secret', ... }
  const [reason, setReason] = useState(""); const [message, setMessage] = useState(""); const [confirm, setConfirm] = useState("");
  const [form, setForm] = useState(null); const [mods, setMods] = useState(null); const [busy, setBusy] = useState(false);
  const s = d.data;
  if (d.loading && !s) return <div className="card">Loading...</div>;
  if (!s) return <div className="card" style={{ color: C.red }}>{d.err || "Not found"} <button className="btn btn-ghost" onClick={() => go("schools")}>Back</button></div>;
  const f = form || { name: s.name || "", phone: s.phone || "", email: s.email || "", city: s.city || "", state: s.state || "", plan: s.plan || "", valid_until: s.valid_until ? String(s.valid_until).slice(0, 10) : "", max_students: s.max_students ?? "", max_staff: s.max_staff ?? "" };
  const off = mods || s.disabled_modules || [];
  const run = async (fn, ok) => { setBusy(true); try { const r = await fn(); toast(ok); await d.reload(); audit.reload(); return r; } catch (e) { toast(explain(e), "err"); } finally { setBusy(false); } };

  const doStatus = () => run(async () => { await papi(`/schools/${id}/${modal.kind}`, "POST", { reason, message }); setModal(null); setReason(""); setMessage(""); }, "Done");
  const save = () => run(() => papi(`/schools/${id}`, "PUT", { ...f, max_students: f.max_students === "" ? null : Number(f.max_students), max_staff: f.max_staff === "" ? null : Number(f.max_staff), valid_until: f.valid_until || null }), "Saved");
  const saveMods = () => run(() => papi(`/schools/${id}/modules`, "PUT", { disabled: off }), "Modules updated");
  const resetPw = (uid) => run(async () => { const r = await papi(`/schools/${id}/reset-admin-password`, "POST", { user_id: uid }); setModal({ kind: "secret", title: "New admin password", lines: [["Email", r.email], ["Temporary password", r.temporary_password]] }); }, "Password reset");
  const doDelete = () => run(async () => { await papi(`/schools/${id}/delete`, "POST", { confirm_slug: confirm }); setModal(null); setConfirm(""); }, "School deleted");
  const set = (k) => (e) => setForm({ ...f, [k]: e.target.value });

  return (
    <div>
      <button className="btn btn-ghost" onClick={() => go("schools")} style={{ marginBottom: 10 }}>&larr; All schools</button>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="dc-row" style={{ justifyContent: "space-between" }}>
          <div><h2 className="syne" style={{ fontSize: 20, fontWeight: 800 }}>{s.name}</h2>
            <div style={{ fontSize: 12, color: C.textMuted }}>{s.slug} - {[s.city, s.state].filter(Boolean).join(", ")} - created {String(s.created_at).slice(0, 10)}</div></div>
          <Chip status={s.platform_status} deleted={!!s.deleted_at} />
        </div>
        <div className="dc-row" style={{ marginTop: 10, fontSize: 13 }}>
          <span><b>{s.students}</b> students</span><span><b>{s.staff}</b> staff</span><span>last login {ago(s.last_login_at)}</span>
          {(s.staff_by_role || []).map((r) => <span key={r.role} style={{ color: C.textMuted }}>{r.role}: {r.n}</span>)}
        </div>
        {s.platform_status !== "active" && <p style={{ marginTop: 10, fontSize: 13, color: C.yellow }}>Reason: {s.blocked_reason || "-"}{s.platform_message ? ` - School sees: "${s.platform_message}"` : ""}</p>}
        <div className="dc-row" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" disabled={!!s.deleted_at} onClick={() => onOpen({ id, name: s.name })}>Open school (Admin view)</button>
        </div>
      </div>

      <Section title="Access">
        <div className="dc-row">
          {s.platform_status !== "blocked" && <button className="btn btn-ghost" style={{ color: C.red }} onClick={() => setModal({ kind: "block" })}>Block (everything off)</button>}
          {s.platform_status !== "suspended" && <button className="btn btn-ghost" style={{ color: C.yellow }} onClick={() => setModal({ kind: "suspend" })}>Suspend (read-only)</button>}
          {s.platform_status !== "active" && <button className="btn btn-primary" onClick={() => setModal({ kind: "unblock" })}>Unblock</button>}
          <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => papi(`/schools/${id}/force-logout`, "POST"), "Everyone will be logged out")}>Force logout everyone</button>
        </div>
      </Section>

      <Section title="Plan, validity and limits">
        <div className="dc-grid" style={{ marginBottom: 0 }}>
          <Field label="Plan"><input className="input" value={f.plan} onChange={set("plan")} /></Field>
          <Field label="Valid until"><input className="input" type="date" value={f.valid_until} onChange={set("valid_until")} /></Field>
          <Field label="Max students"><input className="input" type="number" min="0" value={f.max_students} onChange={set("max_students")} /></Field>
          <Field label="Max staff"><input className="input" type="number" min="0" value={f.max_staff} onChange={set("max_staff")} /></Field>
        </div>
        <p style={{ fontSize: 12, color: C.textMuted }}>Saved for now; fee/validity enforcement will be added later.</p>
      </Section>

      <Section title="School details">
        <div className="dc-grid" style={{ marginBottom: 0 }}>
          {[["name", "Name"], ["phone", "Phone"], ["email", "Email"], ["city", "City"], ["state", "State"]].map(([k, l]) => <Field key={k} label={l}><input className="input" value={f[k]} onChange={set(k)} /></Field>)}
        </div>
        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={save}>Save changes</button>
      </Section>

      <Section title="Modules (untick to switch off for this school)">
        <div className="dc-grid" style={{ marginBottom: 8 }}>
          {MODULE_KEYS.map((k) => (<label key={k} className="dc-row" style={{ fontSize: 13 }}>
            <input type="checkbox" checked={!off.includes(k)} onChange={(e) => setMods(e.target.checked ? off.filter((x) => x !== k) : [...off, k])} /> {k}</label>))}
        </div>
        <button className="btn btn-primary" disabled={busy || !mods} onClick={saveMods}>Save modules</button>
      </Section>

      <Section title="School admins">
        {(s.admins || []).map((a) => (
          <div key={a.id} className="dc-row" style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
            <div><b>{a.full_name}</b> <span style={{ color: C.textMuted, fontSize: 12 }}>{a.email} - last login {ago(a.last_login_at)}</span></div>
            <button className="btn btn-ghost" disabled={busy} onClick={() => resetPw(a.id)}>Reset password</button>
          </div>))}
        {!s.admins?.length && <p style={{ color: C.textMuted }}>No admins.</p>}
      </Section>

      <Section title="Recent activity">
        {(audit.data || []).map((a) => <div key={a.id} style={{ fontSize: 12.5, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}><b>{a.action}</b> - {a.detail || ""} <span style={{ color: C.textMuted }}>({a.admin_email || "system"}, {ago(a.created_at)})</span></div>)}
        {!audit.data?.length && <p style={{ color: C.textMuted }}>Nothing yet.</p>}
      </Section>

      <Section title="Danger zone">
        {s.deleted_at
          ? <button className="btn btn-primary" onClick={() => run(() => papi(`/schools/${id}/restore`, "POST"), "Restored")}>Restore school</button>
          : <button className="btn btn-ghost" style={{ color: C.red }} onClick={() => setModal({ kind: "delete" })}>Delete school (data is kept)</button>}
      </Section>

      {modal && ["block", "suspend", "unblock"].includes(modal.kind) && (
        <Modal title={modal.kind === "unblock" ? "Unblock school" : modal.kind === "block" ? "Block school" : "Suspend school (read-only)"} onClose={() => setModal(null)}>
          {modal.kind !== "unblock" && <>
            <Field label="Reason (internal, required)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fees pending" /></Field>
            <Field label="Message shown to the school (optional)"><input className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please contact support" /></Field></>}
          {modal.kind === "unblock" && <p style={{ fontSize: 13 }}>The school will work normally again.</p>}
          <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy || (modal.kind !== "unblock" && reason.trim().length < 3)} onClick={doStatus}>Confirm</button>
        </Modal>)}
      {modal?.kind === "delete" && (
        <Modal title="Delete school" onClose={() => setModal(null)}>
          <p style={{ fontSize: 13 }}>The school stops working immediately. Data is kept and can be restored. Type <b>{s.slug}</b> to confirm.</p>
          <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy || confirm !== s.slug} onClick={doDelete}>Delete</button>
        </Modal>)}
      {modal?.kind === "secret" && (
        <Modal title={modal.title} onClose={() => setModal(null)}>
          <p style={{ fontSize: 12, color: C.yellow }}>Shown only once. Share it with the school admin securely.</p>
          {modal.lines.map(([l, v]) => <div key={l}><span className="dc-label">{l}</span><CopyBox text={v} /></div>)}
        </Modal>)}
    </div>
  );
};
