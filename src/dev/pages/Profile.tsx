// @ts-nocheck
// Console -> Profile: who is logged in, change password, logout (moved here from the old top bar).
import { useState } from "react";
import { papi, explain, toast } from "../api";
import { Field } from "../ui";
import { C } from "../../theme/theme";

export const ProfilePage = ({ me, onLogout }) => {
  const [cur, setCur] = useState(""); const [nw, setNw] = useState(""); const [cf, setCf] = useState(""); const [busy, setBusy] = useState(false);
  const mismatch = cf.length > 0 && nw !== cf;
  const save = async () => {
    setBusy(true);
    try { await papi("/auth/change-password", "POST", { current_password: cur, new_password: nw }); toast("Password changed"); setCur(""); setNw(""); setCf(""); }
    catch (e) { toast(explain(e), "err"); } finally { setBusy(false); }
  };
  return (
    <div className="dc-split">
      <div className="card">
        <h3 className="syne" style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Account</h3>
        <span className="dc-label">Name</span><div style={{ fontSize: 14, fontWeight: 600 }}>{me?.name || "-"}</div>
        <span className="dc-label">Email</span><div style={{ fontSize: 14, fontWeight: 600 }}>{me?.email || "-"}</div>
        <button className="btn btn-danger" style={{ marginTop: 18 }} onClick={onLogout}>Logout</button>
      </div>
      <div className="card">
        <h3 className="syne" style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Change password</h3>
        <Field label="Current password"><input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label="New password (min 10 characters)"><input className="input" type="password" value={nw} onChange={(e) => setNw(e.target.value)} /></Field>
        <Field label="Confirm new password"><input className="input" type="password" value={cf} onChange={(e) => setCf(e.target.value)} /></Field>
        {mismatch && <div style={{ fontSize: 12, color: C.red, marginTop: 6 }}>Passwords do not match.</div>}
        <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy || nw.length < 10 || nw !== cf || !cur} onClick={save}>{busy ? "Saving..." : "Save password"}</button>
      </div>
    </div>
  );
};
