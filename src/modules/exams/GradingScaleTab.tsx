// FILE: teacher-app/src/modules/exams/GradingScaleTab.tsx
// Source: admin App.tsx -> GradingScaleTab [18046-18215]
// @ts-nocheck
import { explain } from "../../utils/apiErrors";
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { Icon } from "../../components/ui/Icon";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// GRADING SCALE TAB — school-wide grade bands, add/remove rows
// ═══════════════════════════════════════════════════════════════
export const GradingScaleTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/setup/grading-scale");
      const data = Array.isArray(res?.data) ? res.data : [];
      setRows(
        data.length
          ? data
          : [
              { grade_label: "A+", min_percent: 90, max_percent: 100 },
              { grade_label: "A", min_percent: 80, max_percent: 89 },
              { grade_label: "B+", min_percent: 70, max_percent: 79 },
              { grade_label: "B", min_percent: 60, max_percent: 69 },
              { grade_label: "C", min_percent: 50, max_percent: 59 },
              { grade_label: "D", min_percent: 33, max_percent: 49 },
              { grade_label: "F", min_percent: 0, max_percent: 32 },
            ]
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const updateRow = (i, field, value) => {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { grade_label: "", min_percent: 0, max_percent: 0 },
    ]);
  const removeRow = (i) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest("/setup/grading-scale", "PUT", { scale: rows });
      alert("✅ Grading scale saved!");
    } catch (e) {
      alert("Save failed: " + explain(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div
        className="pulse"
        style={{ padding: 30, textAlign: "center", color: C.primary }}
      >
        Loading…
      </div>
    );

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div>
          <h3 className="syne" style={{ fontSize: 15, fontWeight: 700 }}>
            Grading Scale
          </h3>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
            Used to auto-assign grades when results are processed.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={addRow}>
          <Icon name="plus" size={13} /> Add Band
        </button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Grade Label</th>
            <th>Min %</th>
            <th>Max %</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <input
                  className="input"
                  style={{ width: 90 }}
                  value={r.grade_label}
                  onChange={(e) => updateRow(i, "grade_label", e.target.value)}
                />
              </td>
              <td>
                <select
                  className="select"
                  style={{ width: 90 }}
                  value={r.min_percent}
                  onChange={(e) =>
                    updateRow(i, "min_percent", Number(e.target.value))
                  }
                >
                  {Array.from({ length: 21 }, (_, k) => k * 5).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  className="select"
                  style={{ width: 90 }}
                  value={r.max_percent}
                  onChange={(e) =>
                    updateRow(i, "max_percent", Number(e.target.value))
                  }
                >
                  {Array.from({ length: 21 }, (_, k) => k * 5).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  className="btn btn-danger"
                  style={{ padding: "4px 8px" }}
                  onClick={() => removeRow(i)}
                >
                  <Icon name="trash" size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}
      >
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Grading Scale"}
        </button>
      </div>
    </div>
  );
};
