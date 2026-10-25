// FILE: teacher-app/src/modules/results/QuickMarksModal.tsx
// Source: admin App.tsx -> QuickMarksModal [19601-19636]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { MarksEntryTab } from "../exams/MarksEntryTab";
import { C } from "../../theme/theme";

// 🔴 NEW: Quick Marks Modal Wrapper for Results Module
export const QuickMarksModal = ({ examId, onClose }) => {
  const [examSections, setExamSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest(`/exams/${examId}`);
        setExamSections(Array.isArray(res?.data?.sections) ? res.data.sections : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [examId]);

  return (
    <Modal open={true} onClose={onClose} title="Quick Marks Entry" width={900}>
      {loading ? (
        <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary }}>
          Loading classes for this exam...
        </div>
      ) : examSections.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
          No classes assigned to this exam yet.
        </div>
      ) : (
        <div style={{ paddingBottom: 20 }}>
          {/* 🔴 Calling the exact same tab from ExamManagementModule! */}
          <MarksEntryTab examId={examId} examSections={examSections} />
        </div>
      )}
    </Modal>
  );
};
