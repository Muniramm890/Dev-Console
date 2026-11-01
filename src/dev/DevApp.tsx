// @ts-nocheck
// Developer Console shell (Azure-portal style): slim top bar (brand, breadcrumbs, global search, env, profile menu)
// + collapsible side navigation grouped by area + an independently scrolling content area.
//   console - platform login, then the pages below
//   school  - the unchanged Admin app (src/App.tsx) running on a short-lived "act as" token issued by the backend
import { useCallback, useEffect, useRef, useState } from "react";
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

const API_HOST = String((import.meta.env && import.meta.env.VITE_API_URL) || "https://schoolofficeapp-dzh7bebpefdqbvcn.centralindia-01.azurewebsites.net/api").replace(/^https?:\/\//, "").split(".")[0];

// 24x24 stroke icons
const ICON = {
  menu: "M3 6h18M3 12h18M3 18h18",
  school: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  audit: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM8 12h8M8 16h5",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  search: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.35-4.35",
  plus: "M12 5v14M5 12h14",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};
const Ico = ({ n, size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICON[n]} /></svg>
);

const WA_TABS = [["overview", "Overview"], ["numbers", "School numbers"], ["logs", "Message log"], ["webhook", "Webhook"]];
const NAV = [
  { group: "Platform", items: [{ id: "schools", label: "Schools", icon: "school" }] },
  { group: "Messaging", items: [{ id: "whatsapp", label: "WhatsApp (Meta)", icon: "chat", children: WA_TABS }] },
  { group: "Monitoring", items: [{ id: "audit", label: "Audit", icon: "audit" }, { id: "announcements", label: "Notices", icon: "bell" }] },
];

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
  const [userMenu, setUserMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("dc_side_collapsed") === "1"; } catch (e) { return false; } });
  const mainRef = useRef(null);

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
  // Ctrl/Cmd+K or "/" opens global search (console only, never inside a school)
  useEffect(() => {
    if (!authed || acting) return undefined;
    const h = (e) => {
      const t = e.target; const typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "k") { e.preventDefault(); setSearching(true); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setSearching(true); }
      else if (e.key === "Escape") { setUserMenu(false); setMenu(false); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [authed, acting]);

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

  // view = "name[@tab][:id]"   e.g.  schools | school:<id> | whatsapp@webhook | whatsapp@numbers:<schoolId>
  const [head, id] = String(view).split(":");
  const [name, sub] = head.split("@");
  const waTab = sub || (id ? "numbers" : "overview");
  const go = (v) => { setView(v); setMenu(false); setUserMenu(false); if (mainRef.current) mainRef.current.scrollTop = 0; };
  const active = (n) => name === n || (n === "schools" && (name === "school" || name === "new"));
  const logout = () => { setToken(null); setAuthed(false); setMe(null); setUserMenu(false); };
  const toggleSide = () => {
    if (window.matchMedia && window.matchMedia("(max-width: 860px)").matches) { setMenu((m) => !m); return; }
    setCollapsed((c) => { const n = !c; try { localStorage.setItem("dc_side_collapsed", n ? "1" : "0"); } catch (e) { /* ignore */ } return n; });
  };

  const crumbs = ({
    schools: [["Platform"], ["Schools"]],
    school: [["Platform"], ["Schools", "schools"], ["School details"]],
    new: [["Platform"], ["Schools", "schools"], ["New school"]],
    whatsapp: [["Messaging"], ["WhatsApp (Meta)", "whatsapp"], [(WA_TABS.find((t) => t[0] === waTab) || [])[1] || "Overview"]],
    audit: [["Monitoring"], ["Audit"]],
    announcements: [["Monitoring"], ["Notices"]],
    profile: [["Account"], ["Profile"]],
  })[name] || [["Console"]];
  const initial = String(me?.name || me?.email || "?").trim().charAt(0).toUpperCase();
  const edge = { background: C.surface, borderColor: C.border };

  return (
    <div className="dx-app">
      <header className="dx-top" style={edge}>
        <button className="dx-icon" onClick={toggleSide} title="Toggle menu" aria-label="Toggle menu"><Ico n="menu" size={19} /></button>
        <img src="/favicon.svg" className="dx-logo" alt="" />
        <b className="syne dx-brand">School Office</b><span className="dx-sep" /><span className="dx-env">Developer Console</span>
        <nav className="dx-crumbs">
          {crumbs.map(([l, v], i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={i} className={last ? "last" : "extra"} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                {i > 0 && <span className="sl">/</span>}
                {v && !last ? <a onClick={() => go(v)}>{l}</a> : <span style={{ opacity: last ? 1 : 0.7 }}>{l}</span>}
              </span>
            );
          })}
        </nav>
        <button className="dx-search" onClick={() => setSearching(true)} title="Search (Ctrl K or /)"><Ico n="search" size={15} /><span>Search schools, staff, students</span><kbd>Ctrl K</kbd></button>
        <span className="dx-envchip" title={`API: ${API_HOST}`}><i />{API_HOST}</span>
        <div className="dx-user">
          <button className="dx-avatar" onClick={() => setUserMenu((u) => !u)} title={me?.email || "Account"}>{initial}</button>
          {userMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 80 }} onClick={() => setUserMenu(false)} />
              <div className="dx-menu" style={edge}>
                <div className="who"><b>{me?.name || "Developer"}</b><br />{me?.email}</div>
                <button className="dx-item" onClick={() => go("profile")}><Ico n="user" /><span>Profile</span></button>
                <button className="dx-item" style={{ color: C.red }} onClick={logout}><Ico n="logout" /><span>Logout</span></button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="dx-body">
        <aside className={`dx-side${collapsed ? " collapsed" : ""}${menu ? " open" : ""}`} style={edge}>
          <button className="btn btn-primary dx-new" onClick={() => go("new")} title="New school"><Ico n="plus" size={15} /><span className="dx-lbl">New school</span></button>
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="dx-group">{g.group}</div>
              {g.items.map((it) => {
                const on = active(it.id);
                return (
                  <div key={it.id}>
                    <button className={`dx-item${on ? " on" : ""}`} title={it.label} onClick={() => go(it.id)}><Ico n={it.icon} /><span className="dx-lbl">{it.label}</span></button>
                    {it.children && on && !collapsed && (
                      <div className="dx-sub">
                        {it.children.map(([k, l]) => <button key={k} className={`dx-subitem${waTab === k ? " on" : ""}`} onClick={() => go(`${it.id}@${k}${id ? `:${id}` : ""}`)}>{l}</button>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <button className="dx-item" title="Search" onClick={() => { setSearching(true); setMenu(false); }}><Ico n="search" /><span className="dx-lbl">Search</span></button>
          <button className={`dx-item${name === "profile" ? " on" : ""}`} title="Profile" onClick={() => go("profile")}><Ico n="user" /><span className="dx-lbl">Profile</span></button>
        </aside>
        <div className={`dx-scrim${menu ? " open" : ""}`} onClick={() => setMenu(false)} />

        <main className="dx-main" ref={mainRef}>
          <div className="dc-wrap">
            {name === "schools" && <SchoolsPage go={go} onOpen={setAsk} />}
            {name === "school" && <SchoolDetail id={id} go={go} onOpen={setAsk} />}
            {name === "new" && <NewSchool go={go} />}
            {name === "whatsapp" && <WhatsappPage key={id || "all"} focusId={id} tab={sub} onTab={(k) => go(`whatsapp@${k}${id ? `:${id}` : ""}`)} />}
            {name === "audit" && <AuditPage />}
            {name === "announcements" && <AnnouncementsPage />}
            {name === "profile" && <ProfilePage me={me} onLogout={logout} />}
          </div>
        </main>
      </div>

      {searching && <SearchModal onClose={() => setSearching(false)} go={go} onOpen={setAsk} />}
      {ask && <OpenSchoolModal school={ask} onClose={() => setAsk(null)} onOpen={enter} />}
      <Toasts />
    </div>
  );
};
