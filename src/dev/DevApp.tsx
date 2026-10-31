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
import { DevSidebar, NAV_TITLES } from "./DevSidebar";
import { Icon } from "../components/ui/Icon";
import { useIsMobile } from "../hooks/useIsMobile";
import { C, applyTheme, getSavedTheme } from "../theme/theme";

const clearSchoolSession = () => { ["erp_token", "erp_academic_year_id", "erp_driver_mode"].forEach((k) => localStorage.removeItem(k)); };

const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };

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
  const [collapsed, setCollapsed] = useState(lsGet("dc_side_collapsed", "0") === "1");
  const [themeMode, setThemeMode] = useState(getSavedTheme());
  const mobile = useIsMobile(860);

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

  useEffect(() => { applyTheme(getSavedTheme()); }, []);
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "k") { e.preventDefault(); setSearching(true); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
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
  const toggleCollapsed = () => setCollapsed((c) => { lsSet("dc_side_collapsed", c ? "0" : "1"); return !c; });
  const toggleTheme = () => { const next = themeMode === "dark" ? "light" : "dark"; applyTheme(next); setThemeMode(next); };
  const crumbs = name === "school" ? ["Schools", "Details"] : name === "new" ? ["Schools", "New school"] : [NAV_TITLES[name] || ""];
  return (
    <div className="dc-shell" style={{ background: C.bg, color: C.text }}>
      <DevSidebar
        active={active("schools") ? (name === "new" ? "new" : "schools") : name}
        onNav={go} collapsed={collapsed} onToggle={toggleCollapsed}
        mobile={mobile} open={menu} onClose={() => setMenu(false)}
        me={me} onSearch={() => setSearching(true)} themeMode={themeMode} onTheme={toggleTheme}
      />
      {mobile && <div className={`dc-scrim${menu ? " open" : ""}`} onClick={() => setMenu(false)} />}
      <div className="dc-main">
        <div className="dc-top" style={{ background: `${C.bg}e6`, borderBottom: `1px solid ${C.border}` }}>
          {mobile
            ? <button className="btn btn-ghost" style={{ padding: "7px 9px" }} onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="menu" size={18} /></button>
            : <button className="btn btn-ghost" style={{ padding: "7px 9px" }} onClick={toggleCollapsed} aria-label="Toggle sidebar"><Icon name="menu" size={18} /></button>}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="dc-crumb">{crumbs.map((c, i) => <span key={i}>{i > 0 && <span style={{ opacity: .5 }}> / </span>}{c}</span>)}</div>
            <b className="syne" style={{ fontSize: 16 }}>{crumbs[crumbs.length - 1]}</b>
          </div>
          <button className="btn btn-ghost" style={{ padding: "7px 10px", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setSearching(true)}><Icon name="search" size={15} />{!mobile && <span>Search</span>}</button>
          <button className="btn btn-ghost" style={{ padding: "7px 9px" }} onClick={toggleTheme} aria-label="Toggle theme"><Icon name={themeMode === "dark" ? "sun" : "moon"} size={16} /></button>
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
