// FILE: teacher-app/src/modules/arrangement/TeacherArrangementCard.tsx
// Source: admin App.tsx -> TeacherArrangementCard [11834-11896]
// @ts-nocheck
import { STATUS_LABEL_MAP } from "./helpers";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// TEACHER ARRANGEMENT CARD — one absent teacher, all their periods as rows
// ═══════════════════════════════════════════════════════════════
export const TeacherArrangementCard = ({ teacherName, status, periods, periodLabelOf, selections, onSelect }) => {
  const filledInCard = periods.filter((g) => selections[g.key] || g.confirmed_substitute_id).length;
  const initials = (teacherName || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: C.surfaceAlt, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.red}15`, color: C.red, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{teacherName}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            <span style={{ color: C.red, fontWeight: 700 }}>{STATUS_LABEL_MAP[status] || status}</span> today • {periods.length} period{periods.length > 1 ? "s" : ""}
          </div>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: filledInCard === periods.length ? `${C.green}15` : `${C.yellow}15`, color: filledInCard === periods.length ? C.green : C.yellow, whiteSpace: "nowrap" }}>
          {filledInCard}/{periods.length} covered
        </span>
      </div>

      <div>
        {periods.map((g, i) => {
          const isFilled = !!selections[g.key] || !!g.confirmed_substitute_id;
          const currentValue = selections[g.key] || g.confirmed_substitute_id || "";
          const allOptions = [...g.suggested, ...g.others];
          return (
            <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: i === 0 ? "none" : `1px solid ${C.border}`, background: isFilled ? "transparent" : `${C.red}05` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{periodLabelOf(g.period_slot_id)}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{g.class_name} {g.section_name} — {g.subject_name}{g.room_no ? ` • Room ${g.room_no}` : ""}</div>
              </div>
              <div style={{ width: 210, flexShrink: 0 }}>
                {allOptions.length === 0 && !g.confirmed_substitute_id ? (
                  <span style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>⚠ No teacher free</span>
                ) : (
                  <select
                    className="select"
                    style={{ fontSize: 12, width: "100%", borderColor: isFilled ? C.green : C.border, color: isFilled ? C.text : C.textMuted }}
                    value={currentValue}
                    onChange={(e) => onSelect(g.key, e.target.value || undefined)}
                  >
                    <option value="">— Select substitute —</option>
                    {g.suggested.length > 0 && (
                      <optgroup label="Suggested (same subject)">
                        {g.suggested.map((t) => <option key={t.teacher_id} value={t.teacher_id}>{t.full_name}</option>)}
                      </optgroup>
                    )}
                    {g.others.length > 0 && (
                      <optgroup label="Other available">
                        {g.others.map((t) => <option key={t.teacher_id} value={t.teacher_id}>{t.full_name}</option>)}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
