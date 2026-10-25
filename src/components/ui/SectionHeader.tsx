// FILE: teacher-app/src/components/ui/SectionHeader.tsx
// Source: admin App.tsx -> SectionHeader [941-967]
// @ts-nocheck
import { C } from "../../theme/theme";

export const SectionHeader = ({ title, sub, action }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
      flexWrap: "wrap",
      gap: 12,
    }}
  >
    <div>
      <h2
        className="syne"
        style={{ fontSize: 20, fontWeight: 700, color: C.text }}
      >
        {title}
      </h2>
      {sub && (
        <p style={{ color: C.textMuted, fontSize: 13, marginTop: 3 }}>{sub}</p>
      )}
    </div>
    {action && (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{action}</div>
    )}
  </div>
);
