// FILE: teacher-app/src/modules/payroll/StaffPayrollSetupModal.tsx
// Source: admin App.tsx -> StaffPayrollSetupModal [15764-15857]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { inr } from "./helpers";
import { C } from "../../theme/theme";
import { todayISO } from "../../utils/date";

// ═══════════════════════════════════════════════════════════════
// STAFF SETUP MODAL — Bank + Salary Structure editor
// ═══════════════════════════════════════════════════════════════
export const StaffPayrollSetupModal = ({ staff, open, onClose, onSaved }) => {
  const { dialogAlert } = useDialog();
  const [form, setForm] = useState({
    basic: 0, hra: 0, da: 0, special_allowance: 0, other_allowance: 0,
    pf_deduction: 0, pt_deduction: 0, other_deduction: 0, effective_from: todayISO(),
    account_holder: "", account_number: "", ifsc_code: "", bank_name: "", branch_name: "", upi_id: "", pan_number: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (staff) {
      setForm({
        basic: staff.basic || 0, hra: staff.hra || 0, da: staff.da || 0,
        special_allowance: staff.special_allowance || 0, other_allowance: staff.other_allowance || 0,
        pf_deduction: staff.pf_deduction || 0, pt_deduction: staff.pt_deduction || 0, other_deduction: staff.other_deduction || 0,
        effective_from: staff.effective_from?.slice(0, 10) || todayISO(),
        account_holder: staff.account_holder || staff.full_name || "", account_number: staff.account_number || "",
        ifsc_code: staff.ifsc_code || "", bank_name: staff.bank_name || "", branch_name: "", upi_id: staff.upi_id || "", pan_number: "",
      });
    }
  }, [staff]);

  const gross = (Number(form.basic) || 0) + (Number(form.hra) || 0) + (Number(form.da) || 0) + (Number(form.special_allowance) || 0) + (Number(form.other_allowance) || 0);
  const fixedDeductions = (Number(form.pf_deduction) || 0) + (Number(form.pt_deduction) || 0) + (Number(form.other_deduction) || 0);

  const num = (v) => (v === "" ? 0 : parseFloat(v) || 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest(`/payroll/structure/${staff.staff_id}`, "PUT", {
        basic: num(form.basic), hra: num(form.hra), da: num(form.da),
        special_allowance: num(form.special_allowance), other_allowance: num(form.other_allowance),
        pf_deduction: num(form.pf_deduction), pt_deduction: num(form.pt_deduction), other_deduction: num(form.other_deduction),
        effective_from: form.effective_from,
      });
      await apiRequest(`/payroll/bank/${staff.staff_id}`, "PUT", {
        account_holder: form.account_holder, account_number: form.account_number, ifsc_code: form.ifsc_code,
        bank_name: form.bank_name, branch_name: form.branch_name, upi_id: form.upi_id, pan_number: form.pan_number,
      });
      onSaved();
      onClose();
    } catch (e) {
      dialogAlert("Save failed: " + e.message, "Error");
    } finally {
      setSaving(false);
    }
  };

  if (!staff) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Payroll Setup — ${staff.full_name}`} width={620}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Earnings</div>
      <FormGrid cols={2}>
        <FormRow label="Basic Pay"><input className="input" type="number" value={form.basic} onChange={(e) => setForm((p) => ({ ...p, basic: e.target.value }))} /></FormRow>
        <FormRow label="HRA"><input className="input" type="number" value={form.hra} onChange={(e) => setForm((p) => ({ ...p, hra: e.target.value }))} /></FormRow>
        <FormRow label="DA"><input className="input" type="number" value={form.da} onChange={(e) => setForm((p) => ({ ...p, da: e.target.value }))} /></FormRow>
        <FormRow label="Special Allowance"><input className="input" type="number" value={form.special_allowance} onChange={(e) => setForm((p) => ({ ...p, special_allowance: e.target.value }))} /></FormRow>
        <FormRow label="Other Allowance"><input className="input" type="number" value={form.other_allowance} onChange={(e) => setForm((p) => ({ ...p, other_allowance: e.target.value }))} /></FormRow>
        <FormRow label="Effective From"><input className="input" type="date" value={form.effective_from} onChange={(e) => setForm((p) => ({ ...p, effective_from: e.target.value }))} /></FormRow>
      </FormGrid>

      <div style={{ fontSize: 12, fontWeight: 800, color: C.red, textTransform: "uppercase", letterSpacing: "0.5px", margin: "16px 0 10px" }}>Fixed Deductions</div>
      <FormGrid cols={3}>
        <FormRow label="PF"><input className="input" type="number" value={form.pf_deduction} onChange={(e) => setForm((p) => ({ ...p, pf_deduction: e.target.value }))} /></FormRow>
        <FormRow label="PT"><input className="input" type="number" value={form.pt_deduction} onChange={(e) => setForm((p) => ({ ...p, pt_deduction: e.target.value }))} /></FormRow>
        <FormRow label="Other"><input className="input" type="number" value={form.other_deduction} onChange={(e) => setForm((p) => ({ ...p, other_deduction: e.target.value }))} /></FormRow>
      </FormGrid>

      <div style={{ background: `linear-gradient(135deg, ${C.primary}12, ${C.primary}04)`, border: `1px solid ${C.primary}33`, borderRadius: 14, padding: 14, margin: "16px 0", display: "flex", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700 }}>MONTHLY GROSS</div><div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{inr(gross)}</div></div>
        <div><div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700 }}>FIXED DEDUCTIONS</div><div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>{inr(fixedDeductions)}</div></div>
        <div><div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700 }}>BASE NET (full attendance)</div><div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{inr(gross - fixedDeductions)}</div></div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, color: C.blue, textTransform: "uppercase", letterSpacing: "0.5px", margin: "16px 0 10px" }}>Bank / UPI Details</div>
      <FormGrid cols={2}>
        <FormRow label="Account Holder Name"><input className="input" value={form.account_holder} onChange={(e) => setForm((p) => ({ ...p, account_holder: e.target.value }))} /></FormRow>
        <FormRow label="Account Number"><input className="input" value={form.account_number} onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))} /></FormRow>
        <FormRow label="IFSC Code"><input className="input" value={form.ifsc_code} onChange={(e) => setForm((p) => ({ ...p, ifsc_code: e.target.value.toUpperCase() }))} /></FormRow>
        <FormRow label="Bank Name"><input className="input" value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))} /></FormRow>
        <FormRow label="Branch"><input className="input" value={form.branch_name} onChange={(e) => setForm((p) => ({ ...p, branch_name: e.target.value }))} /></FormRow>
        <FormRow label="UPI ID"><input className="input" value={form.upi_id} onChange={(e) => setForm((p) => ({ ...p, upi_id: e.target.value }))} placeholder="name@bank" /></FormRow>
        <FormRow label="PAN Number"><input className="input" value={form.pan_number} onChange={(e) => setForm((p) => ({ ...p, pan_number: e.target.value.toUpperCase() }))} /></FormRow>
      </FormGrid>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Setup"}</button>
      </div>
    </Modal>
  );
};
