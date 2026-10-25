// FILE: teacher-app/src/modules/attendance/StudentIndividualTab.tsx
// Source: admin App.tsx -> StudentIndividualTab [13236-13510]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useGradesAndSections } from "./useGradesAndSections";
import { C } from "../../theme/theme";
import { daysAgoISO, todayISO } from "../../utils/date";
import { STATUS_KEYS, STATUS_META } from "../../utils/status";

// ═══════════════════════════════════════════════════════════════
// STUDENTS — TAB 4: INDIVIDUAL STUDENT
// ═══════════════════════════════════════════════════════════════
export const StudentIndividualTab = () => {
  const { grades, sections, loading: secLoading } = useGradesAndSections();
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentsList, setStudentsList] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());
  const [history, setHistory] = useState({
    records: [],
    counts: {},
    percentage: 0,
    totalMarked: 0,
  });
  const [loading, setLoading] = useState(false);

  const filteredSections = sections.filter((s) => s.grade_id === gradeId);

  useEffect(() => {
    if (!sectionId) {
      setStudentsList([]);
      return;
    }
    (async () => {
      try {
        const res = await apiRequest(
          `/students?section_id=${sectionId}&limit=200`
        );
        setStudentsList(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        setStudentsList([]);
      }
    })();
  }, [sectionId]);

  useEffect(() => {
    if (!secLoading && sectionId && !sections.some((s) => s.id === sectionId)) setSectionId("");
  }, [sections, secLoading]); // eslint-disable-line

  const loadHistory = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await apiRequest(
        `/attendance/students/${studentId}/history?from=${from}&to=${to}`
      );
      setHistory(
        res?.data || { records: [], counts: {}, percentage: 0, totalMarked: 0 }
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadHistory();
  }, [studentId, from, to]); // eslint-disable-line

  const recordMap = {};
  history.records.forEach((r) => {
    recordMap[r.attendance_date?.split("T")[0]] = r.status;
  });

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select
            className="select"
            style={{ width: 150 }}
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSectionId("");
              setStudentId("");
            }}
          >
            <option value="">-- Class --</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 120 }}
            value={sectionId}
            onChange={(e) => {
              setSectionId(e.target.value);
              setStudentId("");
            }}
            disabled={!gradeId}
          >
            <option value="">-- Section --</option>
            {filteredSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 220 }}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={!sectionId}
          >
            <option value="">-- Select Student --</option>
            {studentsList.map((s) => (
              <option key={s.id} value={s.id}>
                {[s.first_name, s.last_name].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            style={{ width: 150 }}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span style={{ alignSelf: "center", color: C.textMuted }}>to</span>
          <input
            className="input"
            type="date"
            style={{ width: 150 }}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            max={todayISO()}
          />
        </div>
      </div>

      {!studentId ? (
        <div
          className="card"
          style={{ padding: 40, textAlign: "center", color: C.textMuted }}
        >
          Select a class, section and student to view their attendance record.
        </div>
      ) : loading ? (
        <div
          className="card pulse"
          style={{ padding: 40, textAlign: "center", color: C.primary }}
        >
          Loading history…
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 20,
                flexWrap: "wrap",
                justifyContent: "space-around",
              }}
            >
              {STATUS_KEYS.map((s) => (
                <div key={s} style={{ textAlign: "center" }}>
                  <div
                    className="syne"
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: STATUS_META[s].color,
                    }}
                  >
                    {history.counts[s] || 0}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    {STATUS_META[s].label}
                  </div>
                </div>
              ))}
              <div style={{ textAlign: "center" }}>
                <div
                  className="syne"
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: history.percentage >= 75 ? C.primary : C.red,
                  }}
                >
                  {history.percentage}%
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>Overall</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3
              className="syne"
              style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}
            >
              Day-by-Day Calendar
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                gap: 6,
                maxWidth: 460,
              }}
            >
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div
                  key={i}
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: C.textMuted,
                    fontWeight: 600,
                    padding: "4px 0",
                  }}
                >
                  {d}
                </div>
              ))}
              {(() => {
                const start = new Date(from);
                const days = [];
                const startPad = start.getDay();
                for (let i = 0; i < startPad; i++) days.push(null);
                const cur = new Date(from);
                const end = new Date(to);
                while (cur <= end) {
                  days.push(cur.toISOString().split("T")[0]);
                  cur.setDate(cur.getDate() + 1);
                }
                return days.map((d, i) => {
                  const status = d ? recordMap[d] : null;
                  const meta = status ? STATUS_META[status] : null;
                  return (
                    <div
                      key={i}
                      title={d || ""}
                      style={{
                        aspectRatio: "1",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 600,
                        background: !d
                          ? "transparent"
                          : meta
                          ? `${meta.color}33`
                          : C.surfaceAlt,
                        color: !d
                          ? "transparent"
                          : meta
                          ? meta.color
                          : C.textMuted,
                        border: `1px solid ${
                          !d
                            ? "transparent"
                            : meta
                            ? meta.color + "55"
                            : C.border
                        }`,
                      }}
                    >
                      {d ? new Date(d).getDate() : ""}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
