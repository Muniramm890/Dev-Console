// FILE: teacher-app/src/components/ui/SectionCard.tsx
// [teacher-app] NEW (shared) — a .card with a small icon + title + hint header, for grouping form sections / panels.
//   <SectionCard icon="edit" title="Message" sub="Write your announcement" right={<button/>}>...</SectionCard>
// @ts-nocheck
import { C } from "../../theme/theme";
import { Icon } from "./Icon";

export const SectionCard = ({ icon, title, sub, right, children, style }) => (
  <div className="card" style={style}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      {icon && (
        <div
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${C.primary}1f`, color: C.primary,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name={icon} size={18} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="syne" style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
    {children}
  </div>
);
