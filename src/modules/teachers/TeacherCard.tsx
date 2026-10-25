// FILE: teacher-app/src/modules/teachers/TeacherCard.tsx
// Source: admin App.tsx -> TeacherCard [6593-6774]
// @ts-nocheck
import { Avatar } from "../../components/ui/Avatar";
import { Icon } from "../../components/ui/Icon";
import { C } from "../../theme/theme";

// Teacher card for Grid view — plain function (no hooks of its own),
// hoisted to module level. Called as TeacherCard({...}) not <TeacherCard/>.

export const TeacherCard = ({ t, onView, onEdit, onTerminate, onReactivate }) => (
  <div
    key={t.user_id}
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
        background: t.is_active
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
        <Avatar teacher={t} size={50} />
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
            {t.full_name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: C.primary,
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {t.designation || "Teacher"}
          </div>
          {t.department && (
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
              {t.department}
            </div>
          )}
        </div>
        {!t.is_active && (
          <span className="badge badge-red" style={{ fontSize: 10 }}>
            Terminated
          </span>
        )}
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
          ["EMP#", t.employee_code || "—"],
          [
            "Exp",
            t.experience_years != null ? `${t.experience_years} yr` : "—",
          ],
          ["Qual", (t.qualification || "—").split(",")[0]],
          [
            "Joined",
            t.join_date
              ? new Date(t.join_date).toLocaleDateString("en-IN")
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
          onClick={() => onView(t)}
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
          onClick={() => onEdit(t)}
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
        {t.is_active ? (
          <button
            className="btn btn-danger"
            onClick={() => onTerminate(t)}
            style={{ fontSize: 11, padding: "6px 8px" }}
            title="Terminate"
          >
            <Icon name="trash" size={12} />
          </button>
        ) : (
          <button
            className="btn btn-success"
            onClick={() => onReactivate(t)}
            style={{ fontSize: 11, padding: "6px 8px" }}
            title="Reactivate"
          >
            <Icon name="check" size={12} />
          </button>
        )}
      </div>
    </div>
  </div>
);
