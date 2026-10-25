// FILE: teacher-app/src/modules/students/IssueTCModal.tsx
// Source: admin App.tsx -> IssueTCModal [2649-2743]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Modal } from "../../components/ui/Modal";
import { C } from "../../theme/theme";

// 🔴 Issue TC / mark-as-left modal — single-student exit, wired from Students grid
export const IssueTCModal = ({ student, onClose, onDone }) => {
  const [reason, setReason] = useState("");
  const [exitType, setExitType] = useState("tc");
  const [tcNumber, setTcNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (student) {
      setReason("");
      setExitType("tc");
      setTcNumber("");
      setError("");
    }
  }, [student]);

  const handleSubmit = async () => {
    if (!reason.trim()) { setError("Reason is required"); return; }
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/students/${student.id}/tc`, "POST", {
        exit_type: exitType,
        reason: reason.trim(),
        tc_number: tcNumber.trim() || null,
      });
      onDone();
    } catch (e) {
      setError(e.message || "Failed to issue TC");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!student} onClose={onClose} title="Issue TC / Mark as Left" width={460}>
      {student && (
        <div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
            <strong style={{ color: C.text }}>
              {student.first_name} {student.last_name}
            </strong>{" "}
            ({student.admission_no}) is about to be marked as exited from the school — this
            action <strong>cannot be reversed</strong> through the normal flow.
          </div>

          <FormGrid cols={1}>
            <FormRow label="Exit Type">
              <select className="select" value={exitType} onChange={(e) => setExitType(e.target.value)}>
                <option value="tc">Transfer Certificate (TC)</option>
                <option value="graduated">Graduated / Passed Out</option>
                <option value="expelled">Expelled</option>
              </select>
            </FormRow>
            <FormRow label="TC Number (optional)">
              <input
                className="input"
                value={tcNumber}
                onChange={(e) => setTcNumber(e.target.value)}
                placeholder="e.g. TC/2026/045"
              />
            </FormRow>
            <FormRow label="Reason">
              <textarea
                className="input"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for leaving..."
              />
            </FormRow>
          </FormGrid>

          {error && (
            <div style={{ color: C.red, fontSize: 12.5, marginTop: 8 }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={handleSubmit}
              disabled={saving}
              style={{ minWidth: 130, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Processing…" : "Confirm Exit"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
