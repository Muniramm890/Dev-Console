// @ts-nocheck
// Setup -> Plan & Billing (school admin): current plan, active headcount, next-bill estimate, invoices (PDF) and pay online.
// Uses /api/billing/*. Schools without a plan (legacy) just see an info message.
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { C } from "../../theme/theme";
import { CASHFREE_MODE, loadCashfreeScript, loadRazorpayScript } from "../fees/helpers";

const SUPPORT = "support@schooloffice.tech";
const inr = (p) => `\u20B9${(Number(p || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d) => { if (!d) return "-"; const x = new Date(`${String(d).slice(0, 10)}T00:00:00`); return x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const TYPE = { monthly: "Monthly", yearly: "Yearly", payg: "Pay as you go" };
const PLAN_ST = { active: ["Active", "badge-green"], trial: ["Free trial", "badge-blue"], grace: ["Payment pending (grace period)", "badge-yellow"], overdue: ["Overdue", "badge-red"], cancelled: ["Stopped", "badge-blue"] };
const INV_ST = { paid: ["Paid", "badge-green"], issued: ["Unpaid", "badge-blue"], overdue: ["Overdue", "badge-red"] };

const Row = ({ label, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}33` }}>
    <span style={{ fontSize: 12.5, color: C.textMuted, fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: 13.5, fontWeight: 700, textAlign: "right" }}>{children}</span>
  </div>
);

const InvoiceDetail = ({ id, onClose, onPdf }) => {
  const [d, setD] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { apiRequest(`/billing/invoices/${id}`).then((r) => setD(r?.data || null)).catch((e) => setErr(e?.message || "Could not load the invoice.")); }, [id]);
  const inv = d?.invoice; const bal = inv ? inv.total_paise - inv.paid_paise : 0;
  return (
    <Modal open onClose={onClose} title={inv ? `Invoice ${inv.invoice_no}` : "Invoice"} width={640}>
      {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
      {!d && !err && <div className="pulse" style={{ padding: 24, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading...</div>}
      {inv && (
        <>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 10 }}>{inv.plan_title} | {day(inv.period_start)} to {day(inv.period_end)} | due {day(inv.due_date)}</div>
          <div className="scroll-x"><table className="table">
            <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>{d.lines.map((l, i) => <tr key={i}><td style={{ fontSize: 12.5 }}>{l.description}</td><td>{l.qty}</td><td>{inr(l.unit_paise)}</td><td style={{ color: l.amount_paise < 0 ? C.green : undefined }}>{inr(l.amount_paise)}</td></tr>)}</tbody>
          </table></div>
          <div style={{ textAlign: "right", fontSize: 13, lineHeight: 1.9, marginTop: 8 }}>
            <div>Total <b>{inr(inv.total_paise)}</b></div><div>Paid {inr(inv.paid_paise)}</div><div>Balance due <b style={{ color: bal > 0 ? C.red : C.green }}>{inr(bal)}</b></div>
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => onPdf(inv)}>Open PDF</button>
        </>
      )}
    </Modal>
  );
};

export const BillingTab = () => {
  const { dialogAlert } = useDialog();
  const [sum, setSum] = useState(null); const [invs, setInvs] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [paying, setPaying] = useState(null); const [detail, setDetail] = useState(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [s, i] = await Promise.all([apiRequest("/billing/summary"), apiRequest("/billing/invoices")]);
      setSum(s?.data || null); setInvs(Array.isArray(i?.data) ? i.data : []);
    } catch (e) { setError(e?.message || "Could not load plan and billing details."); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const pdf = async (inv) => {
    try { await openGeneratedPdf(`/billing/invoices/${inv.id}/pdf`, { name: `${inv.invoice_no}.pdf`, title: `Invoice ${inv.invoice_no}` }); }
    catch (e) { await dialogAlert(e?.message || "Could not open the invoice.", "Invoice"); }
  };

  const pay = async (inv) => {
    setPaying(inv.id);
    try {
      const res = await apiRequest(`/billing/invoices/${inv.id}/pay`, "POST", { return_url: window.location.origin });
      const o = res?.data;
      if (!o) throw new Error("Could not start the payment.");
      let paid = false;
      if (o.gateway === "razorpay") {
        if (!(await loadRazorpayScript())) throw new Error("Could not load the payment gateway. Please check your internet connection.");
        paid = await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: o.key_id, amount: o.amount, currency: o.currency, name: "School Office", description: `Invoice ${inv.invoice_no}`, order_id: o.order_id, theme: { color: C.primary },
            handler: async (r) => {
              try {
                const v = await apiRequest(`/billing/invoices/${inv.id}/verify`, "POST", { gateway: "razorpay", order_id: r.razorpay_order_id, payment_id: r.razorpay_payment_id, signature: r.razorpay_signature });
                resolve(!!v?.data?.paid);
              } catch (e) { reject(new Error("Your payment was received but could not be confirmed yet. It will show here shortly.")); }
            },
            modal: { ondismiss: () => reject(new Error("__dismissed")) },
          });
          rzp.open();
        });
      } else {
        if (!(await loadCashfreeScript())) throw new Error("Could not load the payment gateway. Please check your internet connection.");
        const cf = window.Cashfree({ mode: CASHFREE_MODE });
        const result = await cf.checkout({ paymentSessionId: o.payment_session_id, redirectTarget: "_modal" });
        if (result?.error) throw new Error(result.error.message || "Payment failed. Please try again.");
        if (result?.redirect) return; // the browser is leaving for the bank / UPI app; the payment is confirmed automatically afterwards
        const v = await apiRequest(`/billing/invoices/${inv.id}/verify`, "POST", { gateway: "cashfree", order_id: o.order_id });
        paid = !!v?.data?.paid;
      }
      await dialogAlert(paid ? "Payment received. Thank you!" : "Your payment is being processed. It will show here shortly.", "Plan & Billing");
      await load();
    } catch (e) {
      if (e?.message !== "__dismissed") await dialogAlert(e?.message || "The payment could not be completed.", "Payment");
    } finally { setPaying(null); }
  };

  const st = sum?.enabled ? (PLAN_ST[sum.status] || [sum.status, "badge-blue"]) : null;
  const un = sum?.unpaid;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="syne" style={{ fontWeight: 700, fontSize: 16 }}>Plan &amp; Billing</div>
        <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4, lineHeight: 1.6 }}>Your School Office plan, active students and staff, invoices and online payment.</div>
      </div>

      {loading ? (
        <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading...</div>
      ) : error ? (
        <div className="card" style={{ color: C.red, fontSize: 13 }}>{error}</div>
      ) : (
        <>
          {!sum?.enabled && (
            <div className="card" style={{ marginBottom: 20, fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>
              No paid plan is assigned to your school at the moment, so there is nothing to pay. For plan details, contact School Office at{" "}
              <a href={`mailto:${SUPPORT}`} style={{ color: C.primary, fontWeight: 700 }}>{SUPPORT}</a>.
            </div>
          )}

          {sum?.enabled && un?.count > 0 && (
            <div className="card" style={{ marginBottom: 16, border: `1px solid ${(sum.status === "overdue" ? C.red : sum.status === "grace" ? C.yellow : C.blue)}66`, background: `${(sum.status === "overdue" ? C.red : sum.status === "grace" ? C.yellow : C.blue)}12` }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{un.count} unpaid invoice{un.count > 1 ? "s" : ""} | {inr(un.amount_paise)}</div>
              <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>
                {sum.status === "overdue" ? "Payment is overdue. Please pay to avoid any interruption of the service." : sum.status === "grace" ? `Payment is overdue. Please pay by ${day(sum.grace_until)}.` : `Due on ${day(un.first_due)}.`}
              </div>
            </div>
          )}

          {sum?.enabled && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginBottom: 20 }}>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h3 className="syne" style={{ fontSize: 14, fontWeight: 700 }}>Your plan</h3>
                  <span className={`badge ${st[1]}`}>{st[0]}</span>
                </div>
                <Row label="Plan">{sum.plan.name}</Row>
                <Row label="Billing">{TYPE[sum.plan.type] || sum.plan.type}</Row>
                <Row label="Started on">{day(sum.started_on)}</Row>
                {sum.trial_until && <Row label="Free trial until">{day(sum.trial_until)}</Row>}
                {sum.plan.type !== "payg" && <Row label="Paid until">{day(sum.period_end)}</Row>}
              </div>
              <div className="card">
                <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Active now</h3>
                <Row label="Students">{sum.counts?.students ?? 0}{sum.limits?.max_students ? ` / ${sum.limits.max_students}` : ""}</Row>
                <Row label="Staff">{sum.counts?.staff ?? 0}{sum.limits?.max_staff ? ` / ${sum.limits.max_staff}` : ""}</Row>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 1.6 }}>Only active students and staff are counted. Deactivated or removed ones are not billed.</div>
              </div>
            </div>
          )}

          {sum?.enabled && sum.estimate && sum.status !== "cancelled" && (
            <div className="card" style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px" }}>
                <h3 className="syne" style={{ fontSize: 14, fontWeight: 700 }}>Next bill (estimate)</h3>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{day(sum.estimate.period_start)} to {day(sum.estimate.period_end)} | {sum.estimate.students} students, {sum.estimate.staff} staff. The final invoice may differ with your usage.</div>
              </div>
              <div className="scroll-x"><table className="table">
                <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                <tbody>
                  {sum.estimate.lines.map((l, i) => <tr key={i}><td style={{ fontSize: 12.5 }}>{l.description}</td><td>{l.qty}</td><td>{inr(l.unit_paise)}</td><td style={{ color: l.amount_paise < 0 ? C.green : undefined }}>{inr(l.amount_paise)}</td></tr>)}
                  <tr><td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Estimated total</td><td style={{ fontWeight: 800 }}>{inr(sum.estimate.total_paise)}</td></tr>
                </tbody>
              </table></div>
            </div>
          )}

          {invs.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "14px 16px" }}><h3 className="syne" style={{ fontSize: 14, fontWeight: 700 }}>Invoices</h3></div>
              <div className="scroll-x"><table className="table">
                <thead><tr><th>Invoice</th><th>Period</th><th>Status</th><th>Total</th><th>Paid</th><th>Due</th><th /></tr></thead>
                <tbody>
                  {invs.map((r) => {
                    const s = INV_ST[r.status] || [r.status, "badge-blue"]; const open = r.status === "issued" || r.status === "overdue";
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, fontSize: 12.5, cursor: "pointer" }} onClick={() => setDetail(r.id)}>{r.invoice_no}</td>
                        <td style={{ fontSize: 12 }}>{day(r.period_start)} - {day(r.period_end)}</td>
                        <td><span className={`badge ${s[1]}`} style={{ fontSize: 10 }}>{s[0]}</span></td>
                        <td>{inr(r.total_paise)}</td><td>{inr(r.paid_paise)}</td><td style={{ fontSize: 12 }}>{day(r.due_date)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "4px 10px" }} onClick={() => pdf(r)}>PDF</button>{" "}
                          {open && sum?.gateways?.length > 0 && <button className="btn btn-primary" style={{ fontSize: 11.5, padding: "4px 12px", opacity: paying === r.id ? 0.7 : 1 }} disabled={!!paying} onClick={() => pay(r)}>{paying === r.id ? "Please wait..." : "Pay now"}</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            </div>
          )}

          <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
            Need a plan change, or paid by bank transfer? Contact School Office at{" "}
            <a href={`mailto:${SUPPORT}`} style={{ color: C.primary, fontWeight: 700 }}>{SUPPORT}</a>.
          </div>
        </>
      )}

      {detail && <InvoiceDetail id={detail} onClose={() => setDetail(null)} onPdf={pdf} />}
    </div>
  );
};
