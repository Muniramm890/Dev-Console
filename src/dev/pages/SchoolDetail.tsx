// @ts-nocheck
import { useState } from "react";
import { papi, explain, toast, ago } from "../api";
import { Chip, Modal, Field, CopyBox, useLoad } from "../ui";
import { healthFlags, pct } from "../health";
import { MODULE_KEYS } from "../moduleKeys";
import { C } from "../../theme/theme";

const Section = ({ title, children }) => (<div className="card" style={{ marginBottom: 14 }}><h3 className="syne" style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>{title}</h3>{children}</div>);
const Usage = ({ label, n, max }) => {
  const p = pct(n, max), col = !max ? C.primary : p >= 100 ? C.red : p >= 85 ? C.yellow : C.green;
  return (<div style={{ marginBottom: 10 }}><div className="dc-row" style={{ justifyContent: "space-between", fontSize: 13 }}><span>{label}</span><b>{n}{max != null ? ` / ${max}` : " (no limit)"}</b></div>
    <div className="dc-bar"><i style={{ width: `${max ? p : 8}%`, background: col, opacity: max ? 1 : 0.35 }} /></div></div>);
};
const TABS = [["overview", "Overview"], ["users", "Users"], ["plan", "Plan & limits"], ["modules", "Modules"], ["activity", "Activity"], ["settings", "Settings"]];

export const SchoolDetail = ({ id, go, onOpen }) => {
  const d = useLoad(() => papi(`/schools/${id}`), [id]);
  const audit = useLoad(() => papi(`/audit?school_id=${id}&limit=40`), [id]);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState(""); const [message, setMessage] = useState(""); const [confirm, setConfirm] = useState("");
  const [form, setForm] = useState(null); const [mods, setMods] = useState(null); const [busy, setBusy] = useState(false); const [uq, setUq] = useState("");
  const users = useLoad(() => (tab === "users" ? papi(`/schools/${id}/users?q=${encodeURIComponent(uq)}`) : Promise.resolve(null)), [id, tab, uq]);
  const s = d.data;
  if (d.loading && !s) return <div className="card">Loading...</div>;
  if (!s) return <div className="card" style={{ color: C.red }}>{d.err || "Not found"} <button className="btn btn-ghost" onClick={() => go("schools")}>Back</button></div>;

  const f = form || { name: s.name || "", phone: s.phone || "", email: s.email || "", city: s.city || "", state: s.state || "", plan: s.plan || "", valid_until: s.valid_until ? String(s.valid_until).slice(0, 10) : "", max_students: s.max_students ?? "", max_staff: s.max_staff ?? "" };
  const off = mods || s.disabled_modules || [];
  const set = (k) => (e) => setForm({ ...f, [k]: e.target.value });
  const run = async (fn, ok) => { setBusy(true); try { const r = await fn(); toast(ok); await d.reload(); audit.reload(); return r; } catch (e) { toast(explain(e), "err"); } finally { setBusy(false); } };
  const payload = (over = {}) => ({ ...f, ...over, max_students: (over.max_students ?? f.max_students) === "" ? null : Number(over.max_students ?? f.max_students), max_staff: (over.max_staff ?? f.max_staff) === "" ? null : Number(over.max_staff ?? f.max_staff), valid_until: (over.valid_until !== undefined ? over.valid_until : f.valid_until) || null });
  const save = (over) => run(() => papi(`/schools/${id}`, "PUT", payload(over)), "Saved");
  const extend = (days) => { const base = f.valid_until && new Date(f.valid_until) > new Date() ? new Date(f.valid_until) : new Date(); base.setDate(base.getDate() + days); const v = base.toISOString().slice(0, 10); setForm({ ...f, valid_until: v }); save({ valid_until: v }); };
  const doStatus = () => run(async () => { await papi(`/schools/${id}/${modal.kind}`, "POST", { reason, message }); setModal(null); setReason(""); setMessage(""); }, "Done");
  const secret = (title, r) => setModal({ kind: "secret", title, lines: [["Email", r.email], ["Temporary password", r.temporary_password]] });
  const flags = healthFlags(s);

  return (
    <div>
      <button className="btn btn-ghost" onClick={() => go("schools")} style={{ marginBottom: 10 }}>&larr; All schools</button>
      <div className="card dc-school" style={{ cursor: "default", marginBottom: 14 }}>
        <div className="dc-stripe" style={{ background: s.deleted_at ? C.textMuted : s.platform_status === "blocked" ? C.red : s.platform_status === "suspended" ? C.yellow : C.green }} />
        <div className="dc-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 className="syne" style={{ fontSize: 21, fontWeight: 800 }}>{s.name}</h2>
            <div style={{ fontSize: 12.5, color: C.textMuted }}>{s.slug} - {[s.city, s.state].filter(Boolean).join(", ")} - since {String(s.created_at).slice(0, 10)}</div>
            <div className="dc-row" style={{ marginTop: 8 }}><Chip status={s.platform_status} deleted={!!s.deleted_at} />{flags.map(([t, c]) => <span key={t} className="dc-chip" style={{ background: `${c === "red" ? C.red : c === "yellow" ? C.yellow : C.textMuted}22`, color: c === "red" ? C.red : c === "yellow" ? C.yellow : C.textMuted }}>{t}</span>)}</div>
          </div>
          <button className="btn btn-primary" disabled={!!s.deleted_at} onClick={() => onOpen({ id, name: s.name })}>Open school</button>
        </div>
        {s.platform_status !== "active" && <p style={{ marginTop: 10, fontSize: 13, color: C.yellow }}>Reason: {s.blocked_reason || "-"}{s.platform_message ? ` - School sees: "${s.platform_message}"` : ""}</p>}
      </div>

      <div className="dc-tabs">{TABS.map(([k, l]) => <button key={k} className={`btn ${tab === k ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === "overview" && (
        <div className="dc-split">
          <Section title="Usage">
            <Usage label="Students" n={s.students} max={s.max_students} /><Usage label="Staff" n={s.staff} max={s.max_staff} />
            <div style={{ fontSize: 12.5, color: C.textMuted }}>Last login {ago(s.last_login_at)}{(s.staff_by_role || []).map((r) => ` - ${r.role}: ${r.n}`).join("")}</div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>Valid till: {s.valid_until ? String(s.valid_until).slice(0, 10) : "not set"} - Plan: {s.plan || "-"}</div>
          </Section>
          <Section title="Access control">
            <div className="dc-row">
              {s.platform_status !== "blocked" && <button className="btn btn-ghost" style={{ color: C.red }} onClick={() => setModal({ kind: "block" })}>Block (all off)</button>}
              {s.platform_status !== "suspended" && <button className="btn btn-ghost" style={{ color: C.yellow }} onClick={() => setModal({ kind: "suspend" })}>Suspend (read-only)</button>}
              {s.platform_status !== "active" && <button className="btn btn-primary" onClick={() => setModal({ kind: "unblock" })}>Unblock</button>}
              <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => papi(`/schools/${id}/force-logout`, "POST"), "Everyone will be logged out")}>Force logout everyone</button>
            </div>
          </Section>
          <Section title="School admins">
            {(s.admins || []).map((a) => (
              <div key={a.id} className="dc-row" style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <div><b>{a.full_name}</b><div style={{ color: C.textMuted, fontSize: 12 }}>{a.email} - {ago(a.last_login_at)}</div></div>
                <div className="dc-row">
                  <button className="btn btn-ghost" onClick={() => onOpen({ id, name: s.name, userId: a.id, userName: a.full_name })}>Open as</button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => run(async () => secret("New admin password", await papi(`/schools/${id}/users/${a.id}/reset-password`, "POST", {})), "Password reset")}>Reset</button>
                </div>
              </div>))}
            {!s.admins?.length && <p style={{ color: C.textMuted }}>No admins.</p>}
          </Section>
        </div>)}

      {tab === "users" && (
        <Section title="Staff of this school">
          <input className="input" placeholder="Search name, email, phone" value={uq} onChange={(e) => setUq(e.target.value)} style={{ marginBottom: 10 }} />
          {(users.data || []).map((u) => (
            <div key={u.id} className="dc-row" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ minWidth: 0 }}><b>{u.full_name}</b> <span className="dc-chip" style={{ background: `${C.primary}22`, color: C.primary }}>{u.role}</span>{!u.member_active || !u.user_active ? <span className="dc-chip" style={{ background: `${C.red}22`, color: C.red, marginLeft: 6 }}>inactive</span> : null}
                <div style={{ color: C.textMuted, fontSize: 12 }}>{u.email} {u.phone ? `- ${u.phone}` : ""} - last login {ago(u.last_login_at)}</div></div>
              <div className="dc-row">
                <button className="btn btn-ghost" onClick={() => onOpen({ id, name: s.name, userId: u.id, userName: u.full_name })}>Open as</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => run(async () => secret(`New password - ${u.full_name}`, await papi(`/schools/${id}/users/${u.id}/reset-password`, "POST", {})), "Password reset")}>Reset</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => papi(`/schools/${id}/users/${u.id}/logout`, "POST"), "Logged out everywhere")}>Logout</button>
              </div>
            </div>))}
          {!users.loading && !(users.data || []).length && <p style={{ color: C.textMuted }}>No users found.</p>}
        </Section>)}

      {tab === "plan" && (
        <div className="dc-split">
          <Section title="Validity">
            <div style={{ fontSize: 13, marginBottom: 8 }}>Valid until: <b>{f.valid_until || "not set"}</b></div>
            <div className="dc-row">{[[30, "+30 days"], [90, "+90 days"], [365, "+1 year"]].map(([n, l]) => <button key={n} className="btn btn-ghost" disabled={busy} onClick={() => extend(n)}>{l}</button>)}
              <button className="btn btn-ghost" disabled={busy} onClick={() => { setForm({ ...f, valid_until: "" }); save({ valid_until: "" }); }}>Clear</button></div>
            <Field label="Custom date"><input className="input" type="date" value={f.valid_until} onChange={set("valid_until")} /></Field>
          </Section>
          <Section title="Plan and limits">
            <div className="dc-grid" style={{ marginBottom: 0 }}>
              <Field label="Plan"><input className="input" value={f.plan} onChange={set("plan")} /></Field>
              <Field label="Max students"><input className="input" type="number" min="0" value={f.max_students} onChange={set("max_students")} /></Field>
              <Field label="Max staff"><input className="input" type="number" min="0" value={f.max_staff} onChange={set("max_staff")} /></Field>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={() => save()}>Save</button>
            <p style={{ fontSize: 12, color: C.textMuted }}>Saved now; enforcement (fees / limits) comes with the fee logic.</p>
          </Section>
        </div>)}

      {tab === "modules" && (
        <Section title="Modules (untick to switch off for this school)">
          <div className="dc-grid" style={{ marginBottom: 8 }}>{MODULE_KEYS.map((k) => (
            <label key={k} className="dc-row" style={{ fontSize: 13 }}><input type="checkbox" checked={!off.includes(k)} onChange={(e) => setMods(e.target.checked ? off.filter((x) => x !== k) : [...off, k])} /> {k}</label>))}</div>
          <button className="btn btn-primary" disabled={busy || !mods} onClick={() => run(() => papi(`/schools/${id}/modules`, "PUT", { disabled: off }), "Modules updated")}>Save modules</button>
        </Section>)}

      {tab === "activity" && (
        <Section title="Recent platform activity">
          {(audit.data || []).map((a) => <div key={a.id} style={{ fontSize: 12.5, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}><b>{a.action}</b> - {a.detail || ""} <span style={{ color: C.textMuted }}>({a.admin_email || "system"}, {ago(a.created_at)})</span></div>)}
          {!audit.data?.length && <p style={{ color: C.textMuted }}>Nothing yet.</p>}
        </Section>)}

      {tab === "settings" && (
        <div className="dc-split">
          <Section title="School details">
            <div className="dc-grid" style={{ marginBottom: 0 }}>{[["name", "Name"], ["phone", "Phone"], ["email", "Email"], ["city", "City"], ["state", "State"]].map(([k, l]) => <Field key={k} label={l}><input className="input" value={f[k]} onChange={set(k)} /></Field>)}</div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={() => save()}>Save changes</button>
          </Section>
          <Section title="Danger zone">
            {s.deleted_at ? <button className="btn btn-primary" onClick={() => run(() => papi(`/schools/${id}/restore`, "POST"), "Restored")}>Restore school</button>
              : <button className="btn btn-ghost" style={{ color: C.red }} onClick={() => setModal({ kind: "delete" })}>Delete school (data is kept)</button>}
          </Section>
        </div>)}

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
          <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy || confirm !== s.slug} onClick={() => run(async () => { await papi(`/schools/${id}/delete`, "POST", { confirm_slug: confirm }); setModal(null); setConfirm(""); }, "School deleted")}>Delete</button>
        </Modal>)}
      {modal?.kind === "secret" && (
        <Modal title={modal.title} onClose={() => setModal(null)}>
          <p style={{ fontSize: 12, color: C.yellow }}>Shown only once. Share it securely.</p>
          {modal.lines.map(([l, v]) => <div key={l}><span className="dc-label">{l}</span><CopyBox text={v} /></div>)}
        </Modal>)}
    </div>
  );
};
