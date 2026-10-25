// @ts-nocheck
// Staff account page (opens when you click a row in User Management):
// profile, role & module access, bus/driver info, login activity (devices, location, remote logout) and every account action.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { PillTabs } from "../../components/ui/PillTabs";
import { SectionCard } from "../../components/ui/SectionCard";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";
import { ROLE_META } from "../../utils/roles";
import { PasswordResetDialog } from "./dialogs";
import { PERMISSION_MODULES } from "./helpers";
import { ActionRow, BackLink, InfoGrid, LoginActivity, PersonHeader, agoText, fmtDate, fmtDateTime } from "./parts";

const TABS = [
  { id: "overview", label: "Overview", icon: "user" },
  { id: "access", label: "Role & Access", icon: "setup" },
  { id: "login", label: "Login Activity", icon: "clock" },
  { id: "actions", label: "Account Actions", icon: "warning" },
];

export const StaffDetail = ({ memberId, onBack, onChanged }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("overview");
  const [roleValue, setRoleValue] = useState("teacher");
  const [perm, setPerm] = useState(new Set());
  const [emailValue, setEmailValue] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [saving, setSaving] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await apiRequest(`/admin/users/staff/${memberId}`);
      const x = r?.data; setD(x); setErr("");
      setRoleValue(x.role); setPerm(new Set(x.permissions?.modules || [])); setEmailValue(x.email || "");
    } catch (e) { setErr(e.message || "Could not load this account"); } finally { setLoading(false); }
  }, [memberId]);
  useEffect(() => { setLoading(true); load(); }, [load]);

  const changed = async () => { await load(); onChanged?.(); };
  const run = (key, fn) => async () => { setSaving(key); try { await fn(); } catch (e) { dialogAlert("Failed: " + e.message, "Error"); } finally { setSaving(""); } };

  if (loading) return <div className="slide-in"><BackLink label="User Management" onClick={onBack} /><div className="pulse" style={{ padding: 60, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading account…</div></div>;
  if (err || !d) return <div className="slide-in"><BackLink label="User Management" onClick={onBack} /><div className="card"><EmptyState icon="user" title="Account not found" sub={err || "This staff account may have been removed."} /></div></div>;

  const rMeta = ROLE_META[d.role] || { label: d.role, color: C.textMuted };
  const isAdmin = d.role === "school_admin";
  const isDriver = !!d.transport; // any driver or conductor is tracked from his phone
  const modCount = d.permissions?.modules?.length || 0;

  const saveRole = run("role", async () => {
    if (roleValue === "school_admin" && d.role !== "school_admin" &&
      !(await dialogConfirm(`Make ${d.full_name} a Super Admin? They will get full access to everything, including User Management.`, "Confirm Promotion"))) return;
    await apiRequest(`/admin/users/${memberId}/role`, "PUT", { role: roleValue }); await changed();
  });
  const savePerm = run("perm", async () => { await apiRequest(`/admin/users/${memberId}/permissions`, "PUT", { modules: Array.from(perm) }); await changed(); });
  const toggleBlock = run("block", async () => {
    const next = !d.is_active;
    if (!(await dialogConfirm(next ? `Unblock ${d.full_name}? They will be able to log in again.` : `Block ${d.full_name}? They will be logged out and unable to access the system.`, next ? "Unblock User" : "Block User"))) return;
    await apiRequest(`/admin/users/${memberId}/status`, "PUT", { is_active: next }); await changed();
  });
  const saveEmail = run("email", async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())) return dialogAlert("Enter a valid email address.", "Invalid Email");
    if (!(await dialogConfirm(`Change login email for ${d.full_name} to "${emailValue.trim()}"? They will need to use this new email to log in.`, "Confirm Email Change"))) return;
    await apiRequest(`/admin/users/${memberId}/email`, "PUT", { newEmail: emailValue.trim() }); await changed(); dialogAlert("Email updated successfully.", "Done");
  });
  const logoutAll = (stopTracking) => run("logout", async () => {
    if (!(await dialogConfirm(stopTracking ? `Log ${d.full_name} out of every device and stop bus tracking on the phone?` : `Log ${d.full_name} out of every device?`, "Log out everywhere"))) return;
    const r = await apiRequest("/security/revoke-all", "POST", { type: "staff", user_id: d.user_id, stop_tracking: !!stopTracking });
    dialogAlert(r?.message || "Done", "Done"); await changed();
  })();
  const t = d.transport;

  return (
    <div className="slide-in">
      <BackLink label="User Management" onClick={onBack} />
      <PersonHeader
        avatar={<Avatar teacher={{ avatar_url: d.avatar_url, full_name: d.full_name, gender: d.gender }} size={68} />}
        title={<>{d.full_name}{d.is_self && <span style={{ color: C.textMuted, fontWeight: 500, fontSize: 14 }}> (You)</span>}</>}
        subtitle={[d.email, d.phone].filter(Boolean).join("  ·  ")}
        badges={<>
          <span className="badge" style={{ background: `${rMeta.color}22`, color: rMeta.color }}>{rMeta.label}</span>
          <span className={`badge ${d.is_active ? "badge-green" : "badge-red"}`}>{d.is_active ? "Active" : "Blocked"}</span>
          {t && <span className="badge badge-blue">{String(t.role || "transport").replace(/^./, (c) => c.toUpperCase())}</span>}
        </>}
      />
      <PillTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard icon="user" title="Profile">
            <InfoGrid items={[
              ["Full name", d.full_name], ["Login email", d.email], ["Phone", d.phone], ["Role", rMeta.label],
              ["Employee code", d.employee_code], ["Department", d.department], ["Designation", d.designation],
              ["Joined school", fmtDate(d.join_date)], ["Account created", fmtDate(d.account_created_at)],
              ["Last login", d.last_login_at ? fmtDateTime(d.last_login_at) : "Never"],
              ["Module access", isAdmin ? "Full access" : modCount ? `${modCount} module${modCount !== 1 ? "s" : ""}` : "No modules set"],
            ]} />
          </SectionCard>
          {t && (
            <SectionCard icon="bus" title="Transport & bus tracking" sub="This account is linked to a transport staff profile"
              right={<button className="btn btn-ghost" onClick={() => navigate("/transport")} style={{ padding: "7px 12px", fontSize: 12 }}>Open live map</button>}>
              <InfoGrid items={[
                ["Transport role", t.role], ["Status", t.status], ["Licence no.", t.license_no],
                ["Assigned bus", t.vehicle?.registration_no || "Not assigned"], ["Route", t.route?.name],
                isDriver && ["Phone tracker", t.tracker?.last_seen_at ? `Last seen ${agoText(Math.max(0, Math.round((Date.now() - new Date(t.tracker.last_seen_at).getTime()) / 1000)))}` : "Not set up on any phone"],
                isDriver && t.tracker && ["Phone battery", t.tracker.battery_pct != null ? `${t.tracker.battery_pct}%` : "—"],
                isDriver && t.tracker && ["Tracker device", [t.tracker.device_model, t.tracker.app_version && `app v${t.tracker.app_version}`].filter(Boolean).join(" · ")],
              ]} />
            </SectionCard>
          )}
        </div>
      )}

      {tab === "access" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard icon="setup" title="Role" sub={d.is_self ? "You cannot change your own role" : "What this person is allowed to do in the system"}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select className="select" style={{ width: 220 }} value={roleValue} onChange={(e) => setRoleValue(e.target.value)} disabled={d.is_self}>
                {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button className="btn btn-primary" onClick={saveRole} disabled={d.is_self || roleValue === d.role || saving === "role"}>{saving === "role" ? "Saving…" : "Save role"}</button>
            </div>
          </SectionCard>
          <SectionCard icon="eye" title="Module access" sub={isAdmin ? "Super Admins have full access to everything" : "Choose which modules this person can open. Changes apply on their next login."}
            right={!isAdmin && <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setPerm(new Set(PERMISSION_MODULES.map((m) => m.id)))}>All</button>
              <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setPerm(new Set())}>None</button>
            </div>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10, marginBottom: 18, opacity: isAdmin ? 0.5 : 1, pointerEvents: isAdmin ? "none" : "auto" }}>
              {PERMISSION_MODULES.map((m) => {
                const checked = isAdmin || perm.has(m.id);
                return (
                  <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `1.5px solid ${checked ? C.primary : C.border}`, background: checked ? `${C.primary}12` : "transparent" }}>
                    <input type="checkbox" checked={checked} onChange={() => setPerm((p) => { const n = new Set(p); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n; })} style={{ width: 15, height: 15, accentColor: C.primary }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: checked ? C.primary : C.text }}>{m.label}</span>
                  </label>
                );
              })}
            </div>
            {!isAdmin && <button className="btn btn-primary" onClick={savePerm} disabled={saving === "perm"}>{saving === "perm" ? "Saving…" : "Save access"}</button>}
          </SectionCard>
        </div>
      )}

      {tab === "login" && <LoginActivity type="staff" personId={d.user_id} personName={d.full_name} isDriver={isDriver} onChanged={onChanged} />}

      {tab === "actions" && (
        <SectionCard icon="warning" title="Account actions" sub="Everything you can do to this account">
          <ActionRow icon="edit" title="Reset password" desc="Create a new password. They are logged out of every device immediately.">
            <button className="btn btn-ghost" onClick={() => setPwOpen(true)}>Reset password</button>
          </ActionRow>
          <ActionRow icon="mail" title="Login email" desc="The email this person uses to log in.">
            <input className="input" style={{ width: 240 }} value={emailValue} onChange={(e) => setEmailValue(e.target.value)} placeholder="name@example.com" />
            <button className="btn btn-primary" onClick={saveEmail} disabled={saving === "email" || emailValue.trim() === (d.email || "")}>{saving === "email" ? "Saving…" : "Update email"}</button>
          </ActionRow>
          <ActionRow icon="logout" title="Log out of all devices" desc="Ends every active session. They can log in again with their password." tone="danger">
            <button className="btn btn-danger" onClick={() => logoutAll(false)} disabled={saving === "logout"}>Log out everywhere</button>
            {isDriver && <button className="btn btn-ghost" onClick={() => logoutAll(true)} disabled={saving === "logout"}>Also stop bus tracking</button>}
          </ActionRow>
          <ActionRow icon={d.is_active ? "warning" : "check"} tone={d.is_active ? "danger" : "success"} title={d.is_active ? "Block account" : "Unblock account"}
            desc={d.is_active ? "Stops this person from logging in or using the app." : "Allow this person to log in again."}>
            <button className={`btn ${d.is_active ? "btn-danger" : "btn-success"}`} onClick={toggleBlock} disabled={d.is_self || saving === "block"}>{d.is_active ? "Block" : "Unblock"}</button>
          </ActionRow>
          {d.is_self && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 12 }}>This is your own account, so blocking and role changes are disabled.</div>}
        </SectionCard>
      )}

      <PasswordResetDialog open={pwOpen} onClose={() => setPwOpen(false)} name={d.full_name}
        request={async (newPassword) => (await apiRequest(`/admin/users/${memberId}/reset-password`, "POST", { newPassword }))?.data?.temporaryPassword} />
    </div>
  );
};
