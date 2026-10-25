// FILE: teacher-app/src/modules/students/StudentCard.tsx
// Source: admin App.tsx -> StudentCard [2745-2973]
// @ts-nocheck
import { Icon } from "../../components/ui/Icon";
import { C } from "../../theme/theme";

export const StudentCard = ({ s, gradeName, secName, onView, onEdit, onDelete, onIssueTC }) => {
  const enr = s.enrolment;
  const primary = s.guardians?.[0];
  const fullName = [s.first_name, s.middle_name, s.last_name]
    .filter(Boolean)
    .join(" ");
  const isFemale = s.gender === "Female";
  const col = isFemale ? C.purple : C.blue;

  return (
    <div
      key={s.id}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "transform 0.18s, border-color 0.18s",
      }}
    >
      <div
        style={{
          height: 4,
          background: s.is_active
            ? `linear-gradient(90deg,${C.primary},${C.primaryDark})`
            : `linear-gradient(90deg,${C.textMuted},${C.border})`,
        }}
      />
      <div style={{ padding: "16px 16px 12px" }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          {s.photo_url ? (
            <img 
              src={s.photo_url} 
              alt={fullName} 
              style={{ 
                width: 44, 
                height: 44, 
                borderRadius: "50%", 
                objectFit: "cover", 
                border: `2px solid ${col}55`, 
                flexShrink: 0 
              }} 
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                flexShrink: 0,
                background: `${col}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                color: col,
                border: `2px solid ${col}55`,
              }}
            >
              {(s.first_name?.[0] || "?").toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="syne"
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: C.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fullName}
            </div>
            <div style={{ fontSize: 11.5, color: C.primary, marginTop: 2 }}>
              {enr
                ? `${gradeName(enr.grade_id)} ${secName(enr.section_id)}`
                : "Not enrolled"}
            </div>
            {s.admission_no && (
              <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 1 }}>
                Adm# {s.admission_no}
              </div>
            )}
          </div>
          <span
            className={`badge ${s.is_active ? "badge-green" : "badge-red"}`}
            style={{ fontSize: 10 }}
          >
            {s.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {[
            ["Roll No.", enr?.roll_no || "—"],
            [
              "DOB",
              s.date_of_birth
                ? new Date(s.date_of_birth).toLocaleDateString("en-IN")
                : "—",
            ],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                background: C.surfaceAlt,
                borderRadius: 7,
                padding: "5px 8px",
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
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        {primary && (
          <div
            style={{
              fontSize: 11.5,
              color: C.textMuted,
              marginBottom: 10,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            👤 {primary.full_name} · {primary.phone}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 6,
            borderTop: `1px solid ${C.border}33`,
            paddingTop: 10,
          }}
        >
          <button
            className="btn btn-ghost"
            onClick={() => onView(s)}
            style={{
              flex: 1,
              fontSize: 11,
              padding: "6px 4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Icon name="eye" size={12} /> View
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => onEdit(s)}
            style={{
              flex: 1,
              fontSize: 11,
              padding: "6px 4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Icon name="edit" size={12} /> Edit
          </button>
          {s.is_active && onIssueTC && (
            <button
              className="btn btn-ghost"
              onClick={() => onIssueTC(s)}
              style={{ fontSize: 11, padding: "6px 8px", color: C.red }}
              title="Issue TC / Mark as Left"
            >
              <Icon name="file" size={12} />
            </button>
          )}
          <button
            className="btn btn-danger"
            onClick={() => onDelete(s)}
            style={{ fontSize: 11, padding: "6px 8px" }}
            title="Delete"
          >
            <Icon name="trash" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
