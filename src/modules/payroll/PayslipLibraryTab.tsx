// FILE: teacher-app/src/modules/payroll/PayslipLibraryTab.tsx
// Source: admin App.tsx -> PayslipLibraryTab [16410-16534]
// @ts-nocheck
import { useMemo, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { inr, monthLabel } from "./helpers";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// PAYSLIP LIBRARY TAB
// ═══════════════════════════════════════════════════════════════
export const PayslipLibraryTab = ({ payslips, onViewSlip, onRefresh }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
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
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No payslips generated yet.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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
                  <td style={{ padding: "12px 16px", fontWeight: 800 }}>{inr(p.net_pay)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: p.payment_status === "PAID" ? `${C.green}15` : `${C.yellow}15`, color: p.payment_status === "PAID" ? C.green : C.yellow }}>
                      {p.payment_status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => onViewSlip(p.id)}>
                      <Icon name="eye" size={13} /> View
                    </button>
                    {p.payment_status !== "PAID" && (
                      <>
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setAdjustModal(p)}>
                          <Icon name="edit" size={13} /> Adjust
                        </button>
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

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Mark Paid — ${payModal?.staff_name || ""}`} width={420}>
        <FormRow label="Payment Mode">
          <select className="select" value={payForm.payment_mode} onChange={(e) => setPayForm((p) => ({ ...p, payment_mode: e.target.value }))}>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
          </select>
        </FormRow>
        <FormRow label="Transaction Reference (optional)">
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
