// FILE: teacher-app/src/components/ui/KpiCard.tsx
// Source: admin App.tsx -> KpiCard [857-939]
// @ts-nocheck
import { Icon } from "./Icon";
import { C } from "../../theme/theme";
import { shortenKpi } from "../../utils/shortNum";

export const KpiCard = ({ label, value, sub, icon, color, trend, onClick }) => (
  <div className="kpi-card" onClick={onClick} role={onClick ? "button" : undefined} style={onClick ? { cursor: "pointer" } : undefined}>
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 80,
        height: 80,
        background: `radial-gradient(circle at 100% 0%,${
          color || C.primary
        }22,transparent 70%)`,
        borderRadius: "0 16px 0 0",
      }}
    />
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div>
        <div
          style={{
            color: C.textMuted,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {label}
        </div>
        <div
          className="syne"
          title={typeof value === "string" || typeof value === "number" ? String(value) : undefined}
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: C.text,
            lineHeight: 1,
          }}
        >
          {shortenKpi(value)}
        </div>
        {sub && (
          <div style={{ color: C.textMuted, fontSize: 12, marginTop: 6 }}>
            {sub}
          </div>
        )}
        {trend !== undefined && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 6,
              fontSize: 12,
              color: trend >= 0 ? C.green : C.red,
            }}
          >
            <span>
              {trend >= 0 ? "↑" : "↓"}
              {Math.abs(trend)}%
            </span>
            <span style={{ color: C.textMuted }}>vs last month</span>
          </div>
        )}
      </div>
      <div
        style={{
          background: `${color || C.primary}22`,
          padding: 12,
          borderRadius: 12,
          color: color || C.primary,
        }}
      >
        <Icon name={icon || "chart"} size={20} />
      </div>
    </div>
  </div>
);
