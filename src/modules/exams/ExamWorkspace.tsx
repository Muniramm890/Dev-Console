// FILE: teacher-app/src/modules/exams/ExamWorkspace.tsx
// Source: admin App.tsx -> ExamWorkspace [18220-18332]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { Icon } from "../../components/ui/Icon";
import { DateSheetTab } from "./DateSheetTab";
import { MarksEntryTab } from "./MarksEntryTab";
import { ResultsPublishTab } from "./ResultsPublishTab";
import { EXAM_STATUS_META, EXAM_TYPES } from "./helpers";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// EXAM WORKSPACE — opened after clicking "Manage" on an exam card
// ═══════════════════════════════════════════════════════════════
export const ExamWorkspace = ({ exam, onBack, onExamUpdated, openAdmit }) => {
  const [admitOnce, setAdmitOnce] = useState(!!openAdmit); // open the Admit Cards popup once (dashboard deep link)
  const [tab, setTab] = useState("datesheet"); // 'datesheet' | 'marks' | 'results'
  const [examSections, setExamSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiRequest(`/exams/${exam.id}`);
        setExamSections(
          Array.isArray(res?.data?.sections) ? res.data.sections : []
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [exam.id]);

  return (
    <div className="slide-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <button className="btn btn-ghost" onClick={onBack}>
          <Icon
            name="arrow_right"
            size={14}
            style={{ transform: "rotate(180deg)" }}
          />{" "}
          Back
        </button>
        <div>
          <div className="syne" style={{ fontSize: 18, fontWeight: 800 }}>
            {exam.name}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            {EXAM_TYPES.find((t) => t.v === exam.exam_type)?.l} · Weightage{" "}
            {exam.weightage_percent}%
          </div>
        </div>
        <span
          className="badge"
          style={{
            marginLeft: "auto",
            background: `${EXAM_STATUS_META[exam.status]?.color}22`,
            color: EXAM_STATUS_META[exam.status]?.color,
          }}
        >
          {EXAM_STATUS_META[exam.status]?.label}
        </span>
      </div>

      <div
        style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
      >
        {[
          { id: "datesheet", label: "Date Sheet" },
          { id: "marks", label: "Marks Entry" },
          { id: "results", label: "Results & Publish" },
        ].map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          className="card pulse"
          style={{ padding: 40, textAlign: "center", color: C.primary }}
        >
          Loading exam…
        </div>
      ) : examSections.length === 0 ? (
        <div
          className="card"
          style={{ padding: 40, textAlign: "center", color: C.textMuted }}
        >
          No classes assigned to this exam yet. Edit the exam and select classes
          first.
        </div>
      ) : (
        <>
          {tab === "datesheet" && (
            <DateSheetTab examId={exam.id} examSections={examSections} examStatus={exam.status} openAdmit={admitOnce} onAdmitShown={() => setAdmitOnce(false)} />
          )}
          {tab === "marks" && (
            <MarksEntryTab examId={exam.id} examSections={examSections} examStatus={exam.status} />
          )}
          {tab === "results" && (
            <ResultsPublishTab
              exam={exam}
              examSections={examSections}
              onExamUpdated={onExamUpdated}
            />
          )}
        </>
      )}
    </div>
  );
};
