// FILE: teacher-app/src/shared/subjects/SchoolSubjectsTab.tsx
// Source: admin App.tsx -> SchoolSubjectsTab [1560-1789]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";

export const SchoolSubjectsTab = ({ subjects, onSubjectsChanged }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [allTeachers, setAllTeachers] = useState([]);
  const [assignedMap, setAssignedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [addingFor, setAddingFor] = useState(null);
  const [pickerTeacher, setPickerTeacher] = useState("");
  const [saving, setSaving] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCat, setNewSubjectCat] = useState("core");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const [tRes, allAssignRes] = await Promise.all([
        apiRequest("/teachers"),
        apiRequest("/teachers/subject-teachers/all"),
      ]);
      setAllTeachers(Array.isArray(tRes?.data) ? tRes.data : []);
      const rows = Array.isArray(allAssignRes?.data) ? allAssignRes.data : [];
      const map = {};
      rows.forEach((r) => {
        if (!map[r.subject_id]) map[r.subject_id] = [];
        map[r.subject_id].push(r);
      });
      setAssignedMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadAssignments(); }, [subjects.length]); // eslint-disable-line

  const availableTeachersFor = (subjectId) => {
    const already = new Set((assignedMap[subjectId] || []).map((a) => a.teacher_user_id));
    return allTeachers.filter((t) => !already.has(t.user_id));
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return dialogAlert("Subject name is required.", "Missing Info");
    setCreating(true);
    try {
      await apiRequest("/setup/subjects", "POST", { name: newSubjectName.trim(), category: newSubjectCat });
      setNewSubjectName("");
      setNewSubjectCat("core");
      await onSubjectsChanged();
    } catch (e) {
      dialogAlert("Failed: " + e.message, "Error");
    } finally {
      setCreating(false);
    }
  };

  const handleAddTeacher = async (subjectId) => {
    if (!pickerTeacher) return;
    setSaving(true);
    try {
      await apiRequest("/teachers/subject-teachers", "POST", { subject_id: subjectId, teacher_user_id: pickerTeacher });
      setAddingFor(null);
      setPickerTeacher("");
      await loadAssignments();
    } catch (e) {
      dialogAlert("Failed: " + e.message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTeacher = async (assignmentId) => {
    if (!(await dialogConfirm("Remove this teacher from the subject?", "Remove Teacher"))) return;
    try {
      await apiRequest(`/teachers/subject-teachers/${assignmentId}`, "DELETE");
      await loadAssignments();
    } catch (e) {
      dialogAlert("Failed: " + e.message, "Error");
    }
  };

  const handleDeleteSubject = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/setup/subjects/${deleteTarget.id}/hard`, "DELETE");
      setDeleteTarget(null);
      await onSubjectsChanged();
    } catch (e) {
      alert("❌ Failed: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="syne" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: C.primary }}>
          <Icon name="academic" size={16} /> School Subject Master List
        </h3>
        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
          These are the ONLY subjects available across your school. Add them once here, assign
          teachers, then pick per class in "Subjects & Curriculum".
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <FormRow label="New Subject Name">
            <input
              className="input"
              style={{ minWidth: 220 }}
              placeholder="e.g. Hindi"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateSubject(); } }}
            />
          </FormRow>
          <FormRow label="Category">
            <select className="select" style={{ width: 150 }} value={newSubjectCat} onChange={(e) => setNewSubjectCat(e.target.value)}>
              <option value="core">Core / Main</option>
              <option value="language">Language</option>
              <option value="elective">Elective</option>
              <option value="practical">Lab / Practical</option>
            </select>
          </FormRow>
          <button className="btn btn-primary" onClick={handleCreateSubject} disabled={creating}>
            {creating ? "Adding…" : "+ Add Subject"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="pulse" style={{ textAlign: "center", color: C.primary, padding: 30 }}>Loading…</div>
      ) : subjects.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
          No subjects yet — add your first one above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {subjects.map((sub) => {
            const assigned = assignedMap[sub.id] || [];
            const available = availableTeachersFor(sub.id);
            const isAdding = addingFor === sub.id;
            return (
              <div key={sub.id} className="card" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: assigned.length || isAdding ? 10 : 0 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{sub.name}</span>
                    <span className="badge badge-purple" style={{ marginLeft: 8, fontSize: 10 }}>{sub.category}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {!isAdding && available.length > 0 && (
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setAddingFor(sub.id)}>
                        <Icon name="plus" size={11} /> Add Teacher
                      </button>
                    )}
                    <button className="btn btn-danger" style={{ padding: "4px 8px" }} title="Delete Subject" onClick={() => setDeleteTarget(sub)}>
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>

                {assigned.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: isAdding ? 10 : 0 }}>
                    {assigned.map((a) => (
                      <span key={a.assignment_id} className="badge badge-blue" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {a.teacher_name}
                        <button
                          onClick={() => handleRemoveTeacher(a.assignment_id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: C.blue, padding: 0, display: "flex" }}
                        >
                          <Icon name="close" size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {isAdding && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select className="select" style={{ flex: 1 }} value={pickerTeacher} onChange={(e) => setPickerTeacher(e.target.value)}>
                      <option value="">-- Select Teacher --</option>
                      {available.map((t) => <option key={t.user_id} value={t.user_id}>{t.full_name}</option>)}
                    </select>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: "6px 12px", opacity: saving ? 0.7 : 1 }}
                      disabled={saving || !pickerTeacher}
                      onClick={() => handleAddTeacher(sub.id)}
                    >
                      {saving ? "Adding…" : "Add"}
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => { setAddingFor(null); setPickerTeacher(""); }}>
                      Cancel
                    </button>
                  </div>
                )}

                {assigned.length === 0 && !isAdding && (
                  <div style={{ fontSize: 11.5, color: C.textMuted }}>No teacher assigned yet.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Subject?" width={420}>
        {deleteTarget && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <div className="syne" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              Delete "{deleteTarget.name}"?
            </div>
            <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>
              This removes the subject school-wide — from every class it's assigned to, and all
              teacher assignments and timetable/marks links for it.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteSubject} disabled={deleting} style={{ minWidth: 120, opacity: deleting ? 0.7 : 1 }}>
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
