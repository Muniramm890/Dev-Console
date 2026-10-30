// FILE: teacher-app/src/modules/results/ResultsModule.tsx
// Source: admin App.tsx -> ResultsModule [19640-19771]
// @ts-nocheck
import { useLocation as useLoc } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { Icon } from "../../components/ui/Icon";
import { useSession } from "../../contexts/SessionContext";
import { QuickMarksModal } from "./QuickMarksModal";
import { ResultsClassWiseTab } from "./ResultsClassWiseTab";
import { ResultsMarksRegisterTab } from "./ResultsMarksRegisterTab";
import { ResultsOverviewTab } from "./ResultsOverviewTab";
import { ResultsSectionWiseTab } from "./ResultsSectionWiseTab";
import { ResultsStudentReportTab } from "./ResultsStudentReportTab";
import { ResultsSubjectWiseTab } from "./ResultsSubjectWiseTab";
import { ResultsTeacherWiseTab } from "./ResultsTeacherWiseTab";
import { ResultsToppersTab } from "./ResultsToppersTab";
import { RESULT_TABS } from "./helpers";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// MAIN MODULE
// ═══════════════════════════════════════════════════════════════
export const ResultsModule = ({ school }) => {
  const { currentYear } = useSession();
  const [examGroups, setExamGroups] = useState([]);
  const [examGroupId, setExamGroupId] = useState("");
  const deepQs = new URLSearchParams(useLoc().search); // dashboard deep link: /results?exam=ID&tab=student
  const [tab, setTab] = useState(() => (["student", "register"].includes(deepQs.get("tab")) ? deepQs.get("tab") : "overview"));
  const [computing, setComputing] = useState(false);
  const [showMarksModal, setShowMarksModal] = useState(false); // 🔴 New State

  useEffect(() => {
    let cancelled = false;
    setExamGroups([]);
    (async () => {
      try {
        const res = await apiRequest(`/results/exam-groups${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ""}`);
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setExamGroups(list);
        // session badalne par purana exam selection invalid ho sakta hai
        setExamGroupId((prev) => (prev && list.some((e) => e.id === prev) ? prev : list.some((e) => e.id === deepQs.get("exam")) ? deepQs.get("exam") : list[0]?.id || ""));
      } catch (e) { console.error(e); }
    })();
    return () => { cancelled = true; };
  }, [currentYear?.id]); // eslint-disable-line

  const selectedExam = examGroups.find((e) => e.id === examGroupId);

 

  return (
    <div>
      {/* 🔴 OPTIMIZED TOP BAR: Uses Global CSS (.card, .btn, .badge) */}
      <div className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        
        {/* LEFT: Inline Select & Status Chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Select wrapper keeps inline styles because global .select is for big forms, we want a compact chip here */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.surfaceAlt, padding: "4px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" }}>Exam:</span>
            <select
              value={examGroupId}
              onChange={(e) => setExamGroupId(e.target.value)}
              style={{ background: "transparent", border: "none", fontSize: 13, fontWeight: 800, color: C.primary, outline: "none", cursor: "pointer", width: 180 }}
            >
              <option value="">-- Select --</option>
              {examGroups.map((eg) => (
                <option key={eg.id} value={eg.id}>{eg.name} ({eg.exam_type})</option>
              ))}
            </select>
          </div>

          {selectedExam && (
            <span className={`badge ${selectedExam.results_computed_count > 0 ? "badge-green" : "badge-yellow"}`}>
              {selectedExam.results_computed_count > 0 ? `✓ ${selectedExam.results_computed_count} Computed` : "⚠ Pending"}
            </span>
          )}
        </div>

        {/* RIGHT: Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          
          {/* 🔴 NEW: Marks Entry Shortcut Button */}
          <button 
            className="btn btn-ghost" 
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 16px" }}
            onClick={() => setShowMarksModal(true)}
            disabled={!examGroupId}
          >
            <Icon name="edit" size={14} /> Marks Entry
          </button>

         {/* 🔴 Compute Button Removed: Computation is now strictly handled Section-wise in the Exam Management module. */}
         <span style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic", marginLeft: 10 }}>
            * Compute results via Exam Management
          </span>

        </div>
      </div>

      {!examGroupId ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
          Select an exam to view result analysis.
        </div>
      ) : (
        <>
          {/* 🔴 FIXED TABS UI */}
          <div style={{ 
            display: "flex", 
            gap: 20, 
            borderBottom: `2px solid ${C.border}`, 
            marginBottom: 20, 
            overflowX: "auto",
            scrollbarWidth: "none" 
          }}>
            {RESULT_TABS.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: "10px 4px",
                    background: "transparent",
                    border: "none",
                    borderBottom: isActive ? `3px solid ${C.primary}` : "3px solid transparent",
                    color: isActive ? C.primary : C.textMuted,
                    fontWeight: isActive ? 800 : 600,
                    fontSize: 14,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease-in-out",
                    marginBottom: "-2px" // Overlaps the bottom border smoothly
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = C.text; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = C.textMuted; }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "overview" && <ResultsOverviewTab examGroupId={examGroupId} />}
          {tab === "classwise" && <ResultsClassWiseTab examGroupId={examGroupId} />}
          {tab === "sectionwise" && <ResultsSectionWiseTab examGroupId={examGroupId} />}
          {tab === "subjectwise" && <ResultsSubjectWiseTab examGroupId={examGroupId} />}
          {tab === "teacherwise" && <ResultsTeacherWiseTab examGroupId={examGroupId} />}
          {tab === "toppers" && <ResultsToppersTab examGroupId={examGroupId} />}
          {tab === "register" && <ResultsMarksRegisterTab examGroupId={examGroupId} />}
          {tab === "student" && <ResultsStudentReportTab examGroupId={examGroupId} examName={selectedExam?.name} school={school} />}
        </>
      )}

      {/* 🔴 Quick Marks Entry Modal Overlay */}
      {showMarksModal && examGroupId && (
        <QuickMarksModal examId={examGroupId} onClose={() => setShowMarksModal(false)} />
      )}
    </div>
  );
};
