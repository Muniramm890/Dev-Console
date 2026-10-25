// FILE: teacher-app/src/modules/exams/MarksEntryTab.tsx
// Source: admin App.tsx -> MarksEntryTab [17112-17620]
// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import { explain } from "../../utils/apiErrors";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { MARK_STATUS_OPTIONS } from "./helpers";
import { C } from "../../theme/theme";

  // ═══════════════════════════════════════════════════════════════
 // MARKS ENTRY TAB — FIXED WITH BULK CSV IMPORT & STRICT VALIDATION
 // ═══════════════════════════════════════════════════════════════
export const MarksEntryTab = ({ examId, examSections, examStatus }) => {
  const locked = examStatus === "published"; // published results are read-only until unpublished
  const [sectionId, setSectionId] = useState(examSections[0]?.id || "");
  const [datesheet, setDatesheet] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [roster, setRoster] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🔴 Master Grading Scale State
  const [validGrades, setValidGrades] = useState([]);

  useEffect(() => {
    apiRequest("/setup/grading-scale")
      .then(res => {
        const scale = Array.isArray(res?.data) ? res.data : [];
        setValidGrades(scale.map(s => s.grade_label.toUpperCase()));
      })
      .catch(e => {
        console.error("Failed to load grading scale", e);
        setValidGrades(["A+", "A", "B+", "B", "C", "D", "E"]); // Fallback
      });
  }, []);

  // 🔴 CSV Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState(null); // { validPayloads: [], errors: [], previewRows: [] }
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const activeSubjectMeta = datesheet.find((d) => d.subject_id === subjectId);

  // 1. Load Datesheet (Subjects allowed for this exam)
  useEffect(() => {
    (async () => {
      if (!sectionId) return;
      try {
        const res = await apiRequest(`/exams/${examId}/datesheet?section_id=${sectionId}`);
        const list = Array.isArray(res?.data) ? res.data : [];
        setDatesheet(list);
        setSubjectId(list[0]?.subject_id || "");
      } catch (e) { console.error(e); }
    })();
  }, [sectionId, examId]);

  // 2. Load Single Subject Roster
  const loadRoster = async () => {
    if (!sectionId || !subjectId) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/exams/${examId}/marks-roster?section_id=${sectionId}&subject_id=${subjectId}`);
      setRoster(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error(e); setRoster([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRoster(); }, [sectionId, subjectId]); // eslint-disable-line

  const setEntry = (studentId, field, value) => {
    setRoster((prev) => prev.map((r) => r.student_id === studentId ? { ...r, [field]: value } : r));
  };

  const markAllAbsent = () => {
    setRoster((prev) => prev.map((r) => ({ ...r, status: "absent", marks_obtained: null, grade_obtained: null })));
  };

  const handleSave = async () => {
    if (locked) return alert("Results are published. Unpublish the exam first to edit marks.");
    const max = Number(activeSubjectMeta?.max_marks);
    const bad = [];
    const entries = roster.map((r) => {
      const status = r.status || "present";
      // blank marks stay blank (NULL) - the student then shows as "incomplete" instead of silently scoring 0
      const e = { student_id: r.student_id, status, remarks: r.remarks || null, marks_obtained: null, grade_obtained: null };
      if (status === "present") {
        if (activeSubjectMeta?.is_grade_only) e.grade_obtained = r.grade_obtained || null;
        else if (r.marks_obtained !== "" && r.marks_obtained !== null && r.marks_obtained !== undefined) {
          const n = Number(r.marks_obtained);
          if (!Number.isFinite(n) || n < 0 || n > max) bad.push(`${[r.first_name, r.last_name].filter(Boolean).join(" ")}: ${r.marks_obtained}`);
          e.marks_obtained = n;
        }
      }
      return e;
    });
    if (bad.length) return alert(`Marks must be between 0 and ${max}:\n- ${bad.slice(0, 6).join("\n- ")}${bad.length > 6 ? `\n...and ${bad.length - 6} more` : ""}`);
    const blank = entries.filter((e) => e.status === "present" && e.marks_obtained === null && e.grade_obtained === null).length;
    if (blank > 0 && !window.confirm(`${blank} student(s) have no marks/grade entered and will show as "incomplete". Save anyway?`)) return;
    setSaving(true);
    try {
      await apiRequest(`/exams/${examId}/marks`, "POST", { exam_subject_id: activeSubjectMeta?.id, entries });
      alert("Marks saved successfully!");
      await loadRoster();
    } catch (e) { alert("Save failed: " + explain(e)); } finally { setSaving(false); }
  };

  // ═══════════════════════════════════════════════════════════════
  // 🔴 BULK IMPORT LOGIC (SMART TEMPLATE & VALIDATION)
  // ═══════════════════════════════════════════════════════════════

  const downloadTemplate = async () => {
    if (!sectionId || datesheet.length === 0) return alert("Datesheet not set for this class.");
    
    // Fetch all students for this section to build the template
    let students = [];
    try {
      const res = await apiRequest(`/students?section_id=${sectionId}&limit=200`);
      students = Array.isArray(res?.data) ? res.data : [];
      
      // 🔴 FIX: Sort students strictly by Roll Number (Handles both '1,2,10' and 'A1, B1')
      students.sort((a, b) => {
        const rollA = String(a.enrolment?.roll_no || "");
        const rollB = String(b.enrolment?.roll_no || "");
        return rollA.localeCompare(rollB, undefined, { numeric: true });
      });

    } catch (e) {
      return alert("Failed to fetch students for template.");
    }

    // Prepare CSV Structure
    const headers = ["Student_ID(DO_NOT_EDIT)", "Roll_No", "Student_Name"];
    datesheet.forEach(d => headers.push(`${d.subject_name} (Max:${d.max_marks})`));

    let csvContent = headers.join(",") + "\n";

    students.forEach(s => {
      const name = [s.first_name, s.last_name].filter(Boolean).join(" ");
      const roll = s.enrolment?.roll_no || "";
      let row = [`"${s.id}"`, `"${roll}"`, `"${name}"`];
      // Empty columns for subjects
      datesheet.forEach(() => row.push(""));
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const secMeta = examSections.find(s => s.id === sectionId);
    link.href = url;
    link.download = `Marks_Template_${secMeta?.grade_name}_Sec${secMeta?.name}.csv`;
    link.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => processCSV(ev.target.result);
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  const processCSV = (csvText) => {
    const lines = csvText.trim().split("\n");
    if (locked) return alert("Results are published. Unpublish the exam first to import marks.");
    if (lines.length < 2) return alert("Invalid or empty CSV file.");

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const subjectMap = [];
    
    headers.forEach((h, idx) => {
      if (idx < 3) return; 
      
      // 🔴 FIX: Clean up ALL double spaces and invisible characters before matching
      const rawSubName = h.split(/\s*\(/)[0]; // Splits before the first bracket, handling any spaces
      const subName = rawSubName.replace(/\s+/g, ' ').trim().toLowerCase();
      
      const matchedSubject = datesheet.find(d => 
        (d.subject_name || "").replace(/\s+/g, ' ').trim().toLowerCase() === subName
      );
      
      if (matchedSubject) {
        subjectMap.push({ index: idx, meta: matchedSubject });
      }
    });

    if (subjectMap.length === 0) return alert("No matching subjects found in CSV headers. Please use the downloaded template.");

    const errors = [];
    const previewRows = [];
    const validPayloadsBySubject = {};
    subjectMap.forEach(sm => validPayloadsBySubject[sm.meta.id] = []);

    // 🔴 FIX: Now using dynamically loaded validGrades
    const VALID_GRADES = validGrades.length > 0 ? validGrades : ["A+", "A", "B+", "B", "C", "D", "E"];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const studentId = vals[0];
      const studentName = vals[2] || "Unknown";

      if (!studentId || studentId.length < 5) continue;

      let rowHasError = false;
      const previewMarks = {};

      subjectMap.forEach(sm => {
        const rawMark = vals[sm.index];
        if (!rawMark || rawMark === "") return; // Skip empty cells

        let status = "present";
        let markVal = null;
        let gradeVal = null;
        let displayVal = rawMark;

        const rawUpper = rawMark.toUpperCase();

        // 🔴 1. Check for Special Statuses (AB, L, TC)
        if (rawUpper === "AB" || rawUpper === "ABSENT") {
          status = "absent"; displayVal = "AB";
        } else if (rawUpper === "L" || rawUpper === "LEAVE") {
          status = "leave"; displayVal = "L";
        } else if (rawUpper === "TC") {
          status = "tc"; displayVal = "TC";
        } else if (rawUpper === "EX" || rawUpper === "EXEMPTED") {
          status = "exempted"; displayVal = "EX";
        } else if (rawUpper === "MP" || rawUpper === "MALPRACTICE") {
          status = "malpractice"; displayVal = "MP";
        } 
        // 🔴 2. If Present, check if subject is Grade-Only
        else if (sm.meta.is_grade_only) {
          if (VALID_GRADES.includes(rawUpper)) {
            gradeVal = rawUpper; displayVal = rawUpper;
          } else {
            errors.push(`Row ${i+1} (${studentName}): Invalid grade '${rawMark}' for ${sm.meta.subject_name}. Allowed: ${VALID_GRADES.join(", ")}`);
            rowHasError = true;
          }
        } 
        // 🔴 3. Standard Subject (Marks)
        else {
          markVal = parseFloat(rawMark);
          if (isNaN(markVal)) {
            errors.push(`Row ${i+1} (${studentName}): Invalid mark '${rawMark}' for ${sm.meta.subject_name}. Use AB, L, or TC if not present.`);
            rowHasError = true;
          } else if (markVal > sm.meta.max_marks || markVal < 0) {
            errors.push(`Row ${i+1} (${studentName}): ${markVal} exceeds max marks (${sm.meta.max_marks}) for ${sm.meta.subject_name}`);
            rowHasError = true;
          } else {
            displayVal = markVal;
          }
        }

        previewMarks[sm.meta.subject_name] = displayVal;

        if (!rowHasError) {
          validPayloadsBySubject[sm.meta.id].push({
            student_id: studentId,
            marks_obtained: markVal,
            grade_obtained: gradeVal,
            status: status,
            remarks: null
          });
        }
      });

      if (!rowHasError && Object.keys(previewMarks).length > 0) {
        previewRows.push({ name: studentName, marks: previewMarks });
      }
    }

    setImportData({ validPayloadsBySubject, errors, previewRows });
    setShowImportModal(true);
  };

  const confirmBulkImport = async () => {
    if (!importData) return;
    setImporting(true);
    try {
      const subjectKeys = Object.keys(importData.validPayloadsBySubject);
      let successCount = 0;

      // Smart loop: Hit existing backend API for each subject present in the CSV
      for (const examSubjectId of subjectKeys) {
        const entries = importData.validPayloadsBySubject[examSubjectId];
        if (entries.length > 0) {
          await apiRequest(`/exams/${examId}/marks`, "POST", {
            exam_subject_id: examSubjectId,
            entries: entries
          });
          successCount += entries.length;
        }
      }

      alert(`🎉 Bulk Import Successful! ${successCount} mark entries saved.`);
      setShowImportModal(false);
      setImportData(null);
      await loadRoster(); // Reload the UI grid
    } catch (e) {
      alert("Import failed during saving: " + explain(e));
    } finally {
      setImporting(false);
    }
  };


  const filteredRoster = roster.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) || String(r.roll_no).includes(q);
  });

  const entered = roster.filter((r) => r.marks_obtained !== null && r.marks_obtained !== undefined).length;

  return (
    <div>
      {locked && (
        <div className="card" style={{ marginBottom: 12, borderColor: C.yellow, color: C.yellow, fontSize: 13, fontWeight: 600 }}>
          Results are published - marks are read-only. Unpublish the exam (Results tab) to edit.
        </div>
      )}
      {/* 🔴 OPTIMIZED: Compact, Responsive, One-Liner Header */}
      <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          
          {/* Filters (Class, Subject, Search) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: "1 1 50%" }}>
            <select
              className="select"
              style={{ minWidth: 160, flex: 1, padding: "8px 12px" }}
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            >
              {examSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.grade_name} — Sec {s.name}
                </option>
              ))}
            </select>

            <select
              className="select"
              style={{ minWidth: 160, flex: 1, padding: "8px 12px" }}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={!datesheet.length}
            >
              {datesheet.length === 0 && <option value="">No subjects found</option>}
              {datesheet.map((d) => (
                <option key={d.subject_id} value={d.subject_id}>{d.subject_name}</option>
              ))}
            </select>

            <div style={{ position: "relative", minWidth: 180, flex: 1 }}>
              <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <Icon name="search" size={14} color={C.textMuted} />
              </div>
              <input
                className="input"
                placeholder="Search student..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: "8px 12px 8px 32px", width: "100%" }}
              />
            </div>
          </div>

          {/* Dynamic Meta & Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginLeft: "auto" }}>
            
            {activeSubjectMeta && (
              <div style={{ display: "flex", gap: 8, fontSize: 11, background: C.surfaceAlt, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
                <span style={{ color: C.textMuted }}>Max: <b style={{ color: C.text }}>{activeSubjectMeta.max_marks}</b></span>
                <span style={{ color: C.textMuted }}>Pass: <b style={{ color: C.text }}>{activeSubjectMeta.passing_marks}</b></span>
                <span style={{ color: C.textMuted }}>Done: <b style={{ color: C.primary }}>{entered}/{roster.length}</b></span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              {/* 🔴 NEW: Bulk Actions */}
              <div style={{ display: "flex", background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <button className="btn btn-ghost" style={{ border: "none", borderRadius: 0, padding: "8px 12px" }} title="Download Template" onClick={downloadTemplate}>
                  <Icon name="download" size={14} />
                </button>
                <button className="btn btn-ghost" style={{ border: "none", borderRadius: 0, borderLeft: `1px solid ${C.border}`, padding: "8px 12px" }} title="Upload CSV" onClick={() => fileRef.current?.click()}>
                  <Icon name="setup" size={14} /> CSV
                </button>
                <input type="file" accept=".csv" ref={fileRef} style={{ display: "none" }} onChange={handleFileUpload} />
              </div>

              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "8px 12px" }} onClick={markAllAbsent} disabled={locked}>Mark Absent</button>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: "8px 16px" }} onClick={handleSave} disabled={saving || locked || !activeSubjectMeta}>
                {saving ? "Saving…" : "Save Marks"}
              </button>
            </div>

          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="pulse" style={{ padding: 30, textAlign: "center", color: C.primary }}>Loading roster…</div>
        ) : !activeSubjectMeta ? (
          <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>No subjects scheduled for this class yet.</div>
        ) : filteredRoster.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>No students found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Roll</th>
                  <th>Student</th>
                  <th style={{ width: 160 }}>Status</th>
                  <th style={{ width: 120 }}>Marks (/{activeSubjectMeta.max_marks})</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((r) => (
                  <tr key={r.student_id}>
                    <td style={{ color: C.textMuted }}>{r.roll_no || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{[r.first_name, r.last_name].filter(Boolean).join(" ")}</td>
                    <td>
                      <select className="select" disabled={locked} value={r.status || "present"} onChange={(e) => setEntry(r.student_id, "status", e.target.value)}>
                        {MARK_STATUS_OPTIONS.map((o) => (<option key={o.v} value={o.v}>{o.l}</option>))}
                      </select>
                    </td>
                    {/* 🔴 SMART INPUT: Numbers for core subjects, Dropdown for Grade-Only */}
                    <td>
                      {activeSubjectMeta.is_grade_only ? (
                        <select
                          className="select"
                          disabled={locked || r.status !== "present"}
                          value={r.status === "present" ? r.grade_obtained ?? "" : ""}
                          onChange={(e) => setEntry(r.student_id, "grade_obtained", e.target.value)}
                          style={{ fontWeight: 800, color: C.yellow, width: 100 }}
                        >
                          <option value="">- Grade -</option>
                          {/* 🔴 FIX: Dropdown mapped from Master Scale */}
                          {(validGrades.length > 0 ? validGrades : ["A+", "A", "B+", "B", "C", "D", "E"]).map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="input"
                          type="number"
                          min={0}
                          max={activeSubjectMeta.max_marks}
                          disabled={locked || r.status !== "present"}
                          placeholder={r.status === "present" ? "" : "-"}
                          value={r.status === "present" ? r.marks_obtained ?? "" : ""}
                          onChange={(e) => setEntry(r.student_id, "marks_obtained", e.target.value)}
                          style={{ fontWeight: 800, color: C.primary, width: 100 }}
                        />
                      )}
                    </td>
                    <td>
                      <input className="input" disabled={locked} placeholder="optional" value={r.remarks || ""} onChange={(e) => setEntry(r.student_id, "remarks", e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔴 MODAL: BULK IMPORT PREVIEW & VALIDATION */}
      <Modal open={showImportModal} onClose={() => setShowImportModal(false)} title="Bulk Marks Import" width={750}>
        {importData && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: importData.errors.length > 0 ? `${C.red}11` : `${C.green}11`, borderRadius: 10, border: `1px solid ${importData.errors.length > 0 ? C.red : C.green}`, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: importData.errors.length > 0 ? C.red : C.green }}>
                {importData.errors.length > 0 ? "⚠ Validation Errors Found" : "✅ Data is valid and ready to import"}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>
                Valid Rows: {importData.previewRows.length} | Errors: {importData.errors.length}
              </div>
            </div>

            {importData.errors.length > 0 && (
              <div style={{ background: C.surfaceAlt, border: `1px solid ${C.red}44`, borderRadius: 8, padding: 12, maxHeight: 150, overflowY: "auto", marginBottom: 16 }}>
                {importData.errors.map((err, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.red, marginBottom: 4, fontWeight: 600 }}>• {err}</div>
                ))}
              </div>
            )}

            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: C.text }}>Valid Data Preview</h4>
            <div style={{ maxHeight: 300, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <table className="table" style={{ fontSize: 11 }}>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Extracted Marks (Subject-wise)</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.previewRows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {Object.entries(r.marks).map(([sub, mark]) => (
                            <span key={sub} style={{ background: C.surfaceAlt, padding: "2px 6px", borderRadius: 4, border: `1px solid ${C.border}` }}>
                              {sub}: <b style={{ color: C.primary }}>{mark}</b>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {importData.previewRows.length === 0 && (
                    <tr><td colSpan={2} style={{ textAlign: "center", color: C.textMuted, padding: 20 }}>No valid data found to import.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowImportModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={confirmBulkImport} 
                disabled={importing || importData.previewRows.length === 0 || importData.errors.length > 0}
                style={{ opacity: (importing || importData.previewRows.length === 0 || importData.errors.length > 0) ? 0.6 : 1 }}
              >
                {importing ? "Importing..." : "Confirm & Import Marks"}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
