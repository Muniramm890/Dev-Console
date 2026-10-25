// FILE: teacher-app/src/modules/exams/DateSheetTab.tsx
// Source: admin App.tsx -> DateSheetTab [16722-17106]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { explain } from "../../utils/apiErrors";
import { useGradeSubjects } from "../../shared/subjects/useGradeSubjects";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// DATE SHEET TAB — per exam, pick a class, tick which subjects are
// part of this exam, set date/time/marks via dropdowns+pickers.
// ═══════════════════════════════════════════════════════════════
export const DateSheetTab = ({ examId, examSections, grades, examStatus }) => {
  const locked = examStatus === "published";
  const [sectionId, setSectionId] = useState(examSections[0]?.id || "");
  const currentSection = examSections.find((s) => s.id === sectionId);
  const gradeId = currentSection?.grade_id;
  const { subjects: classSubjects } = useGradeSubjects(gradeId);

  const [rows, setRows] = useState({}); // subject_id -> {included, exam_date, start_time, duration_minutes, max_marks, passing_marks}
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkMax, setBulkMax] = useState(80);
  const [bulkDuration, setBulkDuration] = useState(120);

  const load = async () => {
    if (!sectionId) return;
    setLoading(true);
    try {
      const res = await apiRequest(
        `/exams/${examId}/datesheet?section_id=${sectionId}`
      );
      const existing = Array.isArray(res?.data) ? res.data : [];
      const map = {};
      existing.forEach((r) => {
        map[r.subject_id] = {
          included: true,
          is_grade_only: !!r.is_grade_only, // 🔴 FIX: Checkbox state loaded from DB
          exam_date: r.exam_date?.split("T")[0] || "",
          start_time: r.start_time || "09:00",
          duration_minutes: r.duration_minutes || 120,
          max_marks: r.max_marks ?? 80,         // 🔴 FIX: Preserves 0 instead of defaulting to 80
          passing_marks: r.passing_marks ?? 33, // 🔴 FIX: Preserves 0 instead of defaulting to 33
        };
      });
      setRows(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sectionId]); // eslint-disable-line

  const toggleRow = (subjectId) => {
    setRows((prev) => {
      const cur = prev[subjectId];
      if (cur?.included) {
        return { ...prev, [subjectId]: { ...cur, included: false } };
      }
      return {
        ...prev,
        [subjectId]: {
          included: true,
          exam_date: cur?.exam_date || "",
          start_time: cur?.start_time || "09:00",
          duration_minutes: cur?.duration_minutes || bulkDuration,
          max_marks: cur?.max_marks || bulkMax,
          passing_marks:
            cur?.passing_marks ||
            Math.round((cur?.max_marks || bulkMax) * 0.33),
        },
      };
    });
  };

  const setRowField = (subjectId, field, value) => {
    setRows((prev) => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], [field]: value },
    }));
  };

  const applyBulkToAll = () => {
    setRows((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sid) => {
        if (next[sid]?.included) {
          next[sid] = {
            ...next[sid],
            max_marks: bulkMax,
            duration_minutes: bulkDuration,
          };
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    const entries = Object.entries(rows)
      .filter(([, r]) => r.included)
      .map(([subject_id, r]) => ({
        section_id: sectionId,
        subject_id,
        exam_date: r.exam_date || null,
        start_time: r.start_time,
        duration_minutes: Number(r.duration_minutes) || 120,
        max_marks: r.is_grade_only ? 0 : Number(r.max_marks),
        // blank = let the server use 33% of max; an explicit 0 is kept ("no pass mark")
        passing_marks: r.is_grade_only ? 0 : (r.passing_marks === "" || r.passing_marks === null || r.passing_marks === undefined ? null : Number(r.passing_marks)),
        is_grade_only: !!r.is_grade_only // 
      }));

    if (locked) { alert("Results are published. Unpublish the exam first to change the date sheet."); return; }
    const badMax = entries.find((e) => !e.is_grade_only && !(e.max_marks > 0));
    if (badMax) { alert("Max marks must be greater than 0 for every ticked subject."); return; }
    const badPass = entries.find((e) => !e.is_grade_only && e.passing_marks !== null && e.passing_marks > e.max_marks);
    if (badPass) { alert(`Passing marks (${badPass.passing_marks}) cannot be more than max marks (${badPass.max_marks}).`); return; }
    if (entries.some((e) => !e.exam_date)) {
      alert("Please set an exam date for every ticked subject.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest(`/exams/${examId}/datesheet`, "PUT", {
        section_id: sectionId,
        entries,
      });
      alert("✅ Date sheet saved!");
      await load();
    } catch (e) {
      alert("Save failed: " + explain(e));
    } finally {
      setSaving(false);
    }
  };

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
              CLASS / SECTION
            </label>
            <select
              className="select"
              style={{ width: 220 }}
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            >
              {examSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.grade_name} — {s.name}
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
              BULK MAX MARKS
            </label>
            <select
              className="select"
              style={{ width: 110 }}
              value={bulkMax}
              onChange={(e) => setBulkMax(Number(e.target.value))}
            >
              {[20, 25, 40, 50, 80, 100].map((v) => (
                <option key={v} value={v}>
                  {v}
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
              BULK DURATION
            </label>
            <select
              className="select"
              style={{ width: 130 }}
              value={bulkDuration}
              onChange={(e) => setBulkDuration(Number(e.target.value))}
            >
              {[60, 90, 120, 150, 180].map((v) => (
                <option key={v} value={v}>
                  {v} min
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-ghost" onClick={applyBulkToAll}>
            Apply to Ticked Subjects
          </button>
          <button
            className="btn btn-primary"
            style={{ marginLeft: "auto" }}
            onClick={handleSave}
            disabled={saving || locked}
          >
            {saving ? "Saving…" : "Save Date Sheet"}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div
            className="pulse"
            style={{ padding: 30, textAlign: "center", color: C.primary }}
          >
            Loading subjects…
          </div>
        ) : classSubjects.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>
          No subjects configured for this class. Set them up in School Setup →
          Subjects tab first.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ minWidth: 760 }}>
            <thead>
            <tr>
                <th style={{ width: 40 }}></th>
                <th>Subject</th>
                <th>Grade Only?</th> {/* 🔴 NEW COLUMN */}
                <th>Date</th>
                <th>Start Time</th>
                <th>Duration</th>
                <th>Max Marks</th>
                <th>Passing</th>
              </tr>
            </thead>
            <tbody>
              {classSubjects.map((sub) => {
                const r = rows[sub.id] || {};
                return (
                  <tr key={sub.id} style={{ background: r.is_grade_only ? `${C.yellow}11` : "transparent" }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!r.included}
                        onChange={() => toggleRow(sub.id)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: "pointer",
                          accentColor: C.primary,
                        }}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{sub.name}</td>
                    {/* 🔴 NEW: Grade Only Checkbox */}
                    <td>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: r.is_grade_only ? C.yellow : C.textMuted }}>
                      <input
                          type="checkbox"
                          checked={!!r.is_grade_only}
                          disabled={!r.included}
                          onChange={(e) => {
                            const isGrade = e.target.checked;
                            setRows(prev => ({
                              ...prev,
                              [sub.id]: {
                                ...prev[sub.id],
                                is_grade_only: isGrade,
                                max_marks: isGrade ? 0 : 80,
                                passing_marks: isGrade ? 0 : 26
                              }
                            }));
                          }}
                          style={{ accentColor: C.yellow }}
                        />
                        Yes
                      </label>
                    </td>
                    <td>
                      <input
                        className="input"
                        type="date"
                        style={{ width: 150 }}
                        disabled={!r.included}
                        value={r.exam_date || ""}
                        onChange={(e) =>
                          setRowField(sub.id, "exam_date", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        type="time"
                        style={{ width: 110 }}
                        disabled={!r.included}
                        value={r.start_time || "09:00"}
                        onChange={(e) =>
                          setRowField(sub.id, "start_time", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="select"
                        style={{ width: 110 }}
                        disabled={!r.included}
                        value={r.duration_minutes || 120}
                        onChange={(e) =>
                          setRowField(
                            sub.id,
                            "duration_minutes",
                            e.target.value
                          )
                        }
                      >
                        {[60, 90, 120, 150, 180].map((v) => (
                          <option key={v} value={v}>
                            {v} min
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="select"
                        style={{ width: 90 }}
                        disabled={!r.included || r.is_grade_only}
                        value={r.is_grade_only ? 0 : (r.max_marks ?? 80)} // 🔴 FIX: Using ?? instead of ||
                        onChange={(e) =>
                          setRowField(sub.id, "max_marks", e.target.value)
                        }
                      >
                        {r.is_grade_only && <option value={0}>0 (NIL)</option>} {/* 🔴 FIX: Show NIL */}
                        {[20, 25, 40, 50, 80, 100].map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="select"
                        style={{ width: 90 }}
                        disabled={!r.included || r.is_grade_only}
                        value={r.is_grade_only ? 0 : (r.passing_marks ?? Math.round((r.max_marks || 80) * 0.33))}
                        onChange={(e) =>
                          setRowField(sub.id, "passing_marks", e.target.value)
                        }
                      >
                        {r.is_grade_only && <option value={0}>0 (NIL)</option>}
                        {Array.from({ length: 10 }, (_, i) =>
                          Math.round((r.max_marks || 80) * (0.2 + i * 0.05))
                        ).map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};
