// FILE: teacher-app/src/modules/attendance/StatusPicker.tsx
// Source: admin App.tsx -> StatusPicker [11564-11592]
// @ts-nocheck
import { C } from "../../theme/theme";
import { STATUS_KEYS, STATUS_META } from "../../utils/status";

// ═══════════════════════════════════════════════════════════════
// MODULE: ATTENDANCE
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// MODULE: ATTENDANCE — FULL REBUILD (Students + Teachers, real API)
// ═══════════════════════════════════════════════════════════════
// Replaces the old mock AttendanceModule. Uses the same helper
// components/colors already defined at the top of App.jsx:
// C, Icon, KpiCard, SectionHeader, Modal, FormRow, FormGrid, apiRequest
// and recharts imports (BarChart, LineChart, AreaChart, PieChart, Cell,
// XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area)
// ═══════════════════════════════════════════════════════════════

// Small segmented control used in every "mark" row
export const StatusPicker = ({ value, onChange, size = "md" }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {STATUS_KEYS.map((s) => {
      const active = value === s;
      const meta = STATUS_META[s];
      return (
        <button
          key={s}
          onClick={() => onChange(s)}
          style={{
            padding: size === "sm" ? "3px 7px" : "5px 10px",
            borderRadius: 7,
            border: `1.5px solid ${active ? meta.color : C.border}`,
            background: active ? `${meta.color}22` : "transparent",
            color: active ? meta.color : C.textMuted,
            fontSize: size === "sm" ? 10.5 : 12,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s",
            minWidth: size === "sm" ? 28 : 34,
          }}
          title={meta.label}
        >
          {s}
        </button>
      );
    })}
  </div>
);
