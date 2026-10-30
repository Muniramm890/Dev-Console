// FILE: teacher-app/src/modules/payroll/PayslipLibraryTab.tsx
// Source: admin App.tsx -> PayslipLibraryTab [16410-16534]
// @ts-nocheck
import { useMemo, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { useAuth } from "../../contexts/AuthContext";
import { inr, monthLabel } from "./helpers";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// PAYSLIP LIBRARY TAB
// ═══════════════════════════════════════════════════════════════
export const PayslipLibraryTab = ({ payslips, onViewSlip, onRefresh }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin";
  const [corrModal, setCorrModal] = useState(null);
  const [corrForm, setCorrForm] = useState({ kind: "ARREAR", amount: "", reason: "" });
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ payment_mode: "BANK_TRANSFER", trx_id: "" });
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ manual_lop_days: "", bonus_amount: "", adjustment_note: "" });

  const handleAdjustSave = async () => {
    try {
      await apiRequest(`/payroll/payslips/${adjustModal.id}/adjust`, "PATCH", {
        manual_lop_days: adjustForm.manual_lop_days === "" ? null : Number(adjustForm.manual_lop_days),
        bonus_amount: Number(adjustForm.bonus_amount) || 0,
        adjustment_note: adjustForm.adjustment_note,
      });
      setAdjustModal(null);
      onRefresh();
    } catch (e) {
      dialogAlert("Adjustment failed: " + e.message, "Error");
    }
  };

  const months = useMemo(() => Array.from(new Set(payslips.map((p) => p.month_year))).sort().reverse(), [payslips]);
  const filtered = monthFilter === "ALL" ? payslips : payslips.filter((p) => p.month_year === monthFilter);

  const monthSlips = monthFilter === "ALL" ? [] : payslips.filter((p) => p.month_year === monthFilter);
  const runId = monthSlips[0]?.payroll_run_id;
  const runStatus = monthSlips[0]?.run_status;
  const pendingCount = monthSlips.filter((p) => p.payment_status !== "PAID").length;

  const handleFinalize = async () => {
    const ok = await dialogConfirm(`Finalize ${monthLabel(monthFilter)}? Amounts will be locked (${pendingCount} slip(s) still unpaid). Payments can still be recorded.`, "Finalize Payroll");
    if (!ok) return;
    try { await apiRequest(`/payroll/runs/${runId}/finalize`, "POST"); onRefresh(); } catch (e) { dialogAlert("Failed: " + e.message, "Error"); }
  };
  const [reasonModal, setReasonModal] = useState(null); // { title, run: (reason) => Promise }
  const [reasonText, setReasonText] = useState("");
  const askReason = (title, run) => { setReasonText(""); setReasonModal({ title, run }); };
  const submitReason = async () => {
    if (reasonText.trim().length < 5) return dialogAlert("Please write a reason (at least 5 characters).", "Reason required");
    try { await reasonModal.run(reasonText.trim()); setReasonModal(null); onRefresh(); } catch (e) { dialogAlert("Failed: " + e.message, "Error"); }
  };
  const handleReopen = () => askReason(`Re-open ${monthLabel(monthFilter)}`, (reason) => apiRequest(`/payroll/runs/${runId}/reopen`, "POST", { reason }));
  const handleUnpay = (p) => askReason(`Undo payment - ${p.staff_name} (${monthLabel(p.month_year)})`, (reason) => apiRequest(`/payroll/payslips/${p.id}/mark-unpaid`, "PATCH", { reason }));
  const handleCorrection = async () => {
    try {
      await apiRequest("/payroll/adjustments", "POST", { staff_id: corrModal.staff_id, kind: corrForm.kind, amount: Number(corrForm.amount), reason: corrForm.reason, source_month: corrModal.month_year });
      setCorrModal(null);
      await dialogAlert("Saved. It will be added automatically to this staff member's next payroll.", "Correction saved");
    } catch (e) { dialogAlert("Failed: " + e.message, "Error"); }
  };

  const handleMarkPaid = async () => {
    try {
      await apiRequest(`/payroll/payslips/${payModal.id}/mark-paid`, "PATCH", payForm);
      setPayModal(null);
      onRefresh();
    } catch (e) {
      dialogAlert("Failed: " + e.message, "Error");
    }
  };

  return (
    <div className="slide-in">
      <div style={{ marginBottom: 16 }}>
        <select className="select" style={{ maxWidth: 220 }} value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="ALL">All Months</option>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        {monthFilter !== "ALL" && runId && (
          <span style={{ marginLeft: 12, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: runStatus === "FINALIZED" ? `${C.green}15` : `${C.yellow}15`, color: runStatus === "FINALIZED" ? C.green : C.yellow }}>
              {runStatus === "FINALIZED" ? "FINALIZED" : "DRAFT"}
            </span>
            {runStatus !== "FINALIZED" && <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={handleFinalize}>Finalize Month</button>}
            {runStatus === "FINALIZED" && isAdmin && <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={handleReopen}>Re-open</button>}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No payslips generated yet.</div>
      ) : (
        <div className="card table-scroll" style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.surfaceAlt, textAlign: "left" }}>
                {["Staff", "Month", "Net Pay", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700 }}>{p.staff_name}</td>
                  <td style={{ padding: "12px 16px", color: C.textMuted }}>{monthLabel(p.month_year)}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 800 }}>
                    {inr(p.net_pay)}
                    {(p.arrears_amount > 0 || p.recovery_amount > 0) && <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textMuted }}>{p.arrears_amount > 0 && `+${inr(p.arrears_amount)} arrears `}{p.recovery_amount > 0 && `-${inr(p.recovery_amount)} recovery`}</div>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: p.payment_status === "PAID" ? `${C.green}15` : `${C.yellow}15`, color: p.payment_status === "PAID" ? C.green : C.yellow }}>
                      {p.payment_status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => onViewSlip(p.id)}>
                      <Icon name="eye" size={13} /> View
                    </button>
                    {p.payment_status === "PAID" && (
                      <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => { setCorrModal(p); setCorrForm({ kind: "ARREAR", amount: "", reason: "" }); }}>
                        <Icon name="plus" size={13} /> Correction
                      </button>
                    )}
                    {p.payment_status === "PAID" && isAdmin && (
                      <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px", color: C.red }} onClick={() => handleUnpay(p)}>Undo paid</button>
                    )}
                    {p.payment_status !== "PAID" && (
                      <>
                        {p.run_status !== "FINALIZED" && (
                          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => { setAdjustModal(p); setAdjustForm({ manual_lop_days: "", bonus_amount: p.bonus_amount > 0 ? String(p.bonus_amount) : "", adjustment_note: p.adjustment_note || "" }); }}>
                            <Icon name="edit" size={13} /> Adjust
                          </button>
                        )}
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px", color: C.green }} onClick={() => { setPayModal(p); setPayForm({ payment_mode: "BANK_TRANSFER", trx_id: "" }); }}>
                          <Icon name="check" size={13} /> Mark Paid
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

 <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title={`Adjust Payslip — ${adjustModal?.staff_name || ""}`} width={440}>
        <FormRow label="LOP Days to Apply">
          <input className="input" type="number" step="0.5" placeholder={`Current: ${adjustModal?.lop_days ?? 0}`}
            value={adjustForm.manual_lop_days} onChange={(e) => setAdjustForm((p) => ({ ...p, manual_lop_days: e.target.value }))} />
        </FormRow>
        <FormRow label="Bonus / Extra Amount">
          <input className="input" type="number" value={adjustForm.bonus_amount} onChange={(e) => setAdjustForm((p) => ({ ...p, bonus_amount: e.target.value }))} />
        </FormRow>
        <FormRow label="Reason">
          <textarea className="input" rows={2} value={adjustForm.adjustment_note} onChange={(e) => setAdjustForm((p) => ({ ...p, adjustment_note: e.target.value }))} />
        </FormRow>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => setAdjustModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdjustSave}>Save Adjustment</button>
        </div>
      </Modal>

      <Modal open={!!reasonModal} onClose={() => setReasonModal(null)} title={reasonModal?.title || ""} width={420}>
        <FormRow label="Reason (required, saved in the audit log)">
          <textarea className="input" rows={3} value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
        </FormRow>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => setReasonModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={submitReason}>Confirm</button>
        </div>
      </Modal>

      <Modal open={!!corrModal} onClose={() => setCorrModal(null)} title={`Correction - ${corrModal?.staff_name || ""} (${corrModal ? monthLabel(corrModal.month_year) : ""})`} width={440}>
        <p style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 12 }}>
          This month is already paid and stays unchanged. Add what was <b>under-paid</b> (arrears) or <b>over-paid</b> (recovery) here; it is applied once to the next payroll.
        </p>
        <FormRow label="Type">
          <select className="select" value={corrForm.kind} onChange={(e) => setCorrForm((f) => ({ ...f, kind: e.target.value }))}>
            <option value="ARREAR">Arrears - pay extra next month</option>
            <option value="RECOVERY">Recovery - deduct excess next month</option>
          </select>
        </FormRow>
        <FormRow label="Amount (INR)">
          <input className="input" type="number" min="0" step="0.01" value={corrForm.amount} onChange={(e) => setCorrForm((f) => ({ ...f, amount: e.target.value }))} />
        </FormRow>
        <FormRow label="Reason (required)">
          <textarea className="input" rows={2} value={corrForm.reason} onChange={(e) => setCorrForm((f) => ({ ...f, reason: e.target.value }))} />
        </FormRow>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => setCorrModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCorrection}>Save Correction</button>
        </div>
      </Modal>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Mark Paid — ${payModal?.staff_name || ""}`} width={420}>
        <FormRow label="Payment Mode">
          <select className="select" value={payForm.payment_mode} onChange={(e) => setPayForm((p) => ({ ...p, payment_mode: e.target.value }))}>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </FormRow>
        <FormRow label="Transaction Reference (UTR / cheque no. - required except for cash)">
          <input className="input" value={payForm.trx_id} onChange={(e) => setPayForm((p) => ({ ...p, trx_id: e.target.value }))} placeholder="UTR / Txn ID" />
        </FormRow>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => setPayModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleMarkPaid}>Confirm Payment</button>
        </div>
      </Modal>
    </div>
  );
};
