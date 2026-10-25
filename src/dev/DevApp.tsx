// @ts-nocheck
// Developer Console shell. Two modes:
//   console  - platform login, schools, controls, audit, announcements (new)
//   school   - the unchanged Admin app (src/App.tsx) running on a short-lived "act as" token issued by the backend
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import AdminApp from "../App";
import { getToken, setToken, papi, explain, toast } from "./api";
import { Toasts, Modal } from "./ui";
import { DevLogin, ChangePw } from "./pages/Login";
import { SchoolsPage } from "./pages/Schools";
import { SchoolDetail } from "./pages/SchoolDetail";
import { NewSchool } from "./pages/NewSchool";
import { AuditPage } from "./pages/Audit";
import { AnnouncementsPage } from "./pages/Announcements";
import { DevPanel, OpenSchoolModal } from "./DevPanel";
import { C } from "../theme/theme";

const clearSchoolSession = () => { ["erp_token", "erp_academic_year_id", "erp_driver_mode"].forEach((k) => localStorage.removeItem(k)); };

export const DevApp = () => {
  const [authed, setAuthed] = useState(!!getToken());
  const [mustChange, setMustChange] = useState(false);
  const [booting, setBooting] = useState(!!getToken());
  const [view, setView] = useState("schools");
  const [acting, setActing] = useState(null);
  const [ask, setAsk] = useState(null);
  const [pw, setPw] = useState(false);

  const exit = useCallback((msg) => { clearSchoolSession(); window.__DEV_CONSOLE__ = null; setActing(null); if (msg) toast(msg); }, []);
  const enter = useCallback(async (school, { write, reason }) => {
    try {
      const r = await papi(`/schools/${school.id}/act-as`, "POST", { as: "staff", write: !!write, reason });
      clearSchoolSession();
      localStorage.setItem("erp_token", r.token);
      window.history.replaceState(null, "", "/");
      window.__DEV_CONSOLE__ = { exit };
      setActing({ school, write: !!write, role: r.role, name: r.name, expires: Date.now() + r.expires_in * 1000, nonce: Date.now() });
    } catch (e) { toast(explain(e), "err"); throw e; }
  }, [exit]);

  useEffect(() => { clearSchoolSession(); }, []); // never keep a school token from an earlier visit
  useEffect(() => {
    const out = () => { setAuthed(false); exit(); };
    window.addEventListener("dc-logout", out); return () => window.removeEventListener("dc-logout", out);
  }, [exit]);
  useEffect(() => {
    if (!getToken()) return;
    papi("/auth/me").then((m) => { setMustChange(!!m.must_change_password); setAuthed(true); }).catch(() => setAuthed(false)).finally(() => setBooting(false));
  }, []);

  if (booting) return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Loading...</div>;
  if (!authed) return (<><DevLogin onDone={(mc) => { setAuthed(true); setMustChange(!!mc); }} /><Toasts /></>);
  if (mustChange) return <><ChangePw forced onDone={() => setMustChange(false)} /><Toasts /></>;

  // inside a school: the original Admin app, untouched
  if (acting) return (
    <>
      <BrowserRouter><AdminApp key={acting.nonce} /></BrowserRouter>
      <DevPanel acting={acting} onEnter={enter} onExit={exit} />
      <Toasts />
    </>
  );

  const [name, id] = String(view).split(":");
  const nav = (n, label) => <button key={n} className={`btn ${name === n || (n === "schools" && name === "school") ? "btn-primary" : "btn-ghost"}`} onClick={() => setView(n)}>{label}</button>;
  return (
    <div style={{ minHeight: "100dvh" }}>
      <div className="dc-top">
        <b className="syne" style={{ fontSize: 16 }}>School Office - Developer Console</b>
        <div className="dc-nav">
          {nav("schools", "Schools")}{nav("audit", "Audit log")}{nav("announcements", "Announcements")}
          <button className="btn btn-ghost" onClick={() => setPw(true)}>Password</button>
          <button className="btn btn-ghost" onClick={() => { setToken(null); setAuthed(false); }}>Logout</button>
        </div>
      </div>
      <div className="dc-wrap">
        {name === "schools" && <SchoolsPage go={setView} onOpen={setAsk} />}
        {name === "school" && <SchoolDetail id={id} go={setView} onOpen={setAsk} />}
        {name === "new" && <NewSchool go={setView} />}
        {name === "audit" && <AuditPage />}
        {name === "announcements" && <AnnouncementsPage />}
      </div>
      {ask && <OpenSchoolModal school={ask} onClose={() => setAsk(null)} onOpen={enter} />}
      {pw && <Modal title="Change password" onClose={() => setPw(false)} wide><ChangePwInline onDone={() => setPw(false)} /></Modal>}
      <Toasts />
    </div>
  );
};

// compact version of the password form for the modal
const ChangePwInline = ({ onDone }) => {
  const [cur, setCur] = useState(""); const [nw, setNw] = useState(""); const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await papi("/auth/change-password", "POST", { current_password: cur, new_password: nw }); toast("Password changed"); onDone(); }
    catch (e) { toast(explain(e), "err"); } finally { setBusy(false); }
  };
  return (<div>
    <span className="dc-label">Current password</span><input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
    <span className="dc-label">New password (min 10)</span><input className="input" type="password" value={nw} onChange={(e) => setNw(e.target.value)} />
    <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy || nw.length < 10} onClick={save}>Save</button>
  </div>);
};
