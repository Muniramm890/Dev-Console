// @ts-nocheck
// Small shared pieces for the Promotion module.
import { C } from "../../theme/theme";

export const ACTIONS = [
  { id: "promote", label: "Promote", color: C.green },
  { id: "retain", label: "Retain", color: C.yellow },
  { id: "tc", label: "TC", color: C.red },
  { id: "graduate", label: "Graduate", color: C.blue },
];

export const ActionPills = ({ value, onChange }) => (
  <div style={{ display: "inline-flex", gap: 3, background: C.surfaceAlt, padding: 3, borderRadius: 12, flexWrap: "wrap" }}>
    {ACTIONS.map((a) => (
      <button key={a.id} onClick={() => onChange(a.id)} style={{ border: "none", cursor: "pointer", padding: "7px 12px", borderRadius: 9, fontSize: 12.5, fontWeight: 700,
        background: value === a.id ? a.color : "transparent", color: value === a.id ? "#fff" : C.textMuted, transition: "background .15s" }}>{a.label}</button>
    ))}
  </div>
);

export const ProgressBar = ({ value, total, color }) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 7, borderRadius: 4, background: C.surfaceAlt, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color || C.green, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, minWidth: 34, textAlign: "right" }}>{pct}%</span>
    </div>
  );
};

export const Chip = ({ children, color }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 100, background: `${color || C.primary}1f`, color: color || C.primary }}>{children}</span>
);

export const secLabel = (s) => (s.grade_name ? `${s.grade_name} - ${s.name}` : s.name);
export const fullName = (s) => [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

// class/section picker grouped by class (chips); `pending` map shows how many students are still to be processed
export const SectionChips = ({ sections, value, onChange, counts }) => {
  const groups = [];
  sections.forEach((s) => { let g = groups.find((x) => x.id === s.grade_id); if (!g) { g = { id: s.grade_id, name: s.grade_name, items: [] }; groups.push(g); } g.items.push(s); });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {groups.map((g) => (
        <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 86, fontSize: 12, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>{g.name}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {g.items.map((s) => {
              const sel = value === s.id; const n = counts?.[s.id];
              return (
                <button key={s.id} onClick={() => onChange(s.id)} style={{ cursor: "pointer", padding: "8px 14px", borderRadius: 12, fontWeight: 700, fontSize: 13,
                  border: `1.5px solid ${sel ? C.primary : C.border}`, background: sel ? `${C.primary}18` : "transparent", color: sel ? C.primary : C.text }}>
                  {s.name}{n != null && <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 7px", borderRadius: 9, background: n > 0 ? `${C.yellow}33` : `${C.green}22`, color: n > 0 ? C.yellow : C.green }}>{n > 0 ? `${n} left` : "done"}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
