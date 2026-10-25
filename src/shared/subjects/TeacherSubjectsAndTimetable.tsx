// FILE: teacher-app/src/shared/subjects/TeacherSubjectsAndTimetable.tsx
// Source: admin App.tsx -> TeacherSubjectsAndTimetable [1245-1387]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { DAY_SHORT } from "./helpers";
import { C } from "../../theme/theme";

export const TeacherSubjectsAndTimetable = ({ teacher, academicYearId }) => {
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState({ days: {} });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("subjects"); // 'subjects' | 'timetable'

  useEffect(() => {
    if (!teacher?.user_id) return;
    (async () => {
      setLoading(true);
      try {
        const [subRes, ttRes] = await Promise.all([
          apiRequest(`/teachers/${teacher.user_id}/assigned-subjects`),
          academicYearId
            ? apiRequest(
                `/timetable/teacher/${teacher.user_id}?academic_year_id=${academicYearId}`
              )
            : Promise.resolve(null),
        ]);
        setSubjects(Array.isArray(subRes?.data) ? subRes.data : []);
        if (ttRes) setTimetable(ttRes.data || { days: {} });
      } catch (e) {
        console.error("Failed to load teacher subjects/timetable", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [teacher?.user_id, academicYearId]);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => setView("subjects")}
          className={`tab ${view === "subjects" ? "active" : ""}`}
          style={{ fontSize: 12 }}
        >
          📚 Subjects Assigned
        </button>
        <button
          onClick={() => setView("timetable")}
          className={`tab ${view === "timetable" ? "active" : ""}`}
          style={{ fontSize: 12 }}
        >
          🗓 7-Day Timetable
        </button>
      </div>

      {loading ? (
        <div
          className="pulse"
          style={{
            textAlign: "center",
            color: C.primary,
            padding: 16,
            fontSize: 12,
          }}
        >
          Loading…
        </div>
      ) : view === "subjects" ? (
        subjects.length === 0 ? (
          <div
            style={{
              padding: "14px 16px",
              background: C.surfaceAlt,
              borderRadius: 10,
              fontSize: 12,
              color: C.textMuted,
              textAlign: "center",
            }}
          >
            No subjects assigned yet. Use "Assign Subject" to link this teacher
            to a class + subject.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {subjects.map((s) => (
              <span
              key={s.subject_id}
              className="badge badge-blue"
              style={{ fontSize: 11 }}
            >
              {s.subject_name}
            </span>
            ))}
          </div>
        )
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
            gap: 8,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((day) => {
            const periods = timetable.days?.[day] || [];
            return (
              <div
                key={day}
                style={{
                  background: C.surfaceAlt,
                  borderRadius: 10,
                  padding: 10,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.primary,
                    marginBottom: 6,
                  }}
                >
                  {DAY_SHORT[day]}
                </div>
                {periods.length === 0 ? (
                  <div style={{ fontSize: 10.5, color: C.textMuted }}>Free</div>
                ) : (
                  periods.map((p, i) => (
                    <div key={i} style={{ fontSize: 10.5, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${C.border}33` }}>
                      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>
                        {p.start_time?.slice(0, 5)}–{p.end_time?.slice(0, 5)}
                      </div>
                      <div style={{ fontWeight: 700, color: C.text }}>
                        {p.subject_name || "—"}
                      </div>
                      <div style={{ color: C.textMuted, marginTop: 1 }}>
                        {p.grade_name} - {p.section_name}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
