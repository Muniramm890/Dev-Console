// FILE: teacher-app/src/modules/commhub/TargetRow.tsx
// Source: admin App.tsx -> TargetRow [10134-10188]
// [teacher-app] Restyled (icon tile per audience type, card row). Fields and onChange logic unchanged.
// @ts-nocheck
import { Icon } from "../../components/ui/Icon";
import { StudentPicker } from "./StudentPicker";
import { TARGET_TYPE_META } from "./helpers";
import { C } from "../../theme/theme";
import { ROLE_META } from "../../utils/roles";

// -- Single target-row editor (used inside the target list builder) --
export const TargetRow = ({ target, onChange, onRemove, grades, sections, subjects }) => {
  const sectionsForGrade = target.grade_id ? sections.filter((s) => s.grade_id === target.grade_id) : sections;

  return (
    <div
      style={{
        display: "flex", gap: 10, alignItems: "flex-start", padding: 12, flexWrap: "wrap",
        background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10,
      }}
    >
      <div
        style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `${C.primary}1f`, color: C.primary,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        title={TARGET_TYPE_META[target.target_type]?.label}
      >
        <Icon name={TARGET_TYPE_META[target.target_type]?.icon || "users"} size={18} />
      </div>

      <select className="select" style={{ width: 200 }} value={target.target_type} onChange={(e) => onChange({ ...target, target_type: e.target.value })}>
        {Object.entries(TARGET_TYPE_META).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
      </select>

      {(target.target_type === "grade" || target.target_type === "section" || target.target_type === "gender_in_section" || target.target_type === "class_teachers") && (
        <select className="select" style={{ width: 150 }} value={target.grade_id || ""} onChange={(e) => onChange({ ...target, grade_id: e.target.value, section_id: "" })}>
          <option value="">Select grade</option>
          {grades.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
        </select>
      )}

      {(target.target_type === "section" || target.target_type === "gender_in_section" || target.target_type === "class_teachers") && (
        <select className="select" style={{ width: 150 }} value={target.section_id || ""} onChange={(e) => onChange({ ...target, section_id: e.target.value })}>
          <option value="">Select section</option>
          {sectionsForGrade.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </select>
      )}

      {target.target_type === "gender_in_section" && (
        <select className="select" style={{ width: 120 }} value={target.gender || ""} onChange={(e) => onChange({ ...target, gender: e.target.value })}>
          <option value="">Gender</option>
          <option value="male">Boys</option>
          <option value="female">Girls</option>
        </select>
      )}

      {target.target_type === "subject_teachers" && (
        <select className="select" style={{ width: 180 }} value={target.subject_id || ""} onChange={(e) => onChange({ ...target, subject_id: e.target.value })}>
          <option value="">Select subject</option>
          {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </select>
      )}

      {target.target_type === "role" && (
        <select className="select" style={{ width: 160 }} value={target.role || ""} onChange={(e) => onChange({ ...target, role: e.target.value })}>
          <option value="">Select role</option>
          {Object.entries(ROLE_META).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
        </select>
      )}

      {target.target_type === "student" && (
        <StudentPicker value={target.student_id} label={target.student_label} onPick={(id, label) => onChange({ ...target, student_id: id, student_label: label })} />
      )}

      <button className="btn btn-danger" style={{ padding: "8px 10px", marginLeft: "auto" }} onClick={onRemove} title="Remove audience">
        <Icon name="trash" size={14} />
      </button>
    </div>
  );
};
