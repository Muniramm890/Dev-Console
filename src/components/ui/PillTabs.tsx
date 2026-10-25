// FILE: teacher-app/src/components/ui/PillTabs.tsx
// [teacher-app] NEW (shared) — the pill tab bar used by Fees / Transport / Payroll / Results, as one reusable component.
// Same look as those modules. Use it for tabs in any new or redesigned module.
//   <PillTabs tabs={[{ id: "a", label: "Overview", icon: "chart" }]} active={tab} onChange={setTab} />
// @ts-nocheck
import { C } from "../../theme/theme";
import { Icon } from "./Icon";

export const PillTabs = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 16 }}>
    {tabs.map((t) => (
      <button
        key={t.id}
        className="btn"
        onClick={() => onChange(t.id)}
        style={{
          background: active === t.id ? C.primary : C.surfaceAlt,
          color: active === t.id ? "#fff" : C.text,
          border: "none", display: "flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: 12.5,
        }}
      >
        {t.icon && <Icon name={t.icon} size={14} />}
        {t.label}
      </button>
    ))}
  </div>
);
