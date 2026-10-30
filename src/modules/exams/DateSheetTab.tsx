// FILE: teacher-app/src/modules/exams/DateSheetTab.tsx
// Source: admin App.tsx -> DateSheetTab [16722-17106]
// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import { explain } from "../../utils/apiErrors";
import { useGradeSubjects } from "../../shared/subjects/useGradeSubjects";
import { C } from "../../theme/theme";
import { AdmitCardPanel } from "./AdmitCardPanel";
import { DateField } from "./DateField";
import { useDialog } from "../../contexts/DialogContext";
import { Modal } from "../../components/ui/Modal";

// ═══════════════════════════════════════════════════════════════
// DATE SHEET TAB — per exam, pick a class, tick which subjects are
// part of this exam, set date/time/marks via dropdowns+pickers.
// ═══════════════════════════════════════════════════════════════
export const DateSheetTab = ({ examId, examSections, grades, examStatus, openAdmit, onAdmitShown }) => {
  const locked = examStatus === "published";
  const [sectionId, setSectionId] = useState(examSections[0]?.id || "");
  const currentSection = examSections.find((s) => s.id === sectionId);
  const gradeId = currentSection?.grade_id;
  const { subjects: classSubjects } = useGradeSubjects(gradeId, sectionId);

  const [rows, setRows] = useState({}); // subject_id -> {included, exam_date, start_time, duration_minutes, max_marks, passing_marks}
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkMax, setBulkMax] = useState(80);
  const [bulkDuration, setBulkDuration] = useState(120);
  const [autoStart, setAutoStart] = useState("");
  const [autoTime, setAutoTime] = useState("09:00");
  const [gapDays, setGapDays] = useState(1);
  const [skipSunday, setSkipSunday] = useState(true);
  const [showCopy, setShowCopy] = useState(false);
  const [copyTargets, setCopyTargets] = useState([]);
  const [copying, setCopying] = useState(false);
  const [autoMsg, setAutoMsg] = useState(null);
  const [applyTo, setApplyTo] = useState("all"); // all | ticked
  const tickSeq = useRef(0);
  const { dialogAlert, dialogConfirm } = useDialog();
  const [showAuto, setShowAuto] = useState(false);
  const [showAdmit, setShowAdmit] = useState(!!openAdmit);
  useEffect(() => { if (openAdmit) onAdmitShown?.(); }, []); // eslint-disable-line
  const [autoErr, setAutoErr] = useState("");

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
          _o: ++tickSeq.current,
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
            max_marks: next[sid].is_grade_only ? 0 : bulkMax,
            passing_marks: next[sid].is_grade_only ? 0 : Math.round(bulkMax * 0.33),
            duration_minutes: bulkDuration,
          };
        }
      });
      return next;
    });
  };

  // Auto-fill: schedules subjects one after another from the start date (Sundays optional).
  // Order = the order in which subjects were ticked; if nothing is ticked yet, every subject of the class is used.
  const autoFillDates = () => {
    if (!autoStart) { setAutoErr("Please select a start date."); return; }
    if (!classSubjects.length) { setAutoErr("No subjects are configured for this class."); return; }
    // order: subjects ticked by the user first (in tick order), then the rest by their saved date, then class order
    const rank = (x) => (x.r?._o != null ? [0, x.r._o, 0] : [1, x.r?.exam_date || "9999-12-31", x.i]);
    const cmp = (a, b) => { const ra = rank(a), rb = rank(b); for (let k = 0; k < 3; k++) { if (ra[k] < rb[k]) return -1; if (ra[k] > rb[k]) return 1; } return 0; };
    const order = classSubjects
      .map((sub, i) => ({ id: sub.id, i, r: rows[sub.id] }))
      .filter((x) => (applyTo === "all" ? true : x.r?.included))
      .sort(cmp);
    if (!order.length) { setAutoErr("Tick at least one subject, or choose \"All subjects\"."); return; }
    const [y, m, d] = autoStart.split("-").map(Number);
    const cur = new Date(y, m - 1, d);
    const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const skip = () => { while (skipSunday && cur.getDay() === 0) cur.setDate(cur.getDate() + 1); };
    const dates = {};
    skip();
    order.forEach((x) => {
      dates[x.id] = fmt(cur);
      cur.setDate(cur.getDate() + Math.max(1, Number(gapDays) || 1));
      skip();
    });
    setRows((prev) => {
      const next = { ...prev };
      order.forEach((x) => {
        const base = prev[x.id] || {};
        next[x.id] = {
          duration_minutes: bulkDuration,
          max_marks: bulkMax,
          passing_marks: Math.round(bulkMax * 0.33),
          ...base,
          included: true,
          exam_date: dates[x.id],
          start_time: autoTime,
        };
      });
      return next;
    });
    const first = dates[order[0].id], last = dates[order[order.length - 1].id];
    setAutoErr("");
    setShowAuto(false);
    setAutoMsg({ ok: true, text: `Dates assigned to ${order.length} subject${order.length > 1 ? "s" : ""} (${first} to ${last}). Untick any subject that is not part of this exam, then click Save Date Sheet.` });
  };

  const copyToSections = async () => {
    if (locked) return dialogAlert("Results are published. Unpublish the exam first.", "Date Sheet Locked");
    const src = Object.entries(rows).filter(([, r]) => r.included);
    if (!src.length) return dialogAlert("Fill in this class's date sheet first.", "Nothing to Copy");
    if (src.some(([, r]) => !r.exam_date)) return dialogAlert("Set a date for every ticked subject first.", "Missing Dates");
    if (!copyTargets.length) return dialogAlert("Select at least one class / section.", "No Class Selected");
    if (!(await dialogConfirm(`The date sheets of ${copyTargets.length} section(s) will be replaced. Continue?`, "Replace Date Sheets"))) return;
    setCopying(true);
    let ok = 0;
    const msgs = [];
    for (const tid of copyTargets) {
      const t = examSections.find((x) => x.id === tid);
      const label = `${t?.grade_name} — ${t?.name}`;
      try {
        const res = await apiRequest(`/setup/grade-subjects?section_id=${tid}`);
        const ids = new Set((Array.isArray(res?.data) ? res.data : []).map((x) => String(x.id).toLowerCase()));
        const entries = src
          .filter(([sid]) => ids.has(String(sid).toLowerCase()))
          .map(([subject_id, r]) => ({
            section_id: tid,
            subject_id,
            exam_date: r.exam_date,
            start_time: r.start_time,
            duration_minutes: Number(r.duration_minutes) || 120,
            max_marks: r.is_grade_only ? 0 : Number(r.max_marks),
            passing_marks: r.is_grade_only ? 0 : (r.passing_marks === "" || r.passing_marks === null || r.passing_marks === undefined ? null : Number(r.passing_marks)),
            is_grade_only: !!r.is_grade_only,
          }));
        if (!entries.length) { msgs.push(`${label}: no matching subjects`); continue; }
        await apiRequest(`/exams/${examId}/datesheet`, "PUT", { section_id: tid, entries });
        ok++;
        if (entries.length < src.length) msgs.push(`${label}: ${src.length - entries.length} subject(s) not found in this class`);
      } catch (e) {
        msgs.push(`${label}: ${explain(e)}`);
      }
    }
    setCopying(false);
    await dialogAlert(`Date sheet copied to ${ok} section(s).` + (msgs.length ? "\n\n" + msgs.join("\n") : ""), ok ? "Copy Complete" : "Copy Failed");
    if (ok) setCopyTargets([]);
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

    if (locked) return dialogAlert("Results are published. Unpublish the exam first to change the date sheet.", "Cannot Save");
    const badMax = entries.find((e) => !e.is_grade_only && !(e.max_marks > 0));
    if (badMax) return dialogAlert("Max marks must be greater than 0 for every ticked subject.", "Cannot Save");
    const badPass = entries.find((e) => !e.is_grade_only && e.passing_marks !== null && e.passing_marks > e.max_marks);
    if (badPass) return dialogAlert(`Passing marks (${badPass.passing_marks}) cannot be more than max marks (${badPass.max_marks}).`, "Cannot Save");
    if (entries.some((e) => !e.exam_date)) {
      await dialogAlert("Please set an exam date for every ticked subject.", "Missing Dates");
      return;
    }

    setSaving(true);
    try {
      await apiRequest(`/exams/${examId}/datesheet`, "PUT", {
        section_id: sectionId,
        entries,
      });
      await dialogAlert("Date sheet saved successfully.", "Saved");
      await load();
    } catch (e) {
      await dialogAlert(explain(e), "Save Failed");
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
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={() => { setAutoErr(""); setShowAuto(true); }} disabled={locked}>
              Auto-fill Dates
            </button>
            {examSections.length > 1 && (
              <button className="btn btn-ghost" onClick={() => setShowCopy(true)} disabled={locked}>
                Copy to Other Classes
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setShowAdmit(true)}>
              Admit Cards
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || locked}>
              {saving ? "Saving…" : "Save Date Sheet"}
            </button>
          </div>
        </div>
      </div>

      {autoMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 16, borderRadius: 8, border: `1px solid ${C.primary}`, fontSize: 13 }}>
          <span style={{ flex: 1 }}>{autoMsg.text}</span>
          <button className="btn btn-ghost" style={{ padding: "2px 10px" }} onClick={() => setAutoMsg(null)} aria-label="Dismiss">×</button>
        </div>
      )}

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
        <div className="scroll-x">
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
                      <DateField disabled={!r.included} value={r.exam_date || ""} onChange={(v) => setRowField(sub.id, "exam_date", v)} />
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

      <Modal open={showAuto} onClose={() => setShowAuto(false)} title="Auto-fill Dates" width={520}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
          Subjects are scheduled one after another from the start date. Subjects you ticked yourself come first, in the order you ticked them.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: C.textMuted, marginBottom: 4 }}>START DATE</label>
            <DateField value={autoStart} onChange={setAutoStart} width="100%" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: C.textMuted, marginBottom: 4 }}>START TIME</label>
            <input type="time" className="input" value={autoTime} onChange={(e) => setAutoTime(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: C.textMuted, marginBottom: 4 }}>GAP BETWEEN PAPERS</label>
            <select className="select" value={gapDays} onChange={(e) => setGapDays(Number(e.target.value))}>
              {[1, 2, 3, 4].map((v) => (<option key={v} value={v}>{v === 1 ? "Every day" : `Every ${v} days`}</option>))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: C.textMuted, marginBottom: 4 }}>APPLY TO</label>
            <select className="select" value={applyTo} onChange={(e) => setApplyTo(e.target.value)}>
              <option value="all">All subjects</option>
              <option value="ticked">Ticked subjects only</option>
            </select>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={skipSunday} onChange={(e) => setSkipSunday(e.target.checked)} style={{ accentColor: C.primary }} />
          Skip Sundays
        </label>
        {autoErr && <div style={{ color: "#dc2626", fontSize: 12, fontWeight: 600, marginTop: 10 }}>{autoErr}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={() => setShowAuto(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={autoFillDates}>Apply</button>
        </div>
      </Modal>

      <Modal open={showCopy} onClose={() => setShowCopy(false)} title="Copy Date Sheet to Other Classes" width={560}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
          Save this date sheet first, then select the classes to copy it to. Their existing date sheets will be replaced.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {examSections.filter((x) => x.id !== sectionId).map((x) => {
            const on = copyTargets.includes(x.id);
            return (
              <label key={x.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: `1px solid ${on ? C.primary : C.border}`, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={on} style={{ accentColor: C.primary }}
                  onChange={() => setCopyTargets((p) => (on ? p.filter((i) => i !== x.id) : [...p, x.id]))} />
                {x.grade_name} — {x.name}
              </label>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setCopyTargets(examSections.filter((x) => x.id !== sectionId).map((x) => x.id))}>Select all</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setShowCopy(false)}>Close</button>
            <button className="btn btn-primary" onClick={copyToSections} disabled={copying || locked}>{copying ? "Copying…" : "Copy"}</button>
          </div>
        </div>
      </Modal>

      <AdmitCardPanel open={showAdmit} onClose={() => setShowAdmit(false)} examId={examId} sectionId={sectionId}
        sectionLabel={(() => { const x = examSections.find((e) => e.id === sectionId); return x ? `${x.grade_name} — ${x.name}` : ""; })()} />
    </div>
  );
};
