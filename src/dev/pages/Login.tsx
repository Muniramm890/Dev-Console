// @ts-nocheck
import { useState } from "react";
import { papi, setToken, explain } from "../api";
import { C } from "../../theme/theme";

export const DevLogin = ({ onDone }) => {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { const r = await papi("/auth/login", "POST", { email, password }); setToken(r.token); onDone(r.must_change_password); }
    catch (x) { setErr(explain(x)); } finally { setBusy(false); }
  };
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form onSubmit={submit} className="card" style={{ width: "100%", maxWidth: 380 }}>
        <h2 className="syne" style={{ fontSize: 20, fontWeight: 800 }}>Developer Console</h2>
        <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>School Office - platform control</p>
        <span className="dc-label">Email</span>
        <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <span className="dc-label">Password</span>
        <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <p style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{err}</p>}
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </div>
  );
};

export const ChangePw = ({ onDone, forced }) => {
  const [cur, setCur] = useState(""); const [nw, setNw] = useState(""); const [nw2, setNw2] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (nw.length < 10) return setErr("New password must be at least 10 characters");
    if (nw !== nw2) return setErr("Passwords do not match");
    setBusy(true);
    try { await papi("/auth/change-password", "POST", { current_password: cur, new_password: nw }); onDone(); } catch (x) { setErr(explain(x)); } finally { setBusy(false); }
  };
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form onSubmit={submit} className="card" style={{ width: "100%", maxWidth: 380 }}>
        <h2 className="syne" style={{ fontSize: 18, fontWeight: 800 }}>{forced ? "Set a new password" : "Change password"}</h2>
        {forced && <p style={{ color: C.yellow, fontSize: 13 }}>Replace the temporary password before using the console.</p>}
        <span className="dc-label">Current password</span><input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} required />
        <span className="dc-label">New password (min 10)</span><input className="input" type="password" value={nw} onChange={(e) => setNw(e.target.value)} required />
        <span className="dc-label">Confirm new password</span><input className="input" type="password" value={nw2} onChange={(e) => setNw2(e.target.value)} required />
        {err && <p style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{err}</p>}
        <div className="dc-row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : "Save password"}</button>
          {!forced && <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>}
        </div>
      </form>
    </div>
  );
};
