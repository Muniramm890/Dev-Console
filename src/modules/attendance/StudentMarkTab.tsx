// FILE: teacher-app/src/modules/attendance/StudentMarkTab.tsx
// Source: admin App.tsx -> StudentMarkTab [12336-12659]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { StatusPicker } from "./StatusPicker";
import { useGradesAndSections } from "./useGradesAndSections";
import { C } from "../../theme/theme";
import { todayISO } from "../../utils/date";
import { STATUS_KEYS, STATUS_META } from "../../utils/status";

// ═══════════════════════════════════════════════════════════════
// STUDENTS — TAB 1: MARK ATTENDANCE
// ═══════════════════════════════════════════════════════════════
export const StudentMarkTab = () => {
  const { grades, sections, loading: secLoading } = useGradesAndSections();
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [roster, setRoster] = useState([]);
  const [counts, setCounts] = useState({ P: 0, A: 0, L: 0, OD: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [uploadingStudentPhoto, setUploadingStudentPhoto] = useState(false);

  

  const filteredSections = sections.filter((s) => s.grade_id === gradeId);

  useEffect(() => {
    if (grades.length && !gradeId) setGradeId(grades[0].id);
  }, [grades]); // eslint-disable-line

  // session badalne par agar selected section naye session me nahi hai to reset
  useEffect(() => {
    if (!secLoading && sectionId && !sections.some((s) => s.id === sectionId)) {
      setSectionId(filteredSections[0]?.id || "");
      if (!filteredSections.length) { setRoster([]); setCounts({ P: 0, A: 0, L: 0, OD: 0 }); }
    }
  }, [sections, secLoading]); // eslint-disable-line

  useEffect(() => {
    if (gradeId && filteredSections.length && !sectionId) {
      setSectionId(filteredSections[0].id);
    }
  }, [gradeId, sections]); // eslint-disable-line

  const loadRoster = async () => {
    if (!sectionId || !date) return;
    setLoading(true);
    try {
      const res = await apiRequest(
        `/attendance/students/roster?section_id=${sectionId}&date=${date}`
      );
      setRoster(res?.data?.students || []);
      setCounts(res?.data?.counts || { P: 0, A: 0, L: 0, OD: 0 });
    } catch (e) {
      console.error("Roster load failed", e);
      setRoster([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, [sectionId, date]); // eslint-disable-line

  const setStatus = (studentId, status) => {
    setRoster((prev) => {
      const next = prev.map((r) =>
        r.student_id === studentId ? { ...r, status } : r
      );
      const c = { P: 0, A: 0, L: 0, OD: 0 };
      next.forEach((r) => {
        c[r.status] = (c[r.status] || 0) + 1;
      });
      setCounts(c);
      return next;
    });
  };

  const markAll = (status) => {
    setRoster((prev) => prev.map((r) => ({ ...r, status })));
    const c = { P: 0, A: 0, L: 0, OD: 0 };
    c[status] = roster.length;
    setCounts(c);
  };

  const handleSave = async () => {
    if (!roster.length) return;
    setSaving(true);
    try {
      await apiRequest("/attendance/students/mark", "POST", {
        section_id: sectionId,
        date,
        entries: roster.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          remarks: r.remarks || null,
        })),
      });
      alert("✅ Attendance saved successfully!");
    } catch (e) {
      alert("❌ Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const total = roster.length || 1;

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: C.textMuted,
                marginBottom: 4,
              }}
            >
              CLASS
            </label>
            <select
              className="select"
              style={{ width: 150 }}
              value={gradeId}
              onChange={(e) => {
                setGradeId(e.target.value);
                setSectionId("");
              }}
            >
              <option value="">-- Select --</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: C.textMuted,
                marginBottom: 4,
              }}
            >
              SECTION
            </label>
            <select
              className="select"
              style={{ width: 120 }}
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!gradeId}
            >
              <option value="">-- Select --</option>
              {filteredSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: C.textMuted,
                marginBottom: 4,
              }}
            >
              DATE
            </label>
            <input
              className="input"
              type="date"
              style={{ width: 150 }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayISO()}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              marginLeft: "auto",
              flexWrap: "wrap",
            }}
          >
            {STATUS_KEYS.map((s) => (
              <div key={s} style={{ textAlign: "center" }}>
                <div
                  className="syne"
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: STATUS_META[s].color,
                  }}
                >
                  {counts[s] || 0}
                </div>
                <div style={{ fontSize: 10, color: C.textMuted }}>
                  {STATUS_META[s].label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}
      >
        <button className="btn btn-success" onClick={() => markAll("P")}>
          Mark All Present
        </button>
        <button className="btn btn-danger" onClick={() => markAll("A")}>
          Mark All Absent
        </button>
        <button className="btn btn-ghost" onClick={() => markAll("L")}>
          Mark All Leave
        </button>
        <button
          className="btn btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? "Saving…" : "Save Attendance"}
        </button>
      </div>

      {roster.length > 0 && (
        <div
          className="progress-bar"
          style={{ marginBottom: 16, display: "flex" }}
        >
          {STATUS_KEYS.map((s) => (
            <div
              key={s}
              style={{
                width: `${((counts[s] || 0) / total) * 100}%`,
                background: STATUS_META[s].color,
                height: "100%",
              }}
            />
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div
            style={{ padding: 40, textAlign: "center", color: C.primary }}
            className="pulse"
          >
            Loading roster…
          </div>
        ) : roster.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
            No students found for this class/section.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Student</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.student_id}>
                    <td style={{ color: C.textMuted, fontSize: 12 }}>
                      {r.roll_no || "—"}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background:
                              r.gender === "GIRL"
                                ? `${C.purple}33`
                                : `${C.blue}33`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            color: r.gender === "GIRL" ? C.purple : C.blue,
                          }}
                        >
                          {(r.first_name?.[0] || "?").toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          {[r.first_name, r.middle_name, r.last_name]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <StatusPicker
                        value={r.status}
                        onChange={(s) => setStatus(r.student_id, s)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
