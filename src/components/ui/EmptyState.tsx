// FILE: teacher-app/src/components/ui/EmptyState.tsx
// [teacher-app] NEW (shared) — friendly empty state (icon tile + title + hint + optional action button).
//   <EmptyState icon="megaphone" title="Nothing here yet" sub="Short hint" action={<button className="btn btn-primary">Create</button>} />
// @ts-nocheck
import { C } from "../../theme/theme";
import { Icon } from "./Icon";

export const EmptyState = ({ icon = "bell", title, sub, action }) => (
  <div style={{ textAlign: "center", padding: "44px 20px" }}>
    <div
      style={{
        width: 64, height: 64, borderRadius: 18, margin: "0 auto 16px",
        background: `${C.primary}1f`, color: C.primary,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <Icon name={icon} size={28} />
    </div>
    <div className="syne" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{title}</div>
    {sub && <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>{sub}</div>}
    {action && <div style={{ marginTop: 18 }}>{action}</div>}
  </div>
);
