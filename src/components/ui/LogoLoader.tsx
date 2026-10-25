// FILE: teacher-app/src/components/ui/LogoLoader.tsx
// Source: admin App.tsx -> LogoLoader [969-974]
// @ts-nocheck
import { Mark } from "./BrandLogo";
import { C } from "../../theme/theme";

export const LogoLoader = ({ size = 44, label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "24px 0", width: "100%" }}>
    <div className="logo-loader-spin"><Mark size={size} /></div>
    {label && <div style={{ fontSize: 12.5, fontWeight: 700, color: C.primary }}>{label}</div>}
  </div>
);
