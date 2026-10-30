// FILE: teacher-app/src/modules/setup/DailyRoutineBuilder.tsx
// Source: admin App.tsx -> DailyRoutineBuilder [5158-5319]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { PERIOD_TYPES, addMinutes } from "./helpers";
import { C } from "../../theme/theme";

export const DailyRoutineBuilder = ({ periods, onSaved }) => {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [genStart, setGenStart] = useState("08:00");
  const [genDuration, setGenDuration] = useState(45);
  const [genCount, setGenCount] = useState(8);

  // 🔴 Populate from parent's central state — same pattern as Grades/Subjects.
  // Runs whenever SetupModule re-fetches (mount, or after this save).
  useEffect(() => {
    const list = Array.isArray(periods) ? periods : [];
    setRows(
      list.map((p) => ({
        type: p.is_break
          ? p.label?.toLowerCase().includes("lunch")
            ? "lunch"
            : p.label?.toLowerCase().includes("assembly")
            ? "assembly"
            : "break"
          : "period",
        label: p.label || "",
        start_time: (p.start_time || "").slice(0, 5),
        end_time: (p.end_time || "").slice(0, 5),
        is_break: !!p.is_break,
      }))
    );
  }, [periods]);

  const autoGenerate = () => {
    const generated = [];
    let cursor = genStart;
    for (let i = 1; i <= genCount; i++) {
      const end = addMinutes(cursor, genDuration);
      generated.push({ type: "period", label: `Period ${i}`, start_time: cursor, end_time: end, is_break: false });
      cursor = end;
    }
    setRows(generated);
  };

  const updateRow = (i, field, value) => {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const next = { ...r, [field]: value };
        if (field === "type") {
          next.is_break = value !== "period";
          if (value !== "custom") {
            next.label =
              value === "assembly" ? "Assembly" :
              value === "lunch" ? "Lunch Break" :
              value === "break" ? "Short Break" : next.label;
          }
        }
        return next;
      })
    );
  };

  const addRow = () => {
    const last = rows[rows.length - 1];
    const start = last ? last.end_time : "08:00";
    setRows((prev) => [
      ...prev,
      {
        type: "period",
        label: `Period ${prev.filter((r) => r.type === "period").length + 1}`,
        start_time: start,
        end_time: addMinutes(start, 45),
        is_break: false,
      },
    ]);
  };

  const removeRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (rows.length === 0) return alert("Add at least one period before saving.");
    for (const r of rows) {
      if (!r.label?.trim() || !r.start_time || !r.end_time) {
        return alert("Every row needs a label, start time and end time.");
      }
    }
    setSaving(true);
    try {
      await apiRequest("/timetable/periods", "PUT", { periods: rows });
      alert("✅ Daily routine saved! This now drives your Timetable grid.");
      await onSaved?.(); // 🔴 refresh SetupModule's central `periods` state → re-populates this tab
    } catch (e) {
      alert("❌ Failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3 className="syne" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: C.purple }}>
        <Icon name="timetable" size={16} /> Daily Routine — Period-wise Setup
      </h3>
      <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
        Define your school's full day: assembly, periods, lunch, breaks — in order.
      </p>

      {rows.length === 0 ? (
        <div style={{ padding: "20px 16px", background: C.surfaceAlt, borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, fontWeight: 700, textTransform: "uppercase" }}>
            Quick Start — auto-generate periods
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <FormRow label="School Start Time">
              <input className="input" type="time" style={{ width: 130 }} value={genStart} onChange={(e) => setGenStart(e.target.value)} />
            </FormRow>
            <FormRow label="Period Duration">
              <select className="select" style={{ width: 120 }} value={genDuration} onChange={(e) => setGenDuration(Number(e.target.value))}>
                {[30, 35, 40, 45, 50, 60].map((v) => <option key={v} value={v}>{v} min</option>)}
              </select>
            </FormRow>
            <FormRow label="No. of Periods">
              <select className="select" style={{ width: 100 }} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </FormRow>
            <button className="btn btn-primary" onClick={autoGenerate}>Generate</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {rows.map((r, i) => (
            <div key={i} className="routine-row" style={{
              padding: "8px 10px",
              background: r.is_break ? `${C.yellow}11` : C.surfaceAlt, borderRadius: 10, marginBottom: 6,
              border: `1px solid ${r.is_break ? C.yellow + "33" : C.border}`,
            }}>
              <div style={{ textAlign: "center", fontSize: 11, color: C.textMuted, fontWeight: 700 }}>{i + 1}</div>
              <select className="select" style={{ fontSize: 12 }} value={r.type} onChange={(e) => updateRow(i, "type", e.target.value)}>
                {PERIOD_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
              <input className="input" style={{ fontSize: 12 }} value={r.label}
                disabled={r.type !== "custom" && r.type !== "period"}
                onChange={(e) => updateRow(i, "label", e.target.value)} />
              <input className="input" type="time" style={{ fontSize: 12 }} value={r.start_time} onChange={(e) => updateRow(i, "start_time", e.target.value)} />
              <input className="input" type="time" style={{ fontSize: 12 }} value={r.end_time} onChange={(e) => updateRow(i, "end_time", e.target.value)} />
              <button className="btn btn-danger" style={{ padding: "4px 6px" }} onClick={() => removeRow(i)}>
                <Icon name="trash" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        {rows.length > 0 && (
          <button className="btn btn-ghost" onClick={addRow}><Icon name="plus" size={13} /> Add Row</button>
        )}
        <button className="btn btn-primary" style={{ marginLeft: "auto", opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Daily Routine"}
        </button>
      </div>
    </div>
  );
};
