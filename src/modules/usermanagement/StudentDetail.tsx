// @ts-nocheck
// Student login page (opens when you click a row in the Students tab): profile, login ID, login activity and actions.
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { PillTabs } from "../../components/ui/PillTabs";
import { SectionCard } from "../../components/ui/SectionCard";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";
import { AuthorizeStudentDialog, PasswordResetDialog } from "./dialogs";
import { ActionRow, BackLink, InfoGrid, LoginActivity, PersonHeader, fmtDate, fmtDateTime } from "./parts";

const TABS = [
  { id: "overview", label: "Overview", icon: "students" },
  { id: "login", label: "Login Activity", icon: "clock" },
  { id: "actions", label: "Login Actions", icon: "warning" },
];

export const StudentDetail = ({ studentId, onBack, onChanged }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("overview");
  const [pwOpen, setPwOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [saving, setSaving] = useState("");

  const load = useCallback(async () => {
    try { const r = await apiRequest(`/admin/users/students/${studentId}`); setD(r?.data || null); setErr(""); }
    catch (e) { setErr(e.message || "Could not load this student"); } finally { setLoading(false); }
  }, [studentId]);
  useEffect(() => { setLoading(true); load(); }, [load]);
  const changed = async () => { await load(); onChanged?.(); };

  if (loading) return <div className="slide-in"><BackLink label="User Management" onClick={onBack} /><div className="pulse" style={{ padding: 60, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading student…</div></div>;
  if (err || !d) return <div className="slide-in"><BackLink label="User Management" onClick={onBack} /><div className="card"><EmptyState icon="students" title="Student not found" sub={err || "This student may have been removed."} /></div></div>;

  const name = `${d.first_name} ${d.last_name || ""}`.trim();
  const status = d.login_status; // active | blocked | not_authorized
  const authorized = status !== "not_authorized";
  const loginId = d.login_phone || d.login_email || d.login_identifier;

  const toggleBlock = async () => {
    const next = status !== "active";
    if (!(await dialogConfirm(next ? `Unblock login for ${d.first_name}?` : `Block login for ${d.first_name}? They'll be logged out immediately.`, next ? "Unblock Login" : "Block Login"))) return;
    setSaving("block");
    try { await apiRequest(`/admin/users/students/${studentId}/status`, "PUT", { is_active: next }); await changed(); }
    catch (e) { dialogAlert("Failed: " + e.message, "Error"); } finally { setSaving(""); }
  };
  const logoutAll = async () => {
    if (!(await dialogConfirm(`Log ${d.first_name} out of every device?`, "Log out everywhere"))) return;
    setSaving("logout");
    try { const r = await apiRequest("/security/revoke-all", "POST", { type: "student", student_id: studentId }); dialogAlert(r?.message || "Done", "Done"); await changed(); }
    catch (e) { dialogAlert("Failed: " + e.message, "Error"); } finally { setSaving(""); }
  };

  return (
    <div className="slide-in">
      <BackLink label="User Management" onClick={onBack} />
      <PersonHeader
        avatar={<Avatar teacher={{ avatar_url: d.photo_url, full_name: name, gender: d.gender }} size={68} />}
        title={name}
        subtitle={`Adm# ${d.admission_no}${d.class_name ? `  ·  ${d.class_name} ${d.section_name || ""}` : ""}${d.roll_no ? `  ·  Roll ${d.roll_no}` : ""}`}
        badges={<span className={`badge ${status === "active" ? "badge-green" : status === "blocked" ? "badge-red" : "badge-yellow"}`}>{status === "active" ? "Login authorized" : status === "blocked" ? "Login blocked" : "Not authorized"}</span>}
      />
      <PillTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard icon="students" title="Student">
            <InfoGrid items={[
              ["Name", name], ["Admission no.", d.admission_no], ["Class", d.class_name ? `${d.class_name} ${d.section_name || ""}` : "—"], ["Roll no.", d.roll_no],
              ["Gender", d.gender], ["Date of birth", fmtDate(d.date_of_birth)], ["Admission date", fmtDate(d.admission_date)],
              ["Guardian", d.guardian_name ? `${d.guardian_name}${d.guardian_relation ? ` (${d.guardian_relation})` : ""}` : "—"], ["Guardian phone", d.guardian_phone],
            ]} />
          </SectionCard>
          <SectionCard icon="user" title="Student App login">
            {authorized ? (
              <InfoGrid items={[["Login ID", loginId], ["Login ID type", d.identifier_type], ["Login enabled on", fmtDate(d.login_created_at)], ["Last login", d.last_login_at ? fmtDateTime(d.last_login_at) : "Never"]]} />
            ) : (
              <EmptyState icon="user" title="Login not authorized yet" sub="This student cannot use the Student App until you authorize a login ID." action={<button className="btn btn-primary" onClick={() => setAuthOpen(true)}>Authorize login</button>} />
            )}
          </SectionCard>
        </div>
      )}

      {tab === "login" && (authorized
        ? <LoginActivity type="student" personId={studentId} personName={d.first_name} onChanged={onChanged} />
        : <div className="card"><EmptyState icon="clock" title="No login yet" sub="Authorize this student's login first. Their devices and sign-ins will show up here." /></div>)}

      {tab === "actions" && (
        <SectionCard icon="warning" title="Login actions" sub="Control this student's access to the Student App">
          {!authorized ? (
            <ActionRow icon="check" tone="success" title="Authorize login" desc="Choose the login ID and create a password so the student can use the app.">
              <button className="btn btn-primary" onClick={() => setAuthOpen(true)}>Authorize login</button>
            </ActionRow>
          ) : (<>
            <ActionRow icon="edit" title="Reset password" desc="Create a new password. The student is logged out of every device.">
              <button className="btn btn-ghost" onClick={() => setPwOpen(true)}>Reset password</button>
            </ActionRow>
            <ActionRow icon="logout" tone="danger" title="Log out of all devices" desc="Ends every active session. They can log in again with their password.">
              <button className="btn btn-danger" onClick={logoutAll} disabled={saving === "logout"}>Log out everywhere</button>
            </ActionRow>
            <ActionRow icon={status === "active" ? "warning" : "check"} tone={status === "active" ? "danger" : "success"} title={status === "active" ? "Block login" : "Unblock login"}
              desc={status === "active" ? "The student is logged out and cannot log in until you unblock." : "Allow this student to log in again."}>
              <button className={`btn ${status === "active" ? "btn-danger" : "btn-success"}`} onClick={toggleBlock} disabled={saving === "block"}>{status === "active" ? "Block" : "Unblock"}</button>
            </ActionRow>
          </>)}
        </SectionCard>
      )}

      <PasswordResetDialog open={pwOpen} onClose={() => setPwOpen(false)} name={name} title="Reset Student Password"
        request={async (newPassword) => (await apiRequest(`/admin/users/students/${studentId}/reset-password`, "POST", { newPassword }))?.data?.temporaryPassword} />
      <AuthorizeStudentDialog student={authOpen ? d : null} onClose={() => setAuthOpen(false)} onDone={changed} />
    </div>
  );
};
