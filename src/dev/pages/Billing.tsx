// @ts-nocheck
// Console -> Billing: overview, plans, invoices, rates & charges. Talks to /platform/billing/* (backend branch billing-plans).
import { useEffect, useState } from "react";
import { openPdf as openViewer } from "../../utils/openDocument";
import { papi, getToken, ago, explain, toast } from "../api";
import { API_BASE_URL } from "../../api/client";
import { Modal, Field, useLoad } from "../ui";
import { SchoolList } from "./Whatsapp";
import { C } from "../../theme/theme";

export const inr = (p) => `\u20B9${(Number(p || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const rup = (p) => (p == null ? "" : String(Number(p) / 100));                 // paise -> rupees (text)
export const toPaise = (v) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100));
const TYPE = { monthly: "Monthly", yearly: "Yearly", payg: "Pay as you go" };
const ST_COL = { paid: C.green, issued: C.blue, overdue: C.red, void: C.textMuted, active: C.green, trial: C.blue, grace: C.yellow, cancelled: C.textMuted };
export const StChip = ({ s }) => { const col = ST_COL[s] || C.textMuted; return <span className="dc-chip" style={{ background: `${col}22`, color: col }}>{s}</span>; };
const qs = (o) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null))).toString();
const dt = (d) => (d ? String(d).slice(0, 10) : "-");

// opens in the same in-app PDF viewer the Admin app uses (pdf.js, zoom, download), instead of a new browser tab
export const openPdf = async (path, name = "Invoice.pdf", title = "Invoice") => {
  try {
    const res = await fetch(`${API_BASE_URL}/platform${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) throw new Error(`Could not open the PDF (${res.status})`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    openViewer({ url: `generated://${Date.now()}`, name, title, mime: "application/pdf", bytes });
  } catch (e) { toast(e.message || "Could not open the PDF", "err"); }
};

// ---------- invoice detail (also used from a school's Billing tab) ----------
export const InvoiceModal = ({ id, onClose, onChanged }) => {
  const r = useLoad(() => papi(`/billing/invoices/${id}`), [id]);
  const [mode, setMode] = useState(null); const [busy, setBusy] = useState(false);
  const [pay, setPay] = useState({ amount: "", method: "bank", reference: "", paid_on: "" }); const [reason, setReason] = useState("");
  const d = r.data; const inv = d && d.invoice;
  const balance = inv ? inv.total_paise - inv.paid_paise : 0;
  const run = async (fn, ok) => { setBusy(true); try { await fn(); toast(ok); setMode(null); await r.reload(); if (onChanged) onChanged(); } catch (e) { toast(explain(e), "err"); } finally { setBusy(false); } };
  return (
    <Modal title={inv ? `Invoice ${inv.invoice_no}` : "Invoice"} onClose={onClose} wide>
      {r.loading && !d && <p style={{ color: C.textMuted }}>Loading...</p>}
      {r.err && <p style={{ color: C.red }}>{r.err}</p>}
      {inv && (
        <>
          <div className="dc-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div><b>{inv.school_name}</b><div style={{ fontSize: 12, color: C.textMuted }}>{inv.plan_title} | {dt(inv.period_start)} to {dt(inv.period_end)} | due {dt(inv.due_date)}</div></div>
            <StChip s={inv.status} />
          </div>
          <div className="scroll-x"><table className="table">
            <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>{d.lines.map((l, i) => <tr key={i}><td style={{ fontSize: 12.5 }}>{l.description}</td><td>{l.qty}</td><td>{inr(l.unit_paise)}</td><td style={{ color: l.amount_paise < 0 ? C.green : undefined }}>{inr(l.amount_paise)}</td></tr>)}</tbody>
          </table></div>
          <div style={{ textAlign: "right", fontSize: 13, lineHeight: 1.8, marginTop: 8 }}>
            <div>Total <b>{inr(inv.total_paise)}</b></div><div>Paid {inr(inv.paid_paise)}</div><div>Balance <b style={{ color: balance > 0 ? C.red : C.green }}>{inr(balance)}</b></div>
          </div>
          {d.payments.length > 0 && (
            <div style={{ marginTop: 10 }}><span className="dc-label">Payments</span>
              {d.payments.map((p, i) => <div key={i} style={{ fontSize: 12.5, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>{inr(p.amount_paise)} | {p.gateway}{p.method ? ` / ${p.method}` : ""} | {p.status} | {p.paid_at ? ago(p.paid_at) : "pending"}{p.reference ? ` | ${p.reference}` : ""}</div>)}
            </div>
          )}
          {inv.void_reason && <p style={{ fontSize: 12, color: C.textMuted }}>Void reason: {inv.void_reason}</p>}
          <div className="dc-row" style={{ marginTop: 14 }}>
            <button className="btn btn-ghost" onClick={() => openPdf(`/billing/invoices/${id}/pdf`, `${inv.invoice_no}.pdf`, `Invoice ${inv.invoice_no}`)}>Open PDF</button>
            {inv.status !== "void" && balance > 0 && <button className="btn btn-primary" onClick={() => { setPay({ amount: rup(balance), method: "bank", reference: "", paid_on: "" }); setMode("pay"); }}>Record payment</button>}
            {inv.status !== "void" && inv.paid_paise === 0 && <button className="btn btn-ghost" style={{ color: C.red }} onClick={() => setMode("void")}>Void</button>}
          </div>
          {mode === "pay" && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="dc-grid" style={{ marginBottom: 0 }}>
                <Field label="Amount (INR)"><input className="input" inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
                <Field label="Method"><select className="select" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{["bank", "upi", "cash", "cheque", "other"].map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
                <Field label="Reference / UTR"><input className="input" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></Field>
                <Field label="Paid on"><input className="input" type="date" value={pay.paid_on} onChange={(e) => setPay({ ...pay, paid_on: e.target.value })} /></Field>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy || !(toPaise(pay.amount) > 0)} onClick={() => run(() => papi(`/billing/invoices/${id}/payments`, "POST", { amount_paise: toPaise(pay.amount), method: pay.method, reference: pay.reference, paid_on: pay.paid_on || undefined }), "Payment recorded")}>{busy ? "Saving..." : "Save payment"}</button>
            </div>
          )}
          {mode === "void" && (
            <div className="card" style={{ marginTop: 12 }}>
              <Field label="Reason (required)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
              <button className="btn btn-danger" style={{ marginTop: 12 }} disabled={busy || reason.trim().length < 3} onClick={() => run(() => papi(`/billing/invoices/${id}/void`, "POST", { reason }), "Invoice voided")}>{busy ? "Working..." : "Void invoice"}</button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

// ---------- overview ----------
const Overview = ({ go }) => {
  const o = useLoad(() => papi("/billing/overview"), []);
  const [inv, setInv] = useState(null); const [busy, setBusy] = useState(false);
  const d = o.data;
  const runNow = async () => { setBusy(true); try { const r = await papi("/billing/run", "POST", {}); toast(`Job done: ${r.invoices} invoices, ${r.overdue} overdue, ${r.suspended} suspended`); o.reload(); } catch (e) { toast(explain(e), "err"); } finally { setBusy(false); } };
  if (o.err) return <div className="card" style={{ color: C.red }}>{o.err}</div>;
  if (!d) return <p style={{ color: C.textMuted }}>Loading...</p>;
  const cards = [["Schools billed", d.schools_billed, C.blue], ["On trial", d.schools_on_trial, C.purple], ["Late (grace / overdue)", d.schools_late, C.red], ["Collected, last 30 days", inr(d.collected_30d_paise), C.green]];
  return (
    <>
      <div className="dc-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, color: C.textMuted }}>Schools without a plan are legacy: no bills, no restrictions.</span>
        <button className="btn btn-ghost" disabled={busy} onClick={runNow}>{busy ? "Running..." : "Run billing job now"}</button>
      </div>
      <div className="dc-grid">{cards.map(([l, v, c]) => <div key={l} className="card dc-kpi" style={{ "--k": c }}><b>{v}</b><span>{l}</span></div>)}</div>
      <div className="dc-split" style={{ marginBottom: 14 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px" }}><b className="syne" style={{ fontSize: 14 }}>Invoices, last 12 months</b></div>
          <div className="scroll-x"><table className="table"><thead><tr><th>Status</th><th>Count</th><th>Total</th><th>Paid</th><th>Outstanding</th></tr></thead>
            <tbody>{d.invoices_by_status.map((r) => <tr key={r.status}><td><StChip s={r.status} /></td><td>{r.count}</td><td>{inr(r.total_paise)}</td><td>{inr(r.paid_paise)}</td><td>{inr(r.total_paise - r.paid_paise)}</td></tr>)}</tbody></table></div>
          {!d.invoices_by_status.length && <p style={{ padding: "0 14px 14px", color: C.textMuted }}>No invoices yet.</p>}
        </div>
        <div className="card">
          <b className="syne" style={{ fontSize: 14 }}>Schools by plan</b>
          {d.plans.map((p, i) => <div key={i} className="dc-row" style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}><span>{p.name} <span style={{ color: C.textMuted, fontSize: 11.5 }}>{TYPE[p.plan_type]}</span></span><b>{p.schools}</b></div>)}
          {!d.plans.length && <p style={{ color: C.textMuted, marginTop: 8 }}>No school has a plan yet. Create plans, then assign them from a school's Billing tab.</p>}
        </div>
      </div>
      <div className="dc-split">
        <div className="card">
          <b className="syne" style={{ fontSize: 14 }}>Overdue invoices</b>
          {d.overdue.map((r) => <div key={r.id} className="dc-row" style={{ justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => setInv(r.id)}><span><b style={{ fontSize: 12.5 }}>{r.school_name}</b><div style={{ fontSize: 11.5, color: C.textMuted }}>{r.invoice_no} | due {dt(r.due_date)}</div></span><b style={{ color: C.red }}>{inr(r.total_paise - r.paid_paise)}</b></div>)}
          {!d.overdue.length && <p style={{ color: C.textMuted, marginTop: 8 }}>Nothing overdue.</p>}
        </div>
        <div className="card">
          <b className="syne" style={{ fontSize: 14 }}>Renewals in the next 14 days</b>
          {d.renewals.map((r) => <div key={r.school_id} className="dc-row" style={{ justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => go(`school@billing:${r.school_id}`)}><b style={{ fontSize: 12.5 }}>{r.school_name}</b><span style={{ fontSize: 12, color: C.textMuted }}>{TYPE[r.plan_type]} | ends {dt(r.period_end)}</span></div>)}
          {!d.renewals.length && <p style={{ color: C.textMuted, marginTop: 8 }}>No renewals due.</p>}
        </div>
      </div>
      {inv && <InvoiceModal id={inv} onClose={() => setInv(null)} onChanged={o.reload} />}
    </>
  );
};

// ---------- plans: 3 student tiers x (monthly, yearly, pay as you go) + custom plans ----------
const TIER_DEFAULTS = [
  { n: 1, name: "Tier 1", min: 0, max: 1000, ref: 700 },
  { n: 2, name: "Tier 2", min: 1001, max: 10000, ref: 7000 },
  { n: 3, name: "Tier 3", min: 10001, max: null, ref: 10000 },
];
const PT = [["monthly", "Monthly", "month"], ["yearly", "Yearly", "year"], ["payg", "Pay as you go", "month"]];
const n0 = (v) => Number(v || 0).toLocaleString("en-IN");
export const rangeText = (min, max) => (max == null || max === "" ? `Above ${n0(Math.max(0, Number(min) - 1))} students` : `${n0(min)} to ${n0(max)} students`);

const tierForm = (def, plans) => {
  const mine = plans.filter((p) => p.tier === def.n);
  const by = (t) => mine.find((p) => p.plan_type === t);
  const m = by("monthly"); const y = by("yearly"); const g = by("payg"); const any = m || y || g;
  return {
    name: any ? (any.tier_name || def.name) : def.name,
    min: String(any ? (any.min_students ?? def.min) : def.min),
    max: any ? (any.max_students == null ? "" : String(any.max_students)) : (def.max == null ? "" : String(def.max)),
    ref: String(any ? (any.ref_students || def.ref) : def.ref),
    monthly: m && m.ref_price_paise != null ? rup(m.ref_price_paise) : "",
    yearly: y && y.ref_price_paise != null ? rup(y.ref_price_paise) : "",
    payg: g && g.ref_price_paise != null && m && g.ref_price_paise !== m.ref_price_paise ? rup(g.ref_price_paise) : "",
    staff: any ? rup(any.staff_rate_paise) : "",
    active: { monthly: m ? m.is_active : true, yearly: y ? y.is_active : true, payg: g ? g.is_active : true },
    schools: mine.reduce((a, p) => a + (p.schools || 0), 0), saved: !!any,
  };
};

const TierCard = ({ def, plans, onSaved }) => {
  const [f, setF] = useState(() => tierForm(def, plans)); const [busy, setBusy] = useState(false);
  useEffect(() => { setF(tierForm(def, plans)); }, [plans]); // eslint-disable-line
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ref = Math.max(1, Number(f.ref) || 1);
  const price = (t) => toPaise(t === "payg" && f.payg === "" ? f.monthly : f[t]);
  const perStudent = (t) => { const p = price(t); return p == null ? null : (t === "yearly" ? p / 12 : p) / ref; };
  const mPer = perStudent("monthly"); const yPer = perStudent("yearly");
  const saving = mPer && yPer ? Math.round((1 - yPer / mPer) * 1000) / 10 : null;
  const save = async () => {
    if (!(price("monthly") > 0) || !(price("yearly") > 0)) { toast("Enter the monthly and the yearly price first", "err"); return; }
    setBusy(true);
    try {
      await papi(`/billing/tiers/${def.n}`, "PUT", {
        tier_name: f.name, min_students: Number(f.min) || 0, max_students: f.max === "" ? null : Number(f.max), ref_students: ref,
        monthly_price_paise: price("monthly"), yearly_price_paise: price("yearly"), payg_price_paise: price("payg"), staff_rate_paise: toPaise(f.staff) || 0, active: f.active,
      });
      toast(`${f.name} saved`); onSaved();
    } catch (e) { toast(explain(e), "err"); } finally { setBusy(false); }
  };
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="dc-row" style={{ justifyContent: "space-between", flexWrap: "wrap", marginBottom: 10 }}>
        <div className="dc-row"><span className="dc-chip" style={{ background: `${C.primary}22`, color: C.primary }}>Tier {def.n}</span><b className="syne" style={{ fontSize: 15 }}>{f.name}</b><span style={{ fontSize: 12.5, color: C.textMuted }}>{rangeText(f.min, f.max)}</span></div>
        <span style={{ fontSize: 12, color: C.textMuted }}>{f.saved ? `${f.schools} school${f.schools === 1 ? "" : "s"} on this tier` : "Not saved yet"}</span>
      </div>
      <div className="dc-grid" style={{ marginBottom: 12 }}>
        <Field label="Tier name"><input className="input" value={f.name} onChange={set("name")} /></Field>
        <Field label="From (students)"><input className="input" inputMode="numeric" value={f.min} onChange={set("min")} /></Field>
        <Field label="To (blank = no limit)"><input className="input" inputMode="numeric" value={f.max} onChange={set("max")} /></Field>
        <Field label="Reference students"><input className="input" inputMode="numeric" value={f.ref} onChange={set("ref")} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
        {PT.map(([t, label, unit]) => {
          const per = perStudent(t);
          return (
            <div key={t} className="card" style={{ background: C.surfaceAlt, opacity: f.active[t] ? 1 : 0.55 }}>
              <div className="dc-row" style={{ justifyContent: "space-between" }}>
                <b>{label}</b>
                <label style={{ fontSize: 11.5, display: "flex", gap: 5, alignItems: "center" }}><input type="checkbox" checked={f.active[t]} onChange={(e) => setF({ ...f, active: { ...f.active, [t]: e.target.checked } })} /> Offered</label>
              </div>
              <Field label={`Price for ${n0(ref)} students (INR / ${unit})`}>
                <input className="input" inputMode="decimal" value={f[t]} placeholder={t === "payg" ? "Blank = same as monthly" : ""} onChange={set(t)} />
              </Field>
              <div style={{ marginTop: 10 }}>
                <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: C.primary }}>{per != null ? inr(per) : "-"}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted }}>per student / month</div>
              </div>
              {t === "yearly" && saving != null && <div style={{ fontSize: 12, marginTop: 6, color: saving >= 0 ? C.green : C.red }}>{saving >= 0 ? `${saving}% cheaper than monthly` : `${Math.abs(saving)}% costlier than monthly`}</div>}
              {t === "payg" && <div style={{ fontSize: 11.5, marginTop: 6, color: C.textMuted }}>Billed after the month on the daily average of active students.</div>}
            </div>
          );
        })}
      </div>
      <div className="dc-row" style={{ marginTop: 14, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="dc-row" style={{ alignItems: "flex-end" }}>
          <Field label="Per staff / month (optional, INR)"><input className="input" style={{ width: 170 }} inputMode="decimal" value={f.staff} onChange={set("staff")} placeholder="0 = staff included" /></Field>
        </div>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Saving..." : `Save ${f.name}`}</button>
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 1.6 }}>Per-student cost = price / reference students (yearly price / 12). Integrations (WhatsApp, email, SMS) are charged extra on actual use, set in Rates &amp; charges. New rates apply from the next invoice.</div>
    </div>
  );
};

const EMPTY_PLAN = { code: "", name: "", plan_type: "monthly", student: "", staff: "", base: "", min: "", discount: "0", description: "", is_active: true };
const Plans = () => {
  const l = useLoad(() => papi("/billing/plans"), []);
  const [f, setF] = useState(null); const [editId, setEditId] = useState(null); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const all = l.data || []; const custom = all.filter((p) => p.tier == null);
  const open = (p) => { setEditId(p ? p.id : null); setF(p ? { code: p.code, name: p.name, plan_type: p.plan_type, student: rup(p.student_rate_paise), staff: rup(p.staff_rate_paise), base: rup(p.base_fee_paise), min: rup(p.min_fee_paise), discount: String(p.yearly_discount_pct), description: p.description || "", is_active: p.is_active } : EMPTY_PLAN); };
  const save = async () => {
    setBusy(true);
    try {
      const body = { name: f.name, plan_type: f.plan_type, student_rate_paise: toPaise(f.student) || 0, staff_rate_paise: toPaise(f.staff) || 0, base_fee_paise: toPaise(f.base) || 0, min_fee_paise: toPaise(f.min) || 0, yearly_discount_pct: f.plan_type === "yearly" ? Number(f.discount) || 0 : 0, description: f.description, is_active: f.is_active };
      if (editId) await papi(`/billing/plans/${editId}`, "PUT", body); else await papi("/billing/plans", "POST", { ...body, code: f.code });
      toast(editId ? "Plan updated" : "Plan created"); setF(null); l.reload();
    } catch (e) { toast(explain(e), "err"); } finally { setBusy(false); }
  };
  const toggle = async (p) => { try { await papi(`/billing/plans/${p.id}`, "PUT", { is_active: !p.is_active }); l.reload(); } catch (e) { toast(explain(e), "err"); } };
  return (
    <>
      <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
        Schools are grouped into 3 tiers by their number of active students. Enter the price for the reference number of students; the per-student cost is worked out for you. Each tier has a Monthly, a Yearly and a Pay-as-you-go plan, and a school sees the plans of its own tier.
      </div>
      {l.err && <div className="card" style={{ color: C.red, marginBottom: 12 }}>{l.err}</div>}
      {l.loading && !l.data ? <p style={{ color: C.textMuted }}>Loading...</p> : TIER_DEFAULTS.map((def) => <TierCard key={def.n} def={def} plans={all} onSaved={l.reload} />)}

      <div className="dc-row" style={{ justifyContent: "space-between", margin: "22px 0 10px" }}>
        <div><b className="syne" style={{ fontSize: 15 }}>Custom plans</b><div style={{ fontSize: 12, color: C.textMuted }}>Special deals outside the tiers (own rates, base fee, minimum fee). Optional.</div></div>
        <button className="btn btn-ghost" onClick={() => open(null)}>+ Custom plan</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {!custom.length ? <p style={{ padding: 16, color: C.textMuted }}>No custom plans.</p> : (
          <div className="scroll-x"><table className="table">
            <thead><tr><th>Plan</th><th>Type</th><th>Per student</th><th>Per staff</th><th>Base</th><th>Min.</th><th>Schools</th><th /></tr></thead>
            <tbody>{custom.map((p) => (
              <tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.55 }}>
                <td><b style={{ fontSize: 12.5 }}>{p.name}</b><div className="dc-mono" style={{ fontSize: 11 }}>{p.code}{p.is_active ? "" : " (archived)"}</div></td>
                <td>{TYPE[p.plan_type]}{p.plan_type === "yearly" && p.yearly_discount_pct ? ` (-${p.yearly_discount_pct}%)` : ""}</td>
                <td>{inr(p.student_rate_paise)}</td><td>{inr(p.staff_rate_paise)}</td><td>{inr(p.base_fee_paise)}</td><td>{inr(p.min_fee_paise)}</td><td>{p.schools}</td>
                <td className="dc-row"><button className="btn btn-ghost" onClick={() => open(p)}>Edit</button><button className="btn btn-ghost" onClick={() => toggle(p)}>{p.is_active ? "Archive" : "Restore"}</button></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>
      {f && (
        <Modal title={editId ? "Edit custom plan" : "New custom plan"} onClose={() => setF(null)}>
          <div className="dc-grid" style={{ marginBottom: 0 }}>
            {!editId && <Field label="Code (lowercase, e.g. special-2026)"><input className="input" value={f.code} onChange={set("code")} /></Field>}
            <Field label="Plan name"><input className="input" value={f.name} onChange={set("name")} /></Field>
            <Field label="Type"><select className="select" value={f.plan_type} onChange={set("plan_type")}>{Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Per active student / month (INR)"><input className="input" inputMode="decimal" value={f.student} onChange={set("student")} /></Field>
            <Field label="Per active staff / month (INR)"><input className="input" inputMode="decimal" value={f.staff} onChange={set("staff")} /></Field>
            <Field label="Base fee / month (INR)"><input className="input" inputMode="decimal" value={f.base} onChange={set("base")} /></Field>
            <Field label="Minimum fee / month (INR)"><input className="input" inputMode="decimal" value={f.min} onChange={set("min")} /></Field>
            {f.plan_type === "yearly" && <Field label="Yearly discount (%)"><input className="input" inputMode="decimal" value={f.discount} onChange={set("discount")} /></Field>}
          </div>
          <Field label="Description (optional)"><input className="input" value={f.description} onChange={set("description")} /></Field>
          <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Active (can be assigned to schools)</label>
          <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy || !f.name.trim() || (!editId && f.code.trim().length < 2)} onClick={save}>{busy ? "Saving..." : "Save plan"}</button>
        </Modal>
      )}
    </>
  );
};

// ---------- invoices ----------
const Invoices = () => {
  const [f, setF] = useState({ status: "", month: "", q: "" }); const [school, setSchool] = useState(null); const [pick, setPick] = useState(false);
  const [rows, setRows] = useState([]); const [pg, setPg] = useState({ total: 0, page: 1, pages: 1 }); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [err, setErr] = useState(""); const [inv, setInv] = useState(null); const [tick, setTick] = useState(0);
  const key = `${f.status}|${f.month}|${f.q}|${school?.id || ""}`;
  useEffect(() => { setPage(1); }, [key]);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      papi(`/billing/invoices?${qs({ ...f, school_id: school?.id || "", page, limit: 30 })}`, "GET", undefined, true)
        .then((r) => { setRows(Array.isArray(r?.data) ? r.data : []); setPg(r?.pagination || { total: 0, page: 1, pages: 1 }); setErr(""); })
        .catch((e) => setErr(e.message)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [key, page, tick]); // eslint-disable-line
  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="dc-row">
          {school ? <button className="btn btn-primary" onClick={() => setSchool(null)}>{school.name} x</button> : <button className="btn btn-ghost" onClick={() => setPick(true)}>All schools (filter)</button>}
          <select className="select" style={{ width: 130 }} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Any status</option>{["issued", "paid", "overdue", "void"].map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <input className="input" type="month" style={{ width: 150 }} value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} />
          <input className="input" style={{ width: 160 }} placeholder="Invoice no." value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </div>
        {pick && <Modal title="Filter by school" onClose={() => setPick(false)}><SchoolList onPick={(s) => { setSchool(s); setPick(false); }} /></Modal>}
      </div>
      {err && <div className="card" style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <p style={{ padding: 20, color: C.textMuted }}>Loading...</p> : !rows.length ? <p style={{ padding: 20, color: C.textMuted }}>No invoices match these filters.</p> : (
          <div className="scroll-x"><table className="table">
            <thead><tr><th>Invoice</th><th>School</th><th>Period</th><th>Status</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => setInv(r.id)}>
                <td className="dc-mono">{r.invoice_no}</td><td style={{ fontWeight: 700, fontSize: 12.5 }}>{r.school_name}</td><td style={{ fontSize: 12 }}>{dt(r.period_start)} to {dt(r.period_end)}</td>
                <td><StChip s={r.status} /></td><td>{inr(r.total_paise)}</td><td>{inr(r.paid_paise)}</td><td style={{ fontSize: 12 }}>{dt(r.due_date)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
        {pg.pages > 1 && (
          <div className="dc-row" style={{ justifyContent: "space-between", padding: "10px 14px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>Page {pg.page} of {pg.pages} - {pg.total} invoices</span>
            <div className="dc-row"><button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button><button className="btn btn-ghost" disabled={page >= pg.pages} onClick={() => setPage((p) => Math.min(pg.pages, p + 1))}>Next</button></div>
          </div>
        )}
      </div>
      {inv && <InvoiceModal id={inv} onClose={() => setInv(null)} onChanged={() => setTick((t) => t + 1)} />}
    </>
  );
};

// ---------- rates & charges (global, all schools) ----------
const CATS = [["utility", "Utility"], ["authentication", "Authentication (OTP)"], ["marketing", "Marketing"]];
const ECATS = [["otp", "OTP / verification"], ["receipt", "Fee receipts"], ["notice", "Notices and alerts"], ["other", "Other"]];
const toForm = (s) => ({
  gst_pct: String(s.gst_pct), due_days: String(s.due_days), grace_days: String(s.grace_days), invoice_lead_days: String(s.invoice_lead_days), auto_suspend: !!s.auto_suspend,
  wa: Object.fromEntries(["own", "platform"].map((w) => [w, Object.fromEntries(CATS.map(([c]) => [c, rup(s.wa_rates[w][c])]))])),
  email: Object.fromEntries(["own", "platform"].map((w) => [w, Object.fromEntries(ECATS.map(([c]) => [c, rup(s.email_rates[w][c])]))])), sms: rup(s.sms_rate_paise),
  gw: { enabled: !!s.gateway_charge.enabled, pct: String(s.gateway_charge.pct), flat: rup(s.gateway_charge.flat_paise), bearer: s.gateway_charge.bearer },
  company: { ...s.company },
});
const Settings = () => {
  const s = useLoad(() => papi("/billing/settings"), []);
  const [f, setF] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (s.data) setF(toForm(s.data)); }, [s.data]);
  if (s.err) return <div className="card" style={{ color: C.red }}>{s.err}</div>;
  if (!f) return <p style={{ color: C.textMuted }}>Loading...</p>;
  const put = (path, v) => setF((p) => { const n = JSON.parse(JSON.stringify(p)); let o = n; for (let i = 0; i < path.length - 1; i++) o = o[path[i]]; o[path[path.length - 1]] = v; return n; });
  const save = async () => {
    setBusy(true);
    try {
      await papi("/billing/settings", "PUT", {
        gst_pct: Number(f.gst_pct) || 0, due_days: Number(f.due_days) || 0, grace_days: Number(f.grace_days) || 0, invoice_lead_days: Number(f.invoice_lead_days) || 0, auto_suspend: f.auto_suspend,
        wa_rates: Object.fromEntries(["own", "platform"].map((w) => [w, Object.fromEntries(CATS.map(([c]) => [c, toPaise(f.wa[w][c]) || 0]))])),
        email_rates: Object.fromEntries(["own", "platform"].map((w) => [w, Object.fromEntries(ECATS.map(([c]) => [c, toPaise(f.email[w][c]) || 0]))])), sms_rate_paise: toPaise(f.sms) || 0,
        gateway_charge: { enabled: f.gw.enabled, pct: Number(f.gw.pct) || 0, flat_paise: toPaise(f.gw.flat) || 0, bearer: f.gw.bearer },
        company: f.company,
      });
      toast("Settings saved"); s.reload();
    } catch (e) { toast(explain(e), "err"); } finally { setBusy(false); }
  };
  const inp = (path, props = {}) => <input className="input" inputMode="decimal" style={{ maxWidth: 140 }} value={path.reduce((o, k) => o[k], f)} onChange={(e) => put(path, e.target.value)} {...props} />;
  return (
    <>
      <div className="dc-split" style={{ marginBottom: 14 }}>
        <div className="card">
          <b className="syne" style={{ fontSize: 15 }}>Invoicing</b>
          <div className="dc-grid" style={{ marginBottom: 0 }}>
            <Field label="GST (%)">{inp(["gst_pct"])}</Field><Field label="Invoice due after (days)">{inp(["due_days"])}</Field>
            <Field label="Grace after due date (days)">{inp(["grace_days"])}</Field><Field label="Prepaid invoice created (days before cycle end)">{inp(["invoice_lead_days"])}</Field>
          </div>
          <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12 }}><input type="checkbox" checked={f.auto_suspend} onChange={(e) => put(["auto_suspend"], e.target.checked)} style={{ marginTop: 3 }} />
            <span>Automatically make a school read-only (suspended) when an invoice stays unpaid after the grace days. It lifts by itself after payment. Students and staff are not affected in any other way.</span></label>
        </div>
        <div className="card">
          <b className="syne" style={{ fontSize: 15 }}>Invoice company details</b>
          {[["name", "Company name"], ["address", "Address"], ["gstin", "GSTIN"], ["email", "Billing email"]].map(([k, l]) => <Field key={k} label={l}><input className="input" value={f.company[k] || ""} onChange={(e) => put(["company", k], e.target.value)} /></Field>)}
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px" }}><b className="syne" style={{ fontSize: 15 }}>WhatsApp charges (INR per message)</b><div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>Billed on the next invoice from the message log. Leave 0 to not charge.</div></div>
        <div className="scroll-x"><table className="table"><thead><tr><th>Category</th><th>School's own number</th><th>School Office number</th></tr></thead>
          <tbody>{CATS.map(([c, l]) => <tr key={c}><td style={{ fontSize: 12.5, fontWeight: 700 }}>{l}</td><td>{inp(["wa", "own", c])}</td><td>{inp(["wa", "platform", c])}</td></tr>)}</tbody></table></div>
      </div>
      <div className="card" style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px" }}><b className="syne" style={{ fontSize: 15 }}>Email charges (INR per email)</b><div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>Every email sent is counted from the email log (failed sends are free) and billed on that school's next invoice. Leave 0 to not charge.</div></div>
        <div className="scroll-x"><table className="table"><thead><tr><th>Category</th><th>School's own sender</th><th>School Office sender</th></tr></thead>
          <tbody>{ECATS.map(([c, l]) => <tr key={c}><td style={{ fontSize: 12.5, fontWeight: 700 }}>{l}</td><td>{inp(["email", "own", c])}</td><td>{inp(["email", "platform", c])}</td></tr>)}</tbody></table></div>
      </div>
      <div className="dc-split" style={{ marginBottom: 14 }}>
        <div className="card">
          <b className="syne" style={{ fontSize: 15 }}>SMS</b>
          <div className="dc-grid" style={{ marginBottom: 0 }}><Field label="Per SMS (INR, upcoming)">{inp(["sms"])}</Field></div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>SMS is not metered yet, so nothing is billed for it.</div>
        </div>
        <div className="card">
          <b className="syne" style={{ fontSize: 15 }}>Online fee payment charge</b>
          <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}><input type="checkbox" checked={f.gw.enabled} onChange={(e) => put(["gw", "enabled"], e.target.checked)} /> Enabled</label>
          <div className="dc-grid" style={{ marginBottom: 0 }}>
            <Field label="Percent (%)">{inp(["gw", "pct"])}</Field><Field label="Flat (INR)">{inp(["gw", "flat"])}</Field>
            <Field label="Paid by"><select className="select" value={f.gw.bearer} onChange={(e) => put(["gw", "bearer"], e.target.value)}><option value="parent">Parent (added on top)</option><option value="school">School (added to invoice)</option></select></Field>
          </div>
          <div style={{ fontSize: 12, color: C.yellow, marginTop: 8 }}>Saved here for all schools. It starts applying to fee payments only after the fee-payment release; fee collection is unchanged for now.</div>
        </div>
      </div>
      <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Saving..." : "Save settings"}</button>
    </>
  );
};

// ---------- page ----------
export const BillingPage = ({ tab: tabProp, onTab, go }) => {
  const [tabLocal, setTabLocal] = useState("overview");
  const tab = tabProp || tabLocal;
  const setTab = (k) => { setTabLocal(k); if (onTab) onTab(k); };
  const TABS = [["overview", "Overview"], ["plans", "Plans"], ["invoices", "Invoices"], ["settings", "Rates & charges"]];
  return (
    <div>
      <div className="dc-tabs">{TABS.map(([k, l]) => <button key={k} className={`btn ${tab === k ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === "overview" && <Overview go={go} />}
      {tab === "plans" && <Plans />}
      {tab === "invoices" && <Invoices />}
      {tab === "settings" && <Settings />}
    </div>
  );
};
