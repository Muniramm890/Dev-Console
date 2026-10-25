// FILE: teacher-app/src/components/ui/FormRow.tsx
// Source: admin App.tsx -> FormRow [1011-1028]
// @ts-nocheck
import { C } from "../../theme/theme";

export const FormRow = ({ label, children, cols = 1 }) => (
  <div style={{ marginBottom: 14 }}>
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: C.textMuted,
        marginBottom: 5,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {label}
    </label>
    {children}
  </div>
);
