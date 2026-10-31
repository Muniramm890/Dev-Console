// FILE: teacher-app/src/modules/timetable/TeacherWeeklyViewTab.tsx
// Source: admin App.tsx -> TeacherWeeklyViewTab [11421-11549]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { DAY_LABELS_FULL } from "./helpers";
import { C } from "../../theme/theme";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { useDialog } from "../../contexts/DialogContext";
import { Icon } from "../../components/ui/Icon";

export const TeacherWeeklyViewTab = ({ academicYearId }) => {
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState("");
  const [data, setData] = useState({ days: {} });
  const [loading, setLoading] = useState(false);
  const { dialogAlert } = useDialog();
  const [printing, setPrinting] = useState(false);
  // Whole-school teacher-wise master timetable (teachers x days x periods, 1-2 pages) rendered by the backend, opens in the in-app viewer
  const handlePrint = async () => {
    setPrinting(true);
    try { await openGeneratedPdf(`/timetable/print/teachers?academic_year_id=${academicYearId}`, { name: "Teacher-wise Timetable.pdf", title: "Teacher-wise Timetable" }); }
    catch (e) { await dialogAlert(e.message || "Could not generate the PDF", "PDF failed"); }
    finally { setPrinting(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest("/teachers");
        setTeachers(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const load = async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const res = await apiRequest(
        `/timetable/teacher/${teacherId}?academic_year_id=${academicYearId}`
      );
      setData(res?.data || { days: {} });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [teacherId, academicYearId]); // eslint-disable-line

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <select
          className="select"
          style={{ width: 240 }}
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        >
          <option value="">-- Select Teacher --</option>
          {teachers.map((t) => (
            <option key={t.user_id} value={t.user_id}>
              {t.full_name}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={handlePrint} disabled={printing} title="Print timetable of all teachers (PDF)">
          <Icon name="download" size={14} /> {printing ? "Preparing…" : "Print All Teachers"}
        </button>
      </div>

      {!teacherId ? (
        <div
          className="card"
          style={{ padding: 40, textAlign: "center", color: C.textMuted }}
        >
          Select a teacher to view their weekly schedule.
        </div>
      ) : loading ? (
        <div
          className="card pulse"
          style={{ padding: 40, textAlign: "center", color: C.primary }}
        >
          Loading…
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
            gap: 14,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((day) => {
            const periods = data.days?.[day] || [];
            return (
              <div key={day} className="card">
                <h4
                  className="syne"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 10,
                    color: C.primary,
                  }}
                >
                  {DAY_LABELS_FULL[day]}
                </h4>
                {periods.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      padding: "10px 0",
                    }}
                  >
                    No classes
                  </div>
                ) : (
                  periods.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "8px 0",
                        borderBottom: `1px solid ${C.border}22`,
                      }}
                    >
                      <div style={{ fontSize: 11, color: C.textMuted }}>
                        {p.start_time?.slice(0, 5)}–{p.end_time?.slice(0, 5)}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                        {p.subject_name || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>
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
