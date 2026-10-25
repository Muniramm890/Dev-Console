// FILE: teacher-app/src/modules/fees/FeeReceiptsTab.tsx
// Source: admin App.tsx -> FeeReceiptsTab [15083-15189]
// @ts-nocheck
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { rupees } from "./helpers";
import { C } from "../../theme/theme";
import { todayISO } from "../../utils/date";

// ── RECEIPTS TAB ──
export const FeeReceiptsTab = () => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const downloadReceipt = async (paymentId) => {
    setDownloadingId(paymentId);
    try {
      await openGeneratedPdf(`/fees/payments/${paymentId}/receipt`, { name: "Fee Receipt.pdf", title: "Fee Receipt" });
    } catch (e) {
      alert("Failed to generate receipt: " + e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, from, to, limit: 50 });
      const res = await apiRequest(`/fees/payments?${params.toString()}`);
      setRows(res?.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [search, from, to]); // eslint-disable-line

  const handleVoid = async () => {
    if (!voidReason.trim()) return;
    setVoiding(true);
    try {
      await apiRequest(`/fees/payments/${voidTarget.id}`, "DELETE", { void_reason: voidReason });
      setVoidTarget(null); setVoidReason("");
      await load();
    } catch (e) { alert("Void failed: " + e.message); } finally { setVoiding(false); }
  };

  const totalShown = rows.filter((r) => !r.is_void).reduce((s, r) => s + Number(r.amount_paise), 0);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Search receipt no. or student…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input className="input" type="date" style={{ width: 150 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ color: C.textMuted }}>to</span>
        <input className="input" type="date" style={{ width: 150 }} value={to} onChange={(e) => setTo(e.target.value)} max={todayISO()} />
        <div className="syne" style={{ fontWeight: 800, color: C.green, fontSize: 15 }}>{rupees(totalShown)} collected</div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto", minWidth: 0 }}>
        {loading ? (
          <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary }}>Loading transactions…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No transactions found.</div>
        ) : (
          <table className="table" style={{ minWidth: 820, whiteSpace: "nowrap" }}>
            <thead><tr><th>Receipt</th><th>Student</th><th>Date</th><th>Amount</th><th>Method</th><th>Collected By</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} style={{ opacity: p.is_void ? 0.45 : 1 }}>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>{p.receipt_no}</td>
                  <td style={{ fontWeight: 600 }}>{p.student_name}</td>
                  <td style={{ fontSize: 12 }}>{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
                  <td className="syne" style={{ fontWeight: 700 }}>{rupees(p.amount_paise)}</td>
                  <td style={{ fontSize: 12 }}>{p.payment_method}</td>
                  <td style={{ fontSize: 11, color: C.textMuted }}>{p.collected_by_name || "—"}</td>
                  <td>{p.is_void ? <span className="badge badge-red">Void</span> : <span className="badge badge-green">Active</span>}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: 10 }} onClick={() => downloadReceipt(p.id)} disabled={p.is_void}>
                        <Icon name="download" size={11} /> Receipt
                      </button>
                      {!p.is_void && <button className="btn btn-danger" style={{ padding: "3px 8px", fontSize: 10 }} onClick={() => setVoidTarget(p)}>Void</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!voidTarget} onClose={() => setVoidTarget(null)} title="Void Payment Receipt" width={420}>
        {voidTarget && (
          <div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
              Voiding <b style={{ color: C.text }}>{voidTarget.receipt_no}</b> ({rupees(voidTarget.amount_paise)}) will restore the amount to pending balance.
            </div>
            <FormRow label="Reason for Voiding *">
              <textarea className="input" rows={3} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} style={{ resize: "vertical" }} />
            </FormRow>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setVoidTarget(null)} disabled={voiding}>Cancel</button>
              <button className="btn btn-danger" onClick={handleVoid} disabled={voiding || !voidReason.trim()}>{voiding ? "Voiding…" : "Confirm Void"}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
