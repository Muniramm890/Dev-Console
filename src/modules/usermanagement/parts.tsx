// @ts-nocheck
// Reusable building blocks for the User Management detail pages (staff + students):
// header, info grid, action rows and the "Login activity" panel (devices, location, remote logout).
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { SectionCard } from "../../components/ui/SectionCard";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";

export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
export const agoText = (sec) => (sec == null ? "—" : sec < 60 ? "just now" : sec < 3600 ? `${Math.floor(sec / 60)} min ago` : sec < 86400 ? `${Math.floor(sec / 3600)} h ago` : `${Math.floor(sec / 86400)} d ago`);

export const BackLink = ({ label, onClick }) => (
  <button onClick={onClick} className="btn btn-ghost" style={{ padding: "7px 12px", marginBottom: 14, fontSize: 12.5 }}>
    <span style={{ display: "inline-block", transform: "rotate(180deg)", lineHeight: 0 }}><Icon name="arrow_right" size={14} /></span> {label}
  </button>
);

export const PersonHeader = ({ avatar, title, subtitle, badges, right }) => (
  <div className="card" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
    {avatar}
    <div style={{ flex: 1, minWidth: 200 }}>
      <div className="syne" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>{subtitle}</div>}
      {badges && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{badges}</div>}
    </div>
    {right}
  </div>
);

export const InfoGrid = ({ items }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px 20px" }}>
    {items.filter(Boolean).map(([label, value]) => (
      <div key={label} style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3, overflowWrap: "anywhere" }}>{value || value === 0 ? value : "—"}</div>
      </div>
    ))}
  </div>
);

// one line in an "Actions" list: what it does (left) + the control (right)
export const ActionRow = ({ icon, title, desc, tone, children }) => {
  const col = tone === "danger" ? C.red : tone === "success" ? C.green : C.primary;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: `${col}1f`, color: col, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={17} /></div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{title}</div>
        {desc && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
};

const END_LABEL = { logout: "Logged out", remote: "Logged out by admin", password_changed: "Password changed" };
const platformLabel = (p) => (p === "web" ? "Web browser" : p === "android" ? "Android" : p === "ios" ? "iPhone / iPad" : p || "Device");

// ───────────────────────── Login activity (staff + students) ─────────────────────────
export const LoginActivity = ({ type, personId, personName, isDriver = false, onChanged }) => {
  const { dialogConfirm, dialogAlert } = useDialog();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("active");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const key = type === "student" ? "student_id" : "user_id";
      const res = await apiRequest(`/security/sessions?type=${type}&${key}=${personId}&status=all&limit=50`);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (e) { setError(e.message || "Could not load login activity"); } finally { setLoading(false); }
  }, [type, personId]);
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  const active = rows.filter((r) => r.status === "active");
  const shown = tab === "active" ? active : rows;
  const lastLogin = rows[0]?.login_at;

  const logoutOne = async (s) => {
    if (!(await dialogConfirm(`Log ${personName} out of "${s.device_name || "this device"}"? They will have to log in again on it.`, "Log out device"))) return;
    setBusy(s.id);
    try { await apiRequest(`/security/sessions/${s.id}/revoke`, "POST"); await load(); onChanged?.(); }
    catch (e) { dialogAlert("Failed: " + e.message, "Error"); } finally { setBusy(null); }
  };
  const logoutAll = async (stopTracking) => {
    const msg = stopTracking
      ? `Log ${personName} out of every device AND stop bus tracking on the phone?`
      : `Log ${personName} out of all ${active.length} device(s)?`;
    if (!(await dialogConfirm(msg, "Log out everywhere"))) return;
    setBusy("all");
    try {
      await apiRequest("/security/revoke-all", "POST", { type, [type === "student" ? "student_id" : "user_id"]: personId, stop_tracking: !!stopTracking });
      await load(); onChanged?.();
    } catch (e) { dialogAlert("Failed: " + e.message, "Error"); } finally { setBusy(null); }
  };

  const chip = (label, value, color) => (
    <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", minWidth: 130 }}>
      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2, color: color || C.text }}>{value}</div>
    </div>
  );

  return (
    <SectionCard icon="clock" title="Login activity" sub="Where this account is logged in, from which device and place"
      right={<button className="btn btn-ghost" onClick={load} style={{ padding: "7px 10px" }} title="Refresh"><Icon name="refresh" size={14} /></button>}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {chip("Logged in on", `${active.length} device${active.length === 1 ? "" : "s"}`, active.length ? C.green : C.textMuted)}
        {chip("Last login", lastLogin ? fmtDateTime(lastLogin) : "Never")}
        <div style={{ flex: 1 }} />
        {active.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-danger" disabled={busy === "all"} onClick={() => logoutAll(false)}><Icon name="logout" size={14} /> Log out all devices</button>
            {isDriver && <button className="btn btn-ghost" disabled={busy === "all"} onClick={() => logoutAll(true)}><Icon name="bus" size={14} /> Log out + stop bus tracking</button>}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["active", `Active (${active.length})`], ["all", `History (${rows.length})`]].map(([id, label]) => (
          <button key={id} className="btn" onClick={() => setTab(id)} style={{ border: "none", cursor: "pointer", padding: "7px 14px", borderRadius: 18, fontWeight: 700, fontSize: 12.5, background: tab === id ? C.primary : C.surfaceAlt, color: tab === id ? "#fff" : C.text }}>{label}</button>
        ))}
      </div>

      {error && <div style={{ color: C.red, fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
      {loading && !rows.length ? <div className="pulse" style={{ padding: 30, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading…</div>
        : shown.length === 0 ? <EmptyState icon="user" title={tab === "active" ? "Not logged in anywhere" : "No logins yet"} sub={tab === "active" ? "This person has no active session right now." : "Logins will appear here after the next sign-in."} />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shown.map((s) => {
              const isActive = s.status === "active";
              const online = isActive && (s.idle_sec ?? 99999) < 300;
              const place = [s.geo_city, s.geo_region, s.geo_country].filter(Boolean).join(", ");
              const hasCoords = s.latitude != null && s.longitude != null;
              const stateColor = online ? C.green : isActive ? C.blue : C.textMuted;
              return (
                <div key={s.id} style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap", background: isActive ? "transparent" : `${C.surfaceAlt}88` }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: `${stateColor}1f`, color: stateColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={s.platform === "web" ? "dashboard" : "user"} size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5 }}>{s.device_name || platformLabel(s.platform)}</span>
                      <span className="badge" style={{ background: `${C.blue}22`, color: C.blue }}>{platformLabel(s.platform)}{s.app_version ? ` · v${s.app_version}` : ""}</span>
                      {online ? <span className="badge badge-green">Online now</span>
                        : isActive ? <span className="badge badge-blue">Active</span>
                        : <span className="badge badge-yellow">{END_LABEL[s.end_reason] || (s.status === "expired" ? "Expired" : "Ended")}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 5, lineHeight: 1.7 }}>
                      <div>Logged in: <b style={{ color: C.text }}>{fmtDateTime(s.login_at)}</b>{isActive ? <> · last active <b style={{ color: C.text }}>{agoText(s.idle_sec)}</b></> : s.ended_at ? <> · ended <b style={{ color: C.text }}>{fmtDateTime(s.ended_at)}</b>{s.revoked_by_name ? ` by ${s.revoked_by_name}` : ""}</> : null}</div>
                      <div>
                        Location: <b style={{ color: C.text }}>{place || (hasCoords ? "Coordinates only" : "Unknown")}</b>
                        {s.location_source === "gps" ? " (GPS)" : place ? " (approx., from IP)" : ""}
                        {hasCoords && <> · <a href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`} target="_blank" rel="noopener noreferrer" style={{ color: C.primary, fontWeight: 700 }}>Map</a></>}
                      </div>
                      <div>IP: <b style={{ color: C.text }}>{s.ip_address || "—"}</b>{s.os ? <> · {s.os}</> : null}{s.browser && s.browser !== "App" ? <> · {s.browser}</> : null}</div>
                    </div>
                  </div>
                  {isActive && <button className="btn btn-danger" disabled={busy === s.id} onClick={() => logoutOne(s)} style={{ padding: "8px 12px", fontSize: 12 }}><Icon name="logout" size={13} /> Log out</button>}
                </div>
              );
            })}
          </div>
        )}
    </SectionCard>
  );
};
