// FILE: teacher-app/src/modules/timetable/BuildTimetableTab.tsx
// Source: admin App.tsx -> BuildTimetableTab [10926-11406]
// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import { DAYS, subjectColor } from "./helpers";
import { useGradeSubjects } from "../../shared/subjects/useGradeSubjects";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// BUILD TIMETABLE — the main visual grid, class-chip driven
// ═══════════════════════════════════════════════════════════════
export const BuildTimetableTab = ({ academicYearId }) => {
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [periods, setPeriods] = useState([]);
  const [grid, setGrid] = useState({}); // grid[day][period_slot_id] = { subject_id, teacher_id, room_no, ...names }
  const [subjectTeacherMap, setSubjectTeacherMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [allTeachers, setAllTeachers] = useState([]);
  const [checkingCell, setCheckingCell] = useState(null);

  const { subjects: classSubjects } = useGradeSubjects(gradeId);

  // Flat, sorted class list for the chip selector: 6A, 6B, 7A, 7B, 11-Science...
  const classList = grades
    .flatMap((g) =>
      sections
        .filter((s) => s.grade_id === g.id)
        .map((s) => ({
          ...s,
          gradeName: g.name,
          numeric_order: g.numeric_order,
          stream: g.stream,
        }))
    )
    .sort(
      (a, b) =>
        a.numeric_order - b.numeric_order || a.name.localeCompare(b.name)
    );

    useEffect(() => {
      (async () => {
        try {
          const [gRes, sRes, pRes, tRes, stRes] = await Promise.all([
            apiRequest("/setup/grades"),
            apiRequest(`/setup/sections?academic_year_id=${academicYearId}`),
            apiRequest("/timetable/periods"),
            apiRequest("/teachers"),
            apiRequest("/teachers/subject-teachers/all"),
          ]);
          setGrades(Array.isArray(gRes?.data) ? gRes.data : []);
          setSections(Array.isArray(sRes?.data) ? sRes.data : []);
          setPeriods(Array.isArray(pRes?.data) ? pRes.data : []);
          setAllTeachers(Array.isArray(tRes?.data) ? tRes.data : []);
          const rows = Array.isArray(stRes?.data) ? stRes.data : [];
          const map = {};
          rows.forEach((r) => {
            if (!map[r.subject_id]) map[r.subject_id] = [];
            map[r.subject_id].push(r);
          });
          setSubjectTeacherMap(map);
        } catch (e) {
          console.error(e);
        }
      })();
    }, [academicYearId]); // session badalne par sections dobara load
    

  useEffect(() => {
    if (classList.length && (!sectionId || !classList.some((c) => c.id === sectionId))) {
      setGradeId(classList[0].grade_id);
      setSectionId(classList[0].id);
    }
  }, [classList]); // eslint-disable-line

  const selectClass = (cls) => {
    if (dirty && !confirm("You have unsaved changes. Switch class anyway?"))
      return;
    setGradeId(cls.grade_id);
    setSectionId(cls.id);
  };

  const gridReq = useRef(0);
  const loadGrid = async () => {
    if (!sectionId || !academicYearId) return;
    const myReq = ++gridReq.current;
    setLoading(true);
    setConflicts([]);
    setDirty(false);
    try {
      const ttRes = await apiRequest(
        `/timetable/section/${sectionId}?academic_year_id=${academicYearId}`
      );
      if (myReq !== gridReq.current) return; // stale response
      const entries = Array.isArray(ttRes?.data) ? ttRes.data : [];
      const g = {};
      entries.forEach((e) => {
        if (!g[e.day_of_week]) g[e.day_of_week] = {};
        g[e.day_of_week][e.period_slot_id] = {
          subject_id: e.subject_id,
          teacher_id: e.teacher_id,
          teacher_name: e.teacher_name,
          subject_name: e.subject_name,
          room_no: e.room_no,
        };
      });
      setGrid(g);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadGrid();
  }, [sectionId, academicYearId]); // eslint-disable-line

  const setCell = (day, slotId, patch) => {
    setGrid((prev) => {
      const next = { ...prev, [day]: { ...(prev[day] || {}) } };
      next[day][slotId] = { ...(next[day][slotId] || {}), ...patch };
      return next;
    });
    setDirty(true);
  };

  const clearCell = (day, slotId) => {
    setGrid((prev) => {
      const next = { ...prev, [day]: { ...(prev[day] || {}) } };
      delete next[day][slotId];
      return next;
    });
    setDirty(true);
  };

  const handleSubjectSelect = (day, slotId, subjectId) => {
    if (!subjectId) {
      clearCell(day, slotId);
      return;
    }
    const subjectName = classSubjects.find((s) => s.id === subjectId)?.name || "";
    const matches = subjectTeacherMap[subjectId] || [];
    const autoFill = matches.length === 1 ? matches[0] : null;
    setCell(day, slotId, {
      subject_id: subjectId,
      subject_name: subjectName,
      teacher_id: autoFill ? autoFill.teacher_user_id : "",
      teacher_name: autoFill ? autoFill.teacher_name : "",
    });
  };


  const handleTeacherSelect = (day, slotId, teacherId, teacherName) => {
    setCell(day, slotId, {
      teacher_id: teacherId,
      teacher_name: teacherName,
    });
  };


  const handleSave = async () => {
    const entries = [];
    Object.entries(grid).forEach(([day, slots]) => {
      Object.entries(slots).forEach(([slotId, cell]) => {
        if (cell?.subject_id || cell?.teacher_id) {
          entries.push({
            day_of_week: Number(day),
            period_slot_id: slotId,
            subject_id: cell.subject_id || null,
            teacher_id: cell.teacher_id || null,
            room_no: cell.room_no || null,
          });
        }
      });
    });

    setSaving(true);
    setConflicts([]);
    try {
      await apiRequest("/timetable/section", "PUT", {
        section_id: sectionId,
        academic_year_id: academicYearId,
        entries,
      });
      alert("✅ Timetable saved successfully!");
      setDirty(false);
      await loadGrid();
    } catch (e) {
      if (e?.response?.data?.conflicts) setConflicts(e.response.data.conflicts);
      else alert("❌ Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const currentClass = classList.find((c) => c.id === sectionId);
  const totalCells = periods.filter((p) => !p.is_break).length * DAYS.length;
  const filledCells = Object.values(grid).reduce(
    (sum, day) => sum + Object.values(day).filter((c) => c.subject_id).length,
    0
  );

  return (
    <div>
      {currentClass && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <select
              className="select"
              style={{
                fontSize: 15,
                fontWeight: 700,
                padding: "6px 10px",
                minWidth: 160,
                marginBottom: 4,
              }}
              value={sectionId}
              onChange={(e) => {
                const cls = classList.find((c) => c.id === e.target.value);
                if (cls) selectClass(cls);
              }}
            >
              {classList.length === 0 && <option value="">No classes found</option>}
              {classList.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.gradeName}
                  {cls.stream && cls.stream !== "none" ? ` (${cls.stream})` : ""} — {cls.name}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {filledCells} of {totalCells} periods filled
              {dirty && (
                <span style={{ color: C.yellow, fontWeight: 700 }}>
                  {" "}
                  · Unsaved changes
                </span>
              )}
            </div>
          </div>
          <div
            className="progress-bar"
            style={{ flex: 1, minWidth: 120, maxWidth: 240 }}
          >
            <div
              className="progress-fill"
              style={{
                width: `${
                  totalCells > 0 ? (filledCells / totalCells) * 100 : 0
                }%`,
                background: C.primary,
              }}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ marginLeft: "auto" }}
            onClick={handleSave}
            disabled={saving || loading || periods.length === 0}
          >
            {saving ? "Saving…" : "Save Timetable"}
          </button>
        </div>
      )}

      {periods.length === 0 && (
        <div
          className="card"
          style={{
            padding: 20,
            textAlign: "center",
            color: C.yellow,
            border: `1px solid ${C.yellow}44`,
            marginBottom: 16,
          }}
        >
          ⚠ No period structure set up yet. Go to "Period Structure" tab first.
        </div>
      )}

      {conflicts.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            border: `1px solid ${C.red}44`,
            background: `${C.red}0d`,
          }}
        >
          <h4
            style={{
              color: C.red,
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            ⚠ Scheduling Conflicts — Nothing Saved
          </h4>
          {conflicts.map((c, i) => (
            <div
              key={i}
              style={{ fontSize: 12.5, color: C.textMuted, padding: "4px 0" }}
            >
              <b style={{ color: C.text }}>{c.day}</b> — this teacher is already
              teaching <b style={{ color: C.text }}>{c.conflicting_with}</b> at
              this period.
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div
          className="card pulse"
          style={{ padding: 60, textAlign: "center", color: C.primary }}
        >
          Loading timetable…
        </div>
      ) : !sectionId ? (
        <div
          className="card"
          style={{ padding: 60, textAlign: "center", color: C.textMuted }}
        >
          Pick a class above to begin.
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto", padding: 12 }}>
          <table
            className="table"
            style={{
              minWidth: 950,
              borderCollapse: "separate",
              borderSpacing: "4px",
            }}
          >
            <thead>
              <tr>
                <th style={{ width: 110 }}>Period</th>
                {DAYS.map((d) => (
                  <th key={d.num} style={{ textAlign: "center" }}>
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <td style={{ background: C.surfaceAlt, borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>
                      {p.start_time?.slice(0, 5)}–{p.end_time?.slice(0, 5)}
                    </div>
                  </td>
                  {p.is_break ? (
                    <td
                      colSpan={DAYS.length}
                      style={{
                        textAlign: "center",
                        background: `${C.yellow}11`,
                        color: C.yellow,
                        fontWeight: 700,
                        fontSize: 12,
                        borderRadius: 8,
                      }}
                    >
                      {p.label}
                    </td>
                  ) : (
                    DAYS.map((d) => {
                      const cell = grid[d.num]?.[p.id] || {};
                      const color = subjectColor(cell.subject_name);
                      const isChecking = checkingCell === `${d.num}-${p.id}`;
                      return (
                        <td
                          key={d.num}
                          style={{
                            minWidth: 150,
                            verticalAlign: "top",
                            padding: 8,
                            borderRadius: 10,
                            background: cell.subject_id
                              ? `${color}14`
                              : C.surfaceAlt,
                            borderLeft: cell.subject_id
                              ? `3px solid ${color}`
                              : `3px solid transparent`,
                          }}
                        >
                          <select
                            className="select"
                            style={{
                              fontSize: 11,
                              padding: "5px 6px",
                              marginBottom: 4,
                            }}
                            value={cell.subject_id || ""}
                            onChange={(e) =>
                              handleSubjectSelect(d.num, p.id, e.target.value)
                            }
                          >
                            <option value="">-- Free --</option>
                            {classSubjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          {cell.subject_id && (() => {
                           const assigned = subjectTeacherMap[cell.subject_id] || [];
                           const assignedIds = new Set(assigned.map((a) => a.teacher_user_id));
                            const others = allTeachers.filter((t) => !assignedIds.has(t.user_id));
                             return (
                              <select
                                className="select"
                                style={{
                                  fontSize: 10.5,
                                  padding: "4px 6px",
                                  opacity: isChecking ? 0.5 : 1,
                                }}
                                value={cell.teacher_id || ""}
                                disabled={isChecking}
                                onChange={(e) => {
                                  const opt = e.target.selectedOptions[0];
                                  handleTeacherSelect(
                                    d.num,
                                    p.id,
                                    e.target.value,
                                    opt?.text || ""
                                  );
                                }}
                              >
                                <option value="">
                                  {isChecking ? "Checking…" : "-- Teacher --"}
                                </option>
                                {assigned.length > 0 && (
                                  <optgroup label="Assigned to this subject">
                                    {assigned.map((a) => (
                                      <option key={a.teacher_user_id} value={a.teacher_user_id}>
                                        {a.teacher_name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {others.length > 0 && (
                                  <optgroup label="Other Teachers (override)">
                                    {others.map((t) => (
                                      <option key={t.user_id} value={t.user_id}>
                                        {t.full_name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            );
                          })()}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

     <div style={{ marginTop: 10, fontSize: 11.5, color: C.textMuted }}>
        💡 Teacher dropdown auto-fills when exactly one teacher is assigned
        (School Setup → Subject Assignment). Multiple assigned teachers show
        as options; picking one who's already busy at that exact day+period
        pops up a warning immediately.
      </div>
    </div>
  );
};
