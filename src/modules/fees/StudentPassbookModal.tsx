// FILE: teacher-app/src/modules/fees/StudentPassbookModal.tsx
// Source: admin App.tsx -> StudentPassbookModal [14703-14853]
// @ts-nocheck
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { openDocument } from "../../utils/openDocument";
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { rupees } from "./helpers";
import { C } from "../../theme/theme";

// ── STUDENT PASSBOOK MODAL ──
export const StudentPassbookModal = ({ studentId, onClose, onVoided }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const load = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/fees/accounts/${studentId}`);
      setData(res?.data || null);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [studentId]); // eslint-disable-line

  const openReceipt = async (p) => {
    try {
      await openGeneratedPdf(`/fees/payments/${p.id}/receipt`, { name: `Receipt ${p.receipt_no || p.id}.pdf`, title: `Receipt ${p.receipt_no || ""}`.trim() });
    } catch (e) { alert("Failed: " + e.message); }
  };

  const renderActions = (p) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {!p.is_void && (
        <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => openReceipt(p)}>
          <Icon name="download" size={11} /> Receipt
        </button>
      )}
      {p.is_void ? (
        <span className="badge badge-red" style={{ fontSize: 10 }}>Voided</span>
      ) : (
        <button className="btn btn-danger" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setVoidTarget(p)}>Void</button>
      )}
    </div>
  );

  const handleVoid = async () => {
    if (!voidReason.trim()) return;
    setVoiding(true);
    try {
      await apiRequest(`/fees/payments/${voidTarget.id}`, "DELETE", { void_reason: voidReason });
      setVoidTarget(null); setVoidReason("");
      await load();
      onVoided?.();
    } catch (e) {
      alert("Void failed: " + e.message);
    } finally { setVoiding(false); }
  };

  return (
    <Modal open={!!studentId} onClose={onClose} title="Student Fee Passbook" width={680}>
      {loading ? (
        <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary }}>Loading passbook…</div>
      ) : !data ? (
        <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>No records found.</div>
      ) : (
        <div>
          <div style={{
            display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16, padding: 18, marginBottom: 14,
            borderRadius: 16, background: `linear-gradient(135deg,${C.surfaceAlt},${C.surface})`, border: `1px solid ${C.border}`,
          }}>
             <div style={{ flex: "1 1 180px", minWidth: 0 }}>
              <div className="syne" style={{ fontSize: 17, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.account.student_name}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.account.class_name} {data.account.section_name} · Adm# {data.account.admission_no}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, flex: "1 1 280px" }}>
              {[
                ["Total", data.account.total_fee_paise, C.text],
                ["Paid", data.account.paid_paise, C.green],
                ["Due", data.account.pending_paise, C.red],
              ].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: "left", background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${c}`, borderRadius: 10, padding: "8px 10px", minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 700 }}>{l}</div>
                  <div className="syne" style={{ fontWeight: 800, fontSize: 15, color: c, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rupees(v)}</div>
                </div>
              ))}
            </div>
          </div>

          <style>{`.pb-cards{display:none;} @media(max-width:640px){.pb-table{display:none;} .pb-cards{display:flex;flex-direction:column;gap:8px;}}`}</style>
          {(() => {
            const tot = Number(data.account.total_fee_paise) || 0;
            const pct = tot > 0 ? Math.min(100, Math.round((Number(data.account.paid_paise) / tot) * 100)) : 0;
            return (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>
                  <span>Fee Collection Progress</span><span style={{ color: C.green }}>{pct}% paid</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: C.green }} /></div>
              </div>
            );
          })()}
          <h4 className="syne" style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: C.primary }}>Invoices</h4>
          {!data.invoices?.length ? (
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 18 }}>No invoices generated yet.</div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              {(data.invoices || []).map((inv) => (
                <div key={inv.id} style={{ background: C.surfaceAlt, borderRadius: 10, padding: "10px 14px", marginBottom: 8, border: `1px solid ${C.border}`, borderLeft: `4px solid ${inv.status === "paid" ? C.green : inv.status === "partial" ? C.yellow : C.red}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: inv.items?.length ? 8 : 0 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{inv.title}</div>
                      <div style={{ fontSize: 10.5, color: C.textMuted }}>{inv.invoice_no} · Due {new Date(inv.due_date).toLocaleDateString("en-IN")}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`badge ${inv.status === "paid" ? "badge-green" : inv.status === "partial" ? "badge-yellow" : "badge-red"}`}>{inv.status}</span>
                      <div className="syne" style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>{rupees(inv.total_paise)}</div>
                    </div>
                  </div>
                  {inv.items?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {inv.items.map((it, i) => (
                        <span key={i} style={{ fontSize: 10.5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px" }}>
                          {it.category_name}: {rupees(it.amount_paise)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <h4 className="syne" style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: C.green }}>Payment History</h4>
          {!data.payments?.length ? (
            <div style={{ fontSize: 12, color: C.textMuted }}>No payments recorded yet.</div>
          ) : (
            <>
              <div className="pb-table" style={{ overflowX: "auto" }}>
                <table className="table" style={{ minWidth: 560, whiteSpace: "nowrap" }}>
                  <thead><tr><th>Receipt</th><th>Date</th><th>Amount</th><th>Method</th><th>Collected By</th><th></th></tr></thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.id} style={{ opacity: p.is_void ? 0.45 : 1 }}>
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>{p.receipt_no}</td>
                        <td style={{ fontSize: 12 }}>{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
                        <td className="syne" style={{ fontWeight: 700 }}>{rupees(p.amount_paise)}</td>
                        <td style={{ fontSize: 12 }}>{p.payment_method}</td>
                        <td style={{ fontSize: 11, color: C.textMuted }}>{p.collected_by_name || "—"}</td>
                        <td>{renderActions(p)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pb-cards">
                {data.payments.map((p) => (
                  <div key={p.id} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderLeft: `4px solid ${p.is_void ? C.red : C.green}`, borderRadius: 12, padding: 12, opacity: p.is_void ? 0.6 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.receipt_no}</span>
                      <span className="syne" style={{ fontWeight: 800, fontSize: 16, color: p.is_void ? C.textMuted : C.green, textDecoration: p.is_void ? "line-through" : "none" }}>{rupees(p.amount_paise)}</span>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>{new Date(p.payment_date).toLocaleDateString("en-IN")} · {p.payment_method}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Collected by {p.collected_by_name || "—"}</div>
                    <div style={{ marginTop: 10 }}>{renderActions(p)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <Modal open={!!voidTarget} onClose={() => setVoidTarget(null)} title="Void Payment Receipt" width={420}>
            {voidTarget && (
              <div>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
                  Voiding receipt <b style={{ color: C.text }}>{voidTarget.receipt_no}</b> of {rupees(voidTarget.amount_paise)} will restore this amount to the student's pending balance.
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
      )}
    </Modal>
  );};