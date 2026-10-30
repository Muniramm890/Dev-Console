// FILE: teacher-app/src/modules/payroll/PayrollGenerateTab.tsx
// Source: admin App.tsx -> PayrollGenerateTab [16223-16405]
// @ts-nocheck
import { useMemo, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { applyPayslipOverride, addMonths, currentMonthYear, inr, monthLabel } from "./helpers";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// GENERATE TAB — month picker, live client-side preview, confirm & save
// ═══════════════════════════════════════════════════════════════
export const PayrollGenerateTab = ({ staffList, leaveTypes, onSaved }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [monthYear, setMonthYear] = useState(currentMonthYear());
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState([]);
  const [overrides, setOverrides] = useState({}); // { [staff_id]: { manual_lop_days, bonus_amount, adjustment_note } }
  const [adjustingStaff, setAdjustingStaff] = useState(null);

  const [meta, setMeta] = useState({ skipped: [], previous_unpaid: [], is_current_month: false, run_status: null });

  // The server does the real calculation (attendance, structure, arrears). Nothing money-related is computed in the browser.
  const generatePreview = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/payroll/preview?month_year=${monthYear}`);
      const d = res?.data || {};
      setPreview(d.rows || []);
      setMeta({ skipped: d.skipped || [], previous_unpaid: d.previous_unpaid || [], is_current_month: !!d.is_current_month, run_status: d.run_status || null });
      setOverrides({}); // fresh preview clears any stale adjustments from a previous run
    } catch (e) {
      dialogAlert("Failed to calculate payroll: " + e.message, "Error");
    } finally {
      setLoading(false);
    }
  };

    // Merge base preview with any admin overrides — this is what actually gets rendered & saved
    const finalPreview = useMemo(
      () => preview.map((p) => (overrides[p.staff_id] && p.existing_status !== "PAID" ? applyPayslipOverride(p, overrides[p.staff_id]) : p)),
      [preview, overrides]
    );
  
    const totals = useMemo(() => ({
      gross: finalPreview.filter((p) => p.existing_status !== "PAID").reduce((s, p) => s + p.gross_salary, 0),
      deduction: finalPreview.filter((p) => p.existing_status !== "PAID").reduce((s, p) => s + p.total_deduction, 0),
      net: finalPreview.filter((p) => p.existing_status !== "PAID").reduce((s, p) => s + p.net_pay, 0),
    }), [finalPreview]);

    const handleConfirm = async () => {
      const writable = finalPreview.filter((p) => p.existing_status !== "PAID");
      if (writable.length === 0) return;
      const bad = writable.find((p) => (p.errors || []).length > 0);
      if (bad) return dialogAlert(`${bad.full_name}: ${bad.errors[0]}`, "Fix before saving");

      const adjustedCount = writable.filter((p) => p.is_manually_adjusted).length;
      const unmarkedCount = writable.filter((p) => p.unmarked_days > 0).length;
      const confirmMsg = `Save payroll for ${writable.length} staff members for ${monthLabel(monthYear)}?`
        + (adjustedCount > 0 ? ` (${adjustedCount} manually adjusted)` : "")
        + (unmarkedCount > 0 ? ` ${unmarkedCount} staff have days without attendance, counted as Present.` : "")
        + (meta.is_current_month ? " This month is not over yet." : "")
        + ` Total payout: ${inr(totals.net)}.`;
      const ok = await dialogConfirm(confirmMsg, "Confirm Payroll");
      if (!ok) return;
      setSaving(true);
      try {
        const sendOverrides = Object.entries(overrides).map(([staff_id, o]) => ({ staff_id, manual_lop_days: o.manual_lop_days, bonus_amount: o.bonus_amount, adjustment_note: o.adjustment_note }));
        const res = await apiRequest("/payroll/save-run", "POST", { month_year: monthYear, overrides: sendOverrides });
        const d = res?.data || {};
        const paidNote = (d.skipped_paid || []).length ? ` ${d.skipped_paid.length} already-paid slip(s) were left untouched.` : "";
        await dialogAlert(`Payroll saved for ${d.saved} staff. Net payout ${inr(d.totals?.net)}.${paidNote} Review and pay from the Payslips tab.`, "Success");
        onSaved();
        setPreview([]);
        setOverrides({});
      } catch (e) {
        dialogAlert("Save failed: " + e.message, "Error");
      } finally {
        setSaving(false);
      }
    };

  const skippedStaff = meta.skipped || [];

  return (
    <div className="slide-in">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <FormRow label="Payroll Month">
          <input className="input" type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
        </FormRow>
        <button className="btn btn-primary" onClick={generatePreview} disabled={loading} style={{ height: 42, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="refresh" size={14} /> {loading ? "Calculating..." : "Generate Preview"}
        </button>
      </div>

      {skippedStaff.length > 0 && (
        <div style={{ background: `${C.yellow}12`, border: `1px solid ${C.yellow}44`, borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12.5, color: C.text }}>
          ⚠ {skippedStaff.length} staff skipped: {skippedStaff.map((s) => `${s.full_name} (${s.reason})`).join(", ")}
        </div>
      )}

      {meta.run_status === "FINALIZED" && (
        <div style={{ background: `${C.red}10`, border: `1px solid ${C.red}44`, borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12.5, color: C.text }}>
          This month is finalized and locked. Ask the school admin to re-open it from the Payslips tab to change anything.
        </div>
      )}
      {meta.previous_unpaid.length > 0 && (
        <div style={{ background: `${C.yellow}12`, border: `1px solid ${C.yellow}44`, borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12.5, color: C.text }}>
          ⚠ Unpaid payslips from earlier months: {meta.previous_unpaid.map((m) => `${monthLabel(m.month_year)} - ${m.count} slip(s), ${inr(m.amount)}`).join("; ")}. Pay them from the Payslips tab.
        </div>
      )}
      {meta.is_current_month && preview.length > 0 && (
        <div style={{ background: `${C.yellow}12`, border: `1px solid ${C.yellow}44`, borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12.5, color: C.text }}>
          ⚠ {monthLabel(monthYear)} is still running. Days without attendance (including remaining days of this month) are counted as Present, so the amounts below are not final.
        </div>
      )}

      {preview.length > 0 && (
        <>
          <div className="grid-auto-kpi" style={{ marginBottom: 20 }}>
            <KpiCard label="Total Gross" value={inr(totals.gross)} icon="wallet" color={C.blue} />
            <KpiCard label="Total Deductions" value={inr(totals.deduction)} icon="alert" color={C.red} />
            <KpiCard label="Net Payout" value={inr(totals.net)} icon="check" color={C.green} />
          </div>

          <div className="card table-scroll" style={{ padding: 0, marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
                <tr style={{ background: C.surfaceAlt, textAlign: "left" }}>
                  {["Staff", "Present", "Paid Leave", "LOP", "Gross", "Deductions", "Net Pay", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 10.5, fontWeight: 800, color: C.textMuted, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {finalPreview.map((p) => (
                  <tr key={p.staff_id} style={{ borderTop: `1px solid ${C.border}`, background: p.is_manually_adjusted ? `${C.yellow}0c` : "transparent" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 700 }}>
                      {p.full_name}
                      {p.existing_status === "PAID" && (
                        <span style={{ marginLeft: 8, fontSize: 9.5, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: `${C.green}20`, color: C.green }}>Paid - locked</span>
                      )}
                      {p.unmarked_days > 0 && (
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textMuted }}>{p.unmarked_days} day(s) without attendance (counted as Present)</div>
                      )}
                      {!p.has_bank_details && <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textMuted }}>No bank / UPI details</div>}
                      {(p.arrears_amount > 0 || p.recovery_amount > 0) && (
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textMuted }}>
                          {p.arrears_amount > 0 && `+${inr(p.arrears_amount)} arrears `}{p.recovery_amount > 0 && `-${inr(p.recovery_amount)} recovery`}
                        </div>
                      )}
                      {(p.errors || []).length > 0 && <div style={{ fontSize: 10.5, fontWeight: 700, color: C.red }}>{p.errors[0]}</div>}
                      {p.is_manually_adjusted && (
                        <span style={{ marginLeft: 8, fontSize: 9.5, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: `${C.yellow}20`, color: C.amber || "#B7791F" }}>
                          Adjusted
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>{p.present_days}</td>
                    <td style={{ padding: "10px 14px", color: C.green }}>{p.paid_leave_days}</td>
                    <td style={{ padding: "10px 14px", color: p.lop_days > 0 ? C.red : C.textMuted }}>
                      {p.lop_days}{p.lop_days !== p.auto_lop_days && <span style={{ fontSize: 10, color: C.textMuted }}> (auto: {p.auto_lop_days})</span>}
                    </td>
                    <td style={{ padding: "10px 14px" }}>{inr(p.gross_salary)}</td>
                    <td style={{ padding: "10px 14px", color: C.red }}>-{inr(p.total_deduction)}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 800 }}>
                      {inr(p.net_pay)}{p.bonus_amount > 0 && <span style={{ fontSize: 10, color: C.green }}> (+{inr(p.bonus_amount)} bonus)</span>}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <button className="btn btn-ghost" disabled={p.existing_status === "PAID"} style={{ fontSize: 11.5, padding: "5px 10px" }} onClick={() => setAdjustingStaff(p.staff_id)}>
                        <Icon name="edit" size={12} /> Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={handleConfirm} disabled={saving || meta.run_status === "FINALIZED"} style={{ padding: "12px 28px", fontSize: 14 }}>
              {saving ? "Saving..." : `Confirm & Save Payroll for ${monthLabel(monthYear)}`}
            </button>
          </div>
        </>
      )}

      {/* ── MANUAL OVERRIDE MODAL ── */}
      {adjustingStaff && (() => {
        const row = finalPreview.find((p) => p.staff_id === adjustingStaff);
        const current = overrides[adjustingStaff] || { manual_lop_days: row.auto_lop_days, bonus_amount: 0, adjustment_note: "" };
        return (
          <Modal open={true} onClose={() => setAdjustingStaff(null)} title={`Adjust Payroll — ${row.full_name}`} width={460}>
            <p style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 14 }}>
              System calculated <b>{row.auto_lop_days} LOP day(s)</b> from attendance. Rule: P / PL / OD paid, HD half salary, A / L cut, no record = Present. Override below if the admin wants to pay despite absence, or add a bonus.
            </p>
            <FormRow label="LOP Days to Apply">
              <input className="input" type="number" step="0.5" min="0" value={current.manual_lop_days}
                onChange={(e) => setOverrides((p) => ({ ...p, [adjustingStaff]: { ...current, manual_lop_days: e.target.value } }))} />
            </FormRow>
            <FormRow label="Bonus / Extra Amount (optional)">
              <input className="input" type="number" min="0" value={current.bonus_amount}
                onChange={(e) => setOverrides((p) => ({ ...p, [adjustingStaff]: { ...current, bonus_amount: e.target.value } }))} />
            </FormRow>
            <FormRow label="Reason (required if adjusting)">
              <textarea className="input" rows={2} value={current.adjustment_note}
                placeholder="e.g. Approved by Principal — medical emergency"
                onChange={(e) => setOverrides((p) => ({ ...p, [adjustingStaff]: { ...current, adjustment_note: e.target.value } }))} />
            </FormRow>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
              <button className="btn btn-ghost" style={{ color: C.red }} onClick={() => { setOverrides((p) => { const n = { ...p }; delete n[adjustingStaff]; return n; }); setAdjustingStaff(null); }}>
                Reset to Auto
              </button>
              <button className="btn btn-primary" onClick={() => setAdjustingStaff(null)}>Apply</button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
