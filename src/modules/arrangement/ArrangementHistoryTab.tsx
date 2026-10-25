// FILE: teacher-app/src/modules/arrangement/ArrangementHistoryTab.tsx
// Source: admin App.tsx -> ArrangementHistoryTab [12100-12173]
// @ts-nocheck
import { useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";
import { daysAgoISO, todayISO } from "../../utils/date";

// ═══════════════════════════════════════════════════════════════
// HISTORY TAB
// ═══════════════════════════════════════════════════════════════
export const ArrangementHistoryTab = ({ history, onRefresh }) => {
  const { dialogConfirm, dialogAlert } = useDialog();
  const [dateFrom, setDateFrom] = useState(daysAgoISO(30));
  const [dateTo, setDateTo] = useState(todayISO());

  const filtered = history.filter((h) => {
    const d = h.substitution_date?.slice(0, 10); // normalize to YYYY-MM-DD before comparing
    return d >= dateFrom && d <= dateTo;
  });

  const handleCancel = async (row) => {
    const ok = await dialogConfirm(`Cancel this substitution for ${row.substitute_teacher_name}?`, "Cancel Substitution");
    if (!ok) return;
    try {
      await apiRequest(`/arrangement/${row.id}`, "DELETE");
      onRefresh();
    } catch (e) {
      dialogAlert("Cancel failed: " + e.message, "Error");
    }
  };

  return (
    <div className="slide-in">
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <FormRow label="From"><input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></FormRow>
        <FormRow label="To"><input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></FormRow>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No substitutions in this range.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto", minWidth: 0 }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: C.surfaceAlt, textAlign: "left" }}>
                {["Date", "Period", "Class", "Subject", "Original", "Substitute", "Notified", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 10.5, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px" }}>{r.substitution_date?.slice(0, 10)}</td>
                  <td style={{ padding: "10px 14px" }}>{r.period_label}</td>
                  <td style={{ padding: "10px 14px" }}>{r.class_name} {r.section_name}</td>
                  <td style={{ padding: "10px 14px" }}>{r.subject_name || "—"}</td>
                  <td style={{ padding: "10px 14px", color: C.textMuted }}>{r.original_teacher_name}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700 }}>{r.substitute_teacher_name}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {r.notify_status === "sent" ? (
                      <span style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>✓ Sent</span>
                    ) : r.notify_status === "partial" ? (
                      <span style={{ color: "#d97706", fontSize: 11, fontWeight: 700 }} title="Some channels (app/email/WhatsApp) failed — check CommHub message history">⚠ Partial</span>
                    ) : r.notify_status === "failed" ? (
                      <span style={{ color: C.red, fontSize: 11, fontWeight: 700 }} title="All channels failed — check CommHub message history">✗ Failed</span>
                    ) : (
                      <span style={{ color: C.textMuted, fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px", color: C.red }} onClick={() => handleCancel(r)}>
                      <Icon name="close" size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
