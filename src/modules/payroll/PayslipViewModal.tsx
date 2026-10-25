// FILE: admin-app/src/modules/payroll/PayslipViewModal.tsx
// @ts-nocheck
// The payslip is rendered by the backend (premium branded PDF, generated on demand, never stored) and opens in the
// in-app PDF viewer, where it can be downloaded / printed. This component only fetches it and shows progress.
import { useEffect, useRef, useState } from "react";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { C } from "../../theme/theme";

export const PayslipViewModal = ({ slipId, open, onClose }) => {
  const [error, setError] = useState("");
  const started = useRef(null);

  useEffect(() => {
    if (!open || !slipId) { started.current = null; return; }
    if (started.current === slipId) return;
    started.current = slipId;
    setError("");
    openGeneratedPdf(`/payroll/payslips/${slipId}/pdf`, { name: "Payslip.pdf", title: "Payslip" })
      .then(() => onClose())
      .catch((e) => setError(e?.message || "Could not generate the payslip"));
  }, [open, slipId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 26px", minWidth: 240, maxWidth: 360, textAlign: "center", color: C.text }}>
        {error ? (
          <>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Could not open payslip</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>{error}</div>
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          </>
        ) : (
          <div style={{ fontSize: 14, fontWeight: 600 }}>Preparing payslip…</div>
        )}
      </div>
    </div>
  );
};
