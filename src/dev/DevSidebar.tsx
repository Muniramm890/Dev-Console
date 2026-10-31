// @ts-nocheck
// Developer Console sidebar: grouped nav, expandable (full) <-> collapsed (icon rail) on desktop, slide-in drawer on mobile.
// Reuses the Admin app's .sidebar-link / .sidebar-group styles and Icon set.
import { Icon } from "../components/ui/Icon";
import { Avatar } from "../components/ui/Avatar";
import { C } from "../theme/theme";

export const NAV_GROUPS = [
  { group: "Platform", items: [
    { id: "schools", label: "Schools", icon: "dashboard" },
    { id: "new", label: "New school", icon: "plus" },
  ] },
  { group: "Communication", items: [
    { id: "whatsapp", label: "WhatsApp (Meta)", icon: "message" },
    { id: "announcements", label: "Notices", icon: "megaphone" },
  ] },
  { group: "Security", items: [
    { id: "audit", label: "Audit log", icon: "audit" },
  ] },
];

export const NAV_TITLES = { schools: "Schools", school: "School details", new: "New school", whatsapp: "WhatsApp (Meta)", audit: "Audit log", announcements: "Notices", profile: "Profile" };

export const DevSidebar = ({ active, onNav, collapsed, onToggle, mobile, open, onClose, me, onSearch, themeMode, onTheme }) => {
  const rail = collapsed && !mobile; // icon-only rail only on desktop
  const w = rail ? 72 : 236;
  const pick = (id) => { onNav(id); if (mobile) onClose?.(); };
  const Link = ({ id, label, icon, on, onClick }) => (
    <button className={`sidebar-link${on ? " active" : ""}`} onClick={onClick || (() => pick(id))} title={rail ? label : ""} style={rail ? { justifyContent: "center", padding: "11px 0" } : undefined}>
      <Icon name={icon} size={17} />
      {!rail && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
    </button>
  );
  return (
    <aside
      className={`dc-side${mobile ? " dc-side-mobile" : ""}${mobile && open ? " open" : ""}`}
      style={{ width: w, background: C.surface, borderRight: `1px solid ${C.border}` }}
    >
      <div className="dc-side-head" style={{ borderBottom: `1px solid ${C.border}`, justifyContent: rail ? "center" : "flex-start" }}>
        <img src="/favicon.svg" alt="" width={32} height={32} style={{ borderRadius: 9, flexShrink: 0 }} />
        {!rail && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="syne" style={{ fontSize: 14, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>School Office</div>
            <div style={{ fontSize: 10.5, color: C.primary, marginTop: 2, letterSpacing: ".4px" }}>Developer Console</div>
          </div>
        )}
        {mobile && <button className="btn btn-ghost" style={{ padding: "6px 8px" }} onClick={onClose} aria-label="Close menu"><Icon name="close" size={16} /></button>}
      </div>

      <div className="dc-side-body">
        <div style={{ padding: "8px 8px 0" }}>
          <Link id="search" label="Search  (Ctrl+K)" icon="search" on={false} onClick={() => { onSearch?.(); if (mobile) onClose?.(); }} />
        </div>
        <div style={{ padding: "0 8px" }}>
          {NAV_GROUPS.map((g) => (
            <div key={g.group}>
              {!rail ? <div className="sidebar-group">{g.group}</div> : <div style={{ height: 1, background: C.border, margin: "10px 10px" }} />}
              {g.items.map((it) => <Link key={it.id} {...it} on={active === it.id} />)}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 8, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 4 }}>
        <Link id="theme" label={themeMode === "dark" ? "Light mode" : "Dark mode"} icon={themeMode === "dark" ? "sun" : "moon"} on={false} onClick={onTheme} />
        <button className={`sidebar-link${active === "profile" ? " active" : ""}`} onClick={() => pick("profile")} title={rail ? "Profile" : ""} style={rail ? { justifyContent: "center", padding: "8px 0" } : { padding: "8px 10px" }}>
          <Avatar teacher={{ full_name: me?.name || me?.email || "Dev" }} size={28} />
          {!rail && (
            <span style={{ minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me?.name || "Profile"}</span>
              <span style={{ fontSize: 10.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me?.email || ""}</span>
            </span>
          )}
        </button>
        {!mobile && (
          <button className="sidebar-link" onClick={onToggle} title={rail ? "Expand sidebar" : "Collapse sidebar"} style={rail ? { justifyContent: "center", padding: "10px 0" } : undefined}>
            <span style={{ display: "inline-flex", transform: rail ? "none" : "rotate(180deg)", transition: "transform .2s" }}><Icon name="chevron" size={17} /></span>
            {!rail && <span>Collapse</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
