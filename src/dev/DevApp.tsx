// @ts-nocheck
// Developer Console shell. Two modes:
//   console  - platform login + sidebar: Schools, WhatsApp (Meta), Audit, Notices, Search, Profile
//   school   - the unchanged Admin app (src/App.tsx) running on a short-lived "act as" token issued by the backend
import { useCallback, useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import AdminApp from "../App";
import { getToken, setToken, papi, explain, toast } from "./api";
import { Toasts } from "./ui";
import { DevLogin, ChangePw } from "./pages/Login";
import { SchoolsPage } from "./pages/Schools";
import { SchoolDetail } from "./pages/SchoolDetail";
import { NewSchool } from "./pages/NewSchool";
import { AuditPage } from "./pages/Audit";
import { AnnouncementsPage } from "./pages/Announcements";
import { WhatsappPage } from "./pages/Whatsapp";
import { ProfilePage } from "./pages/Profile";
import { SearchModal } from "./pages/Search";
import { DevPanel, OpenSchoolModal } from "./DevPanel";
import { C } from "../theme/theme";

const clearSchoolSession = () => { ["erp_token", "erp_academic_year_id", "erp_driver_mode"].forEach((k) => localStorage.removeItem(k)); };

const ITEMS = [["schools", "Schools"], ["whatsapp", "WhatsApp (Meta)"], ["audit", "Audit"], ["announcements", "Notices"]];
const TITLES = { schools: "Schools", school: "School", new: "New school", whatsapp: "WhatsApp (Meta)", audit: "Audit", announcements: "Notices", profile: "Profile" };

export const DevApp = () => {
  const [authed, setAuthed] = useState(!!getToken());
  const [mustChange, setMustChange] = useState(false);
  const [booting, setBooting] = useState(!!getToken());
  const [view, setView] = useState("schools");
  const [acting, setActing] = useState(null);
  const [ask, setAsk] = useState(null);
  const [searching, setSearching] = useState(false);
  const [me, setMe] = useState(null);
  const [menu, setMenu] = useState(false);

  const exit = useCallback((msg) => { clearSchoolSession(); window.__DEV_CONSOLE__ = null; setActing(null); if (msg) toast(msg); }, []);
  const enter = useCallback(async (school, { write, reason }) => {
    try {
      const r = await papi(`/schools/${school.id}/act-as`, "POST", { as: "staff", write: !!write, reason, user_id: school.userId || undefined });
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
    papi("/auth/me").then((m) => { setMe(m); setMustChange(!!m.must_change_password); setAuthed(true); }).catch(() => setAuthed(false)).finally(() => setBooting(false));
  }, []);

  if (booting) return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Loading...</div>;
  if (!authed) return (<><DevLogin onDone={(mc) => { setAuthed(true); setMustChange(!!mc); papi("/auth/me").then(setMe).catch(() => {}); }} /><Toasts /></>);
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
  const go = (v) => { setView(v); setMenu(false); try { window.scrollTo(0, 0); } catch (e) { /* ignore */ } };
  const active = (n) => name === n || (n === "schools" && (name === "school" || name === "new"));
  const logout = () => { setToken(null); setAuthed(false); setMe(null); };
  return (
    <div className="dc-shell">
      <aside className={`dc-side${menu ? " open" : ""}`} style={{ background: C.surface }}>
        <div className="dc-brand"><img src="/favicon.svg" alt="" /><div><b className="syne" style={{ fontSize: 15, display: "block", lineHeight: 1.1 }}>School Office</b><span style={{ fontSize: 11, color: C.textMuted }}>Developer Console</span></div></div>
        {ITEMS.map(([n, label]) => <button key={n} className={`dc-item${active(n) ? " on" : ""}`} onClick={() => go(n)}>{label}</button>)}
        <button className="dc-item" onClick={() => { setSearching(true); setMenu(false); }}>Search</button>
        <div style={{ flex: 1 }} />
        <button className={`dc-item${name === "profile" ? " on" : ""}`} style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }} onClick={() => go("profile")}>
          <span>Profile</span>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>{me?.name || me?.email || ""}</span>
        </button>
      </aside>
      <div className={`dc-scrim${menu ? " open" : ""}`} onClick={() => setMenu(false)} />
      <div className="dc-main">
        <div className="dc-top">
          <button className="btn btn-ghost dc-menu-btn" onClick={() => setMenu(true)}>Menu</button>
          <b className="syne" style={{ fontSize: 15 }}>{TITLES[name] || ""}</b>
        </div>
        <div className="dc-wrap">
          {name === "schools" && <SchoolsPage go={go} onOpen={setAsk} />}
          {name === "school" && <SchoolDetail id={id} go={go} onOpen={setAsk} />}
          {name === "new" && <NewSchool go={go} />}
          {name === "whatsapp" && <WhatsappPage key={id || "all"} focusId={id} />}
          {name === "audit" && <AuditPage />}
          {name === "announcements" && <AnnouncementsPage />}
          {name === "profile" && <ProfilePage me={me} onLogout={logout} />}
        </div>
      </div>
      {searching && <SearchModal onClose={() => setSearching(false)} go={go} onOpen={setAsk} />}
      {ask && <OpenSchoolModal school={ask} onClose={() => setAsk(null)} onOpen={enter} />}
      <Toasts />
    </div>
  );
};
