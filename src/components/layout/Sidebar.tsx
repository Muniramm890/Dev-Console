// FILE: teacher-app/src/components/layout/Sidebar.tsx
// Source: admin App.tsx -> Sidebar [1847-1939]
// @ts-nocheck
import { NAV_ITEMS } from "./navItems";
import { Mark } from "../ui/BrandLogo";
import { Icon } from "../ui/Icon";
import { C } from "../../theme/theme";

export const Sidebar = ({ active, onNav, collapsed, school, userRole, isAllowed }) => (
   <div
    style={{
      width: collapsed ? 70 : 230,
      background: C.surface,
      borderRight: `1px solid ${C.border}`,
      height: "100vh",
      overflow: "hidden auto",
      flexShrink: 0,
      transition: "width 0.3s",
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: 0,
    }}
  >
        <div
      style={{
        padding: "18px 14px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        overflow: "hidden",
      }}
    >
      {school.logo_url ? (
        <img
          src={school.logo_url}
          alt=""
          style={{ width: 32, height: 32, borderRadius: 8, objectFit: "contain", flexShrink: 0 }}
        />
      ) : (
        <div style={{ flexShrink: 0 }}><Mark size={32} /></div>
      )}
      {!collapsed && (
        <div style={{ overflow: "hidden" }}>
          <div
            className="syne"
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: C.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.3,
            }}
          >
            {school.name}
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.primary,
              marginTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {school.tagline || "smart ERP for Smart Schools"}
          </div>
        </div>
      )}
    </div>
    <div style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
      {/* [teacher-app] sirf wahi modules jo user ko assigned hain (isAllowed); khali group hide */}
      {NAV_ITEMS.filter((g) => !g.superAdminOnly || userRole === "school_admin")
        .map((g) => ({ ...g, items: g.items.filter((i) => !isAllowed || isAllowed(i.id)) }))
        .filter((g) => g.items.length > 0)
        .map((g) => (
        <div key={g.group}>
          {!collapsed && <div className="sidebar-group">{g.group}</div>}
          {g.items.map((item) => (
            <button
              key={item.id}
              className={`sidebar-link ${active === item.id ? "active" : ""}`}
              onClick={() => onNav(item.id)}
              title={collapsed ? item.label : ""}
            >
              <Icon name={item.icon} size={17} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
    <div style={{ padding: 12, borderTop: `1px solid ${C.border}` }}>
      {!collapsed && (
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center" }}>
          {school.tagline}
        </div>
      )}
    </div>
  </div>
);
