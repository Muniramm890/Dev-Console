// @ts-nocheck
// School -> Billing tab: assign / change the plan, preview the next bill, generate invoice, see invoices and usage.
import { useState } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { papi, explain, toast } from "../api";
import { Modal, Field, useLoad } from "../ui";
import { InvoiceModal, StChip, inr, rup, toPaise, rangeText } from "./Billing";
import { C } from "../../theme/theme";

const TYPE = { monthly: "Monthly", yearly: "Yearly", payg: "Pay as you go" };
const dt = (d) => (d ? String(d).slice(0, 10) : "-");
const todayStr = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);

// tier-aware plan picker: shows the 3 plans (monthly / yearly / pay as you go) of the school's own tier, with the per-student monthly cost
const PLAN_ORDER = { monthly: 0, yearly: 1, payg: 2 };
const PlanPicker = ({ plans, students, value, onChange }) => {
  const tiered = plans.filter((p) => p.tier != null && p.is_active);
  const tiers = [...new Set(tiered.map((p) => p.tier))].sort();
  const info = (n) => { const p = tiered.find((x) => x.tier === n); return { n, name: p.tier_name || `Tier ${n}`, min: p.min_students ?? 0, max: p.max_students }; };
  const rec = tiers.map(info).find((t) => students >= t.min && (t.max == null || students <= t.max));
  const cur = plans.find((p) => p.id === value);
  const [tierSel, setTierSel] = useState(cur && cur.tier != null ? cur.tier : (rec ? rec.n : tiers[0]));
  const shown = tiered.filter((p) => p.tier === tierSel).sort((a, b) => PLAN_ORDER[a.plan_type] - PLAN_ORDER[b.plan_type]);
  const custom = plans.filter((p) => p.tier == null && (p.is_active || p.id === value));
  const note = (p) => (p.plan_type === "yearly" ? `About ${inr(students * p.student_rate_paise * 12)} per year for ${students} students` : `About ${inr(students * p.student_rate_paise)} per month for ${students} students${p.plan_type === "payg" ? ", billed after the month" : ""}`);
  return (
    <div style={{ marginBottom: 8 }}>
      <span className="dc-label">Plan</span>
      {tiers.length > 0 ? (
        <>
          <div className="dc-row" style={{ margin: "6px 0 10px" }}>
            {tiers.map(info).map((t) => (
              <button key={t.n} type="button" className={`btn ${tierSel === t.n ? "btn-primary" : "btn-ghost"}`} onClick={() => setTierSel(t.n)}>
                {t.name}{rec && rec.n === t.n ? " (this school)" : ""}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{students} active students now{rec ? ` - fits ${rec.name} (${rangeText(rec.min, rec.max)})` : ""}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {shown.map((p) => (
              <div key={p.id} onClick={() => onChange(p.id)} className="card" style={{ cursor: "pointer", border: `2px solid ${value === p.id ? C.primary : C.border}`, background: value === p.id ? `${C.primary}12` : undefined, padding: 12 }}>
                <div className="dc-row" style={{ justifyContent: "space-between" }}>
                  <b>{TYPE[p.plan_type]}</b>
                  <span><b className="syne" style={{ fontSize: 17, color: C.primary }}>{inr(p.student_rate_paise)}</b> <span style={{ fontSize: 11.5, color: C.textMuted }}>per student / month</span></span>
                </div>
                <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 4 }}>{note(p)}</div>
              </div>
            ))}
            {!shown.length && <div style={{ fontSize: 12.5, color: C.textMuted }}>No active plans in this tier.</div>}
          </div>
        </>
      ) : <div style={{ fontSize: 12.5, color: C.textMuted, margin: "6px 0" }}>No tier plans are set up yet (Billing, Plans). You can still pick a custom plan below.</div>}
      {custom.length > 0 && (
        <select className="select" style={{ marginTop: 10 }} value={cur && cur.tier == null ? value : ""} onChange={(e) => e.target.value && onChange(e.target.value)}>
          <option value="">Or choose a custom plan...</option>
          {custom.map((p) => <option key={p.id} value={p.id}>{p.name} ({TYPE[p.plan_type]})</option>)}
        </select>
      )}
    </div>
  );
};

export const SchoolBilling = ({ id }) => {
  const d = useLoad(() => papi(`/schools/${id}/billing`), [id]);
  const plans = useLoad(() => papi("/billing/plans"), []);
  const [f, setF] = useState(null); const [inv, setInv] = useState(null); const [busy, setBusy] = useState(false); const [ask, setAsk] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const data = d.data; const b = data && data.billing;
  const run = async (fn, ok) => { setBusy(true); try { await fn(); toast(ok); setAsk(null); setF(null); await d.reload(); } catch (e) { toast(explain(e), "err"); } finally { setBusy(false); } };

  const open = () => setF(b
    ? { plan_id: b.plan_id, discount_pct: String(b.discount_pct), auto_renew: b.auto_renew, student: rup(b.student_rate_override), staff: rup(b.staff_rate_override), base: rup(b.base_fee_override), notes: b.notes || "" }
    : { plan_id: "", started_on: todayStr(), trial_days: "0", discount_pct: "0", auto_renew: true, student: "", staff: "", base: "", notes: "", generate_invoice: false });
  const save = () => run(() => papi(`/schools/${id}/billing`, "PUT", {
    plan_id: f.plan_id || undefined, discount_pct: Number(f.discount_pct) || 0, auto_renew: f.auto_renew,
    student_rate_override: toPaise(f.student), staff_rate_override: toPaise(f.staff), base_fee_override: toPaise(f.base), notes: f.notes,
    ...(b ? {} : { started_on: f.started_on, trial_days: Number(f.trial_days) || 0, generate_invoice: !!f.generate_invoice }),
  }), "Billing saved");

  if (d.err) return <div className="card" style={{ color: C.red }}>{d.err}</div>;
  if (!data) return <p style={{ color: C.textMuted }}>Loading...</p>;
  const counts = data.counts || {}; const lim = data.limits || {};
  const pv = data.preview; const usage = (data.usage || []).slice().reverse().map((u) => ({ name: String(u.usage_date).slice(5, 10), Students: u.active_students, Staff: u.active_staff }));
  const activePlans = (plans.data || []).filter((p) => p.is_active || (b && p.id === b.plan_id));

  return (
    <>
      <div className="dc-split" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="dc-row" style={{ justifyContent: "space-between" }}>
            <b className="syne" style={{ fontSize: 15 }}>{b ? "Plan" : "No plan (legacy school)"}</b>
            {b && <StChip s={b.status} />}
          </div>
          {b ? (
            <>
              <span className="dc-label">Plan</span><div style={{ fontWeight: 700 }}>{b.plan_title} <span style={{ color: C.textMuted, fontWeight: 500 }}>({TYPE[b.plan_type]})</span></div>
              <span className="dc-label">Started</span><div>{dt(b.started_on)}{b.trial_until ? ` | trial until ${dt(b.trial_until)}` : ""}</div>
              <span className="dc-label">Current cycle</span><div>{b.period_start ? `${dt(b.period_start)} to ${dt(b.period_end)}` : "No invoice yet"}</div>
              <span className="dc-label">Billed headcount (last invoice)</span><div>{b.billed_students ?? "-"} students | {b.billed_staff ?? "-"} staff</div>
              {b.grace_until && <><span className="dc-label">Grace until</span><div style={{ color: C.yellow }}>{dt(b.grace_until)}</div></>}
              {b.auto_suspended && <div style={{ color: C.red, fontSize: 12.5, marginTop: 8 }}>This school is read-only because of an overdue invoice. It lifts after payment.</div>}
              {(b.student_rate_override != null || b.staff_rate_override != null || b.base_fee_override != null || b.discount_pct > 0) && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>Custom pricing: {b.student_rate_override != null ? `student ${inr(b.student_rate_override)}; ` : ""}{b.staff_rate_override != null ? `staff ${inr(b.staff_rate_override)}; ` : ""}{b.base_fee_override != null ? `base ${inr(b.base_fee_override)}; ` : ""}{b.discount_pct > 0 ? `${b.discount_pct}% discount` : ""}</div>}
              {b.notes && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Note: {b.notes}</div>}
            </>
          ) : (
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>This school runs as before: no invoices and no restrictions. Assign a plan to start billing.</p>
          )}
          <div className="dc-row" style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={open}>{b ? "Edit plan" : "Start billing"}</button>
            {b && b.status !== "cancelled" && <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => papi(`/schools/${id}/billing/invoice`, "POST"), "Invoice step done")}>Generate invoice now</button>}
            {b && b.status !== "cancelled" && <button className="btn btn-ghost" onClick={() => setAsk("cancel")}>Stop billing</button>}
            {b && b.status === "cancelled" && <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => papi(`/schools/${id}/billing`, "PUT", { status: "active" }), "Billing resumed")}>Resume billing</button>}
            {b && <button className="btn btn-ghost" style={{ color: C.red }} onClick={() => setAsk("remove")}>Remove (back to legacy)</button>}
          </div>
        </div>
        <div className="card">
          <b className="syne" style={{ fontSize: 15 }}>Active headcount now</b>
          <div className="dc-grid" style={{ margin: "10px 0 0" }}>
            <div className="card dc-kpi" style={{ "--k": C.blue }}><b>{counts.students ?? 0}</b><span>Students{lim.max_students ? ` (limit ${lim.max_students})` : ""}</span></div>
            <div className="card dc-kpi" style={{ "--k": C.purple }}><b>{counts.staff ?? 0}</b><span>Staff{lim.max_staff ? ` (limit ${lim.max_staff})` : ""}</span></div>
          </div>
          <div style={{ fontSize: 12, color: C.textMuted }}>Active = enabled and not deleted. Limits are shown in the "Plan &amp; limits" tab.</div>
          {usage.length > 1 && (
            <div style={{ height: 150, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%"><LineChart data={usage}><CartesianGrid strokeDasharray="3 3" stroke={`${C.border}88`} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: C.textMuted }} interval="preserveStartEnd" /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: C.textMuted }} width={34} /><Tooltip />
                <Line type="monotone" dataKey="Students" stroke={C.blue} dot={false} /><Line type="monotone" dataKey="Staff" stroke={C.purple} dot={false} /></LineChart></ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {b && pv && (
        <div className="card" style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px" }}>
            <b className="syne" style={{ fontSize: 14 }}>Next bill (estimate)</b>
            {pv.error ? <div style={{ color: C.red, fontSize: 12.5, marginTop: 4 }}>{pv.error}</div> : <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{dt(pv.period_start)} to {dt(pv.period_end)} | {pv.students} students, {pv.staff} staff</div>}
          </div>
          {!pv.error && (
            <div className="scroll-x"><table className="table"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>{pv.lines.map((l, i) => <tr key={i}><td style={{ fontSize: 12.5 }}>{l.description}</td><td>{l.qty}</td><td>{inr(l.unit_paise)}</td><td style={{ color: l.amount_paise < 0 ? C.green : undefined }}>{inr(l.amount_paise)}</td></tr>)}
                <tr><td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Total</td><td style={{ fontWeight: 800 }}>{inr(pv.total_paise)}</td></tr></tbody></table></div>
          )}
        </div>
      )}

      {b && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px" }}><b className="syne" style={{ fontSize: 14 }}>Recent invoices</b></div>
          {(data.invoices || []).length ? (
            <div className="scroll-x"><table className="table"><thead><tr><th>Invoice</th><th>Period</th><th>Status</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead>
              <tbody>{data.invoices.map((r) => <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => setInv(r.id)}><td className="dc-mono">{r.invoice_no}</td><td style={{ fontSize: 12 }}>{dt(r.period_start)} to {dt(r.period_end)}</td><td><StChip s={r.status} /></td><td>{inr(r.total_paise)}</td><td>{inr(r.paid_paise)}</td><td style={{ fontSize: 12 }}>{dt(r.due_date)}</td></tr>)}</tbody></table></div>
          ) : <p style={{ padding: "0 14px 14px", color: C.textMuted }}>No invoices yet.</p>}
        </div>
      )}

      {f && (
        <Modal title={b ? "Edit plan" : "Start billing"} onClose={() => setF(null)}>
          <PlanPicker plans={plans.data || []} students={counts.students || 0} value={f.plan_id} onChange={(pid) => setF({ ...f, plan_id: pid })} />
          {!b && <div className="dc-grid" style={{ marginBottom: 0 }}><Field label="Start date"><input className="input" type="date" value={f.started_on} onChange={set("started_on")} /></Field><Field label="Free trial (days)"><input className="input" inputMode="numeric" value={f.trial_days} onChange={set("trial_days")} /></Field></div>}
          <div className="dc-grid" style={{ marginBottom: 0 }}>
            <Field label="Discount (%)"><input className="input" inputMode="decimal" value={f.discount_pct} onChange={set("discount_pct")} /></Field>
            <Field label="Student rate / month (blank = plan)"><input className="input" inputMode="decimal" value={f.student} onChange={set("student")} /></Field>
            <Field label="Staff rate / month (blank = plan)"><input className="input" inputMode="decimal" value={f.staff} onChange={set("staff")} /></Field>
            <Field label="Base fee / month (blank = plan)"><input className="input" inputMode="decimal" value={f.base} onChange={set("base")} /></Field>
          </div>
          <Field label="Internal note"><input className="input" value={f.notes} onChange={set("notes")} /></Field>
          <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}><input type="checkbox" checked={f.auto_renew} onChange={set("auto_renew")} /> Auto-renew (keep creating invoices)</label>
          {!b && <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}><input type="checkbox" checked={f.generate_invoice} onChange={set("generate_invoice")} /> Create the first invoice now (skipped during a trial)</label>}
          <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy || (!b && !f.plan_id)} onClick={save}>{busy ? "Saving..." : "Save"}</button>
        </Modal>
      )}
      {ask && (
        <Modal title={ask === "remove" ? "Remove billing" : "Stop billing"} onClose={() => setAsk(null)}>
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>{ask === "remove" ? "The school goes back to the legacy mode (no billing). Old invoices are kept. A read-only state caused by billing is lifted." : "No new invoices will be created. You can resume later."}</p>
          <button className="btn btn-danger" disabled={busy} onClick={() => run(() => (ask === "remove" ? papi(`/schools/${id}/billing/remove`, "POST") : papi(`/schools/${id}/billing`, "PUT", { status: "cancelled" })), ask === "remove" ? "Billing removed" : "Billing stopped")}>{busy ? "Working..." : "Confirm"}</button>
        </Modal>
      )}
      {inv && <InvoiceModal id={inv} onClose={() => setInv(null)} onChanged={d.reload} />}
    </>
  );
};
