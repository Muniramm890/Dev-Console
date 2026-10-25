// @ts-nocheck
// Reusable dialogs for User Management (used by the list and by the staff / student detail pages).
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";

const ModeToggle = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
    {[["auto", "Auto-generate"], ["custom", "Set custom"]].map(([v, l]) => (
      <button key={v} onClick={() => onChange(v)} style={{ flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 12.5,
        border: `1.5px solid ${value === v ? C.primary : C.border}`, background: value === v ? `${C.primary}18` : "transparent", color: value === v ? C.primary : C.text }}>{l}</button>
    ))}
  </div>
);

const Secret = ({ text }) => (
  <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: C.primary, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, overflowWrap: "anywhere" }}>{text}</div>
);

const Done = ({ children, onClose }) => (
  <div style={{ textAlign: "center", padding: "8px 0" }}>
    <div style={{ width: 52, height: 52, borderRadius: 16, margin: "0 auto 12px", background: `${C.green}22`, color: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={26} /></div>
    {children}
    <button className="btn btn-primary" style={{ width: "100%" }} onClick={onClose}>Done</button>
  </div>
);

/** request(newPassword | undefined) -> Promise<generated password | null> */
export const PasswordResetDialog = ({ open, onClose, name, request, title = "Reset Password" }) => {
  const { dialogAlert } = useDialog();
  const [mode, setMode] = useState("auto");
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setMode("auto"); setValue(""); setResult(null); } }, [open]);

  const submit = async () => {
    if (mode === "custom" && value.trim().length < 6) return dialogAlert("Password must be at least 6 characters.", "Too Short");
    setSaving(true);
    try {
      const pw = await request(mode === "custom" ? value.trim() : undefined);
      setResult(pw || (mode === "custom" ? value.trim() : ""));
    } catch (e) { dialogAlert("Failed: " + e.message, "Error"); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} width={420}>
      {result !== null ? (
        <Done onClose={onClose}>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>Password reset for <b style={{ color: C.text }}>{name}</b>. Share this with them securely (they are logged out of every device):</div>
          {result && <Secret text={result} />}
        </Done>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Resetting password for <b style={{ color: C.text }}>{name}</b>. They will be logged out of every device.</div>
          <ModeToggle value={mode} onChange={setMode} />
          {mode === "custom" && <FormRow label="New Password"><input className="input" type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Minimum 6 characters" /></FormRow>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Resetting…" : "Reset Password"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

/** student = row with student_id, first_name, guardian_phone, admission_no, roll_no */
export const AuthorizeStudentDialog = ({ student, onClose, onDone }) => {
  const { dialogAlert } = useDialog();
  const [type, setType] = useState("phone");
  const [value, setValue] = useState("");
  const [mode, setMode] = useState("auto");
  const [pw, setPw] = useState("");
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (student) { setType("phone"); setValue(student.guardian_phone || ""); setMode("auto"); setPw(""); setResult(null); } }, [student?.student_id]); // eslint-disable-line

  const submit = async () => {
    if (!value.trim()) return dialogAlert("Enter a value for the selected login ID type.", "Missing Info");
    setSaving(true);
    try {
      const res = await apiRequest(`/admin/users/students/${student.student_id}/authorize`, "POST", {
        identifier_type: type, identifier_value: value.trim(), password: mode === "custom" ? pw.trim() : undefined,
      });
      setResult(res?.data?.temporaryPassword || (mode === "custom" ? pw.trim() : ""));
      onDone?.();
    } catch (e) { dialogAlert("Failed: " + e.message, "Error"); } finally { setSaving(false); }
  };

  return (
    <Modal open={!!student} onClose={onClose} title="Authorize Student Login" width={440}>
      {student && (result !== null ? (
        <Done onClose={onClose}>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>Login enabled for <b style={{ color: C.text }}>{student.first_name}</b>. Share these securely:</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Login ID: <b style={{ color: C.text }}>{value}</b></div>
          {result && <div style={{ marginTop: 8 }}><Secret text={result} /></div>}
        </Done>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Choose how <b style={{ color: C.text }}>{student.first_name}</b> will log in to the Student App.</div>
          <FormRow label="Login ID Type">
            <select className="select" value={type} onChange={(e) => {
              const t = e.target.value; setType(t);
              setValue(t === "phone" ? (student.guardian_phone || "") : t === "admission_no" ? student.admission_no || "" : t === "roll_no" ? student.roll_no || "" : "");
            }}>
              <option value="phone">Phone Number</option>
              <option value="admission_no">Admission Number</option>
              <option value="roll_no">Roll Number</option>
              <option value="email">Email</option>
            </select>
          </FormRow>
          <FormRow label="Value"><input className="input" value={value} onChange={(e) => setValue(e.target.value)} /></FormRow>
          <div style={{ marginTop: 4 }}><ModeToggle value={mode} onChange={setMode} /></div>
          {mode === "custom" && <FormRow label="Password"><input className="input" type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Minimum 6 characters" /></FormRow>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Authorizing…" : "Authorize Login"}</button>
          </div>
        </div>
      ))}
    </Modal>
  );
};
