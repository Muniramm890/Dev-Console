// FILE: teacher-app/src/shared/subjects/SubjectsClassLevelTab.tsx
// Source: admin App.tsx -> SubjectsClassLevelTab [1424-1556]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// 🔴 NEW SUBJECTS TAB — Class-level checkbox + custom-add setup.
// Drop this JSX in place of the OLD {tab === "subjects" && (...)} block
// inside SetupModule's return(). Needs: grades (already in SetupModule state).
// ═══════════════════════════════════════════════════════════════
export const SubjectsClassLevelTab = ({ grades, subjects }) => {
  const { dialogAlert, dialogConfirm } = useDialog(); // 🔴 Custom Dialog Hook को इम्पोर्ट किया

  const [gradeId, setGradeId] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [initialIds, setInitialIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedGrade = grades.find((g) => g.id === gradeId);

  useEffect(() => {
    if (grades.length && !gradeId) setGradeId(grades[0].id);
  }, [grades]); 

  const loadAssigned = async () => {
    if (!gradeId) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/setup/grade-subjects?grade_id=${gradeId}`);
      const list = Array.isArray(res?.data) ? res.data : [];
      const ids = new Set(list.map((s) => s.id));
      setSelectedIds(ids);
      setInitialIds(ids); 
    } catch (e) {
      console.error(e);
      setSelectedIds(new Set());
      setInitialIds(new Set());
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { loadAssigned(); }, [gradeId]); 

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!gradeId) return;

    const removedCount = [...initialIds].filter(id => !selectedIds.has(id)).length;
    
    if (removedCount > 0) {
      const confirmMsg = `You are removing ${removedCount} subject(s) from this class.\n\nThis action will automatically DELETE these subjects from:\n1. The Timetable of this class.\n2. Teacher Subject Assignments for this class.\n\nDo you want to proceed?`;
      
      // 🔴 Custom Dialog Confirm (Native window.confirm हटाया)
      const isConfirmed = await dialogConfirm(confirmMsg, "⚠️ Critical Warning");
      if (!isConfirmed) return; // Stop if user cancels
    }

    setSaving(true);
    try {
      await apiRequest("/setup/grade-subjects", "PUT", {
        grade_id: gradeId,
        subject_ids: Array.from(selectedIds),
      });
      // 🔴 Custom Dialog Alert (Native window.alert हटाया)
      await dialogAlert("Subjects and dependencies synced successfully!", "✅ Success");
      await loadAssigned(); 
    } catch (e) {
      await dialogAlert("Failed: " + e.message, "❌ Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <FormRow label="Select Class">
          <select className="select" style={{ maxWidth: 260 }} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
            <option value="">-- Choose a class --</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>{g.name}{g.stream && g.stream !== "none" ? ` (${g.stream})` : ""}</option>
            ))}
          </select>
        </FormRow>
      </div>

      {!gradeId ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
          Select a class above to configure its subjects.
        </div>
      ) : subjects.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
          No school subjects created yet. Go to "School Subjects" tab first to build your subject master list.
        </div>
      ) : (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Subjects for {selectedGrade?.name}</h3>
            <span className="badge badge-blue">{selectedIds.size} selected</span>
          </div>

          {loading ? (
            <div className="pulse" style={{ textAlign: "center", color: C.primary, padding: 20 }}>Loading…</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 10, marginBottom: 20 }}>
                {subjects.map((s) => {
                  const checked = selectedIds.has(s.id);
                  return (
                    <label
                      key={s.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                        border: `1.5px solid ${checked ? C.primary : C.border}`, background: checked ? `${C.primary}11` : C.surfaceAlt,
                      }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: C.primary }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: checked ? C.primary : C.text }}>{s.name}</span>
                    </label>
                  );
                })}
              </div>
              <div style={{ borderTop: `1px solid ${C.border}44`, paddingTop: 16, display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 180, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : `Save Subjects for ${selectedGrade?.name}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
