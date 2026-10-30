// FILE: teacher-app/src/modules/exams/ExamCard.tsx
// Source: admin App.tsx -> ExamCard [16568-16716]
// @ts-nocheck
import { Icon } from "../../components/ui/Icon";
import { EXAM_STATUS_META, EXAM_TYPES } from "./helpers";
import { C } from "../../theme/theme";

// ── Small exam card for the overview grid — plain function, no hooks ──
export const ExamCard = ({ exam, onManage, onEdit, onDelete, onPublishToggle }) => {
  const meta = EXAM_STATUS_META[exam.status] || EXAM_STATUS_META.draft;
  return (
    <div
      key={exam.id}
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        borderTop: `4px solid ${meta.color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
          <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <div className="syne" style={{ fontSize: 16, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {exam.name}
          </div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 3 }}>
            {EXAM_TYPES.find((t) => t.v === exam.exam_type)?.l ||
              exam.exam_type}
            {exam.academic_year_name ? ` · ${exam.academic_year_name}` : ""}
          </div>
        </div>
        <span
          className="badge"
          style={{
            background: `${meta.color}22`,
            color: meta.color,
            fontSize: 10.5,
          }}
        >
          {meta.label}
        </span>
      </div>

      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
        🗓{" "}
        {exam.start_date
          ? new Date(exam.start_date).toLocaleDateString("en-IN")
          : "—"}
        {" → "}
        {exam.end_date
          ? new Date(exam.end_date).toLocaleDateString("en-IN")
          : "—"}
      </div>

      <div className="grid-auto-stat" style={{ marginBottom: 14 }}>
        {[
          ["Classes", exam.section_count ?? 0],
          ["Weightage", `${exam.weightage_percent ?? 0}%`],
          ["Subjects", exam.subject_count ?? 0],
        ].map(([k, v]) => (
          <div
            key={k}
            style={{
              background: C.surfaceAlt,
              borderRadius: 8,
              padding: "6px 8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 9.5,
                color: C.textMuted,
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {k}
            </div>
            <div
              className="syne"
              style={{ fontSize: 14, fontWeight: 800, color: C.text }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          borderTop: `1px solid ${C.border}33`,
          paddingTop: 10,
        }}
      >
        <button
          className="btn btn-primary"
          style={{ flex: 1, fontSize: 12 }}
          onClick={() => onManage(exam)}
        >
          Manage →
        </button>
        <button
          className="btn btn-ghost"
          style={{ padding: "6px 8px" }}
          title="Edit"
          onClick={() => onEdit(exam)}
        >
          <Icon name="edit" size={13} />
        </button>
        {exam.status === "published" ? (
          <button
            className="btn btn-ghost"
            style={{ padding: "6px 8px" }}
            title="Unpublish"
            onClick={() => onPublishToggle(exam, false)}
          >
            <Icon name="eye" size={13} />
          </button>
        ) : (
          <button
            className="btn btn-ghost"
            style={{ padding: "6px 8px" }}
            title="Publish"
            onClick={() => onPublishToggle(exam, true)}
          >
            <Icon name="check" size={13} />
          </button>
        )}
        <button
          className="btn btn-danger"
          style={{ padding: "6px 8px" }}
          title="Delete"
          onClick={() => onDelete(exam)}
        >
          <Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  );
};
