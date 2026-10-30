// FILE: teacher-app/src/modules/fees/CollectPaymentModal.tsx
// Source: admin App.tsx -> CollectPaymentModal [14237-14635]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Modal } from "../../components/ui/Modal";
import { CASHFREE_MODE, CF_PENDING_PREFIX, PAYMENT_METHODS, RAZORPAY_METHODS, loadCashfreeScript, loadRazorpayScript, rupees, toPaise, verifyCashfreeWithRetry } from "./helpers";
import { C } from "../../theme/theme";
import { todayISO } from "../../utils/date";

// ── COLLECT PAYMENT MODAL (ITEMIZED & DISCOUNT SUPPORT) ──
export const CollectPaymentModal = ({ account, onClose, onSuccess }) => {
  const [method, setMethod] = useState("Cash");
  const [gateway, setGateway] = useState("razorpay"); 
  const [ref, setRef] = useState("");
  const [bank, setBank] = useState("");
  const [date, setDate] = useState(todayISO());
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rzpLoading, setRzpLoading] = useState(false);

  // Naye Itemized States
  const [pendingItems, setPendingItems] = useState([]);
  const [inputs, setInputs] = useState({}); // { category_id: { pay: 0, discount: 0 } }
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    setMethod("Cash"); setGateway("razorpay"); setRef(""); setBank(""); setDate(todayISO()); setRemarks(""); setError("");
    setInputs({}); setPendingItems([]);
    
    if (account) {
      // Load student's category-wise pending dues from backend
      setLoadingItems(true);
      apiRequest(`/fees/accounts/${account.student_id}`)
        .then(res => {
          const items = res?.data?.pending_items || [];
          setPendingItems(items);
          
          // Initialize inputs with zero
          const initInputs = {};
          items.forEach(it => {
            initInputs[it.fee_category_id] = { pay: "", discount: "" };
          });
          setInputs(initInputs);
        })
        .catch(e => setError("Failed to load fee breakdown: " + e.message))
        .finally(() => setLoadingItems(false));
    }
  }, [account]);

  const isOnlineMethod = RAZORPAY_METHODS.includes(method);

  // Auto Calculate Grand Totals
  let totalPayingPaise = 0;
  let totalDiscountPaise = 0;
  Object.values(inputs).forEach(val => {
    totalPayingPaise += toPaise(val.pay);
    totalDiscountPaise += toPaise(val.discount);
  });
  const grandTotalAmount = (totalPayingPaise / 100).toFixed(0);

  // UI Handlers for Item Inputs
  const updateInput = (catId, field, val) => {
    setInputs(prev => ({
      ...prev,
      [catId]: { ...prev[catId], [field]: val }
    }));
  };

  const handleManualSubmit = async () => {
    if (totalPayingPaise <= 0 && totalDiscountPaise <= 0) { 
      setError("Enter amount or discount for at least one category"); 
      return; 
    }
    setSaving(true); setError("");
    
    // Build Breakdown Array for Backend
    const breakdown = Object.entries(inputs)
      .filter(([cid, vals]) => toPaise(vals.pay) > 0 || toPaise(vals.discount) > 0)
      .map(([cid, vals]) => ({
        category_id: cid,
        pay_amount: toPaise(vals.pay),
        discount_amount: toPaise(vals.discount)
      }));

    try {
      await apiRequest("/fees/payments", "POST", {
        student_id: account.student_id,
        amount_paise: totalPayingPaise,
        payment_method: method,
        transaction_ref: ref || null,
        bank_name: bank || null,
        payment_date: date,
        remarks: remarks || null,
        breakdown: breakdown // 🔴 Naya array backend ke liye
      });
      onSuccess();
    } catch (e) {
      setError(e.message || "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRazorpayPay = async () => {
    if (totalPayingPaise <= 0) { setError("Enter a valid paying amount to proceed online"); return; }
    if (totalDiscountPaise > 0) { setError("A discount can be given only with Cash / Cheque / Bank collection, not with an online payment."); return; }
    setError(""); setRzpLoading(true);

    const breakdown = Object.entries(inputs)
      .filter(([cid, vals]) => toPaise(vals.pay) > 0 || toPaise(vals.discount) > 0)
      .map(([cid, vals]) => ({
        category_id: cid,
        pay_amount: toPaise(vals.pay),
        discount_amount: toPaise(vals.discount)
      }));

    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) throw new Error("Failed to load payment gateway. Check your internet connection.");

      const orderRes = await apiRequest("/payments/razorpay/create-order", "POST", {
        student_id: account.student_id,
        amount_paise: totalPayingPaise,
        breakdown,
      });
      const order = orderRes?.data;
      if (!order?.order_id) throw new Error("Could not create payment order");

      const rzp = new window.Razorpay({
        key: order.key_id, 
        amount: order.amount,
        currency: order.currency,
        name: account.school_name || "School Fee Payment",
        description: `Fee collection — ${account.student_name}`,
        order_id: order.order_id,
        prefill: {
          name: account.student_name,
          contact: order.guardian_phone || "",
          email: order.guardian_email || "",
        },
        theme: { color: C.primary },
        handler: async (response) => {
          setSaving(true);
          try {
            await apiRequest("/payments/razorpay/verify", "POST", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              student_id: account.student_id,
              amount_paise: totalPayingPaise,
              remarks: remarks || null,
              breakdown: breakdown // 🔴 Breakdown pass to verify API
            });
            onSuccess();
          } catch (e) {
            setError("Payment captured but verification failed: " + e.message);
          } finally {
            setSaving(false);
          }
        },
        modal: { ondismiss: () => setRzpLoading(false) },
      });
      rzp.on("payment.failed", (resp) => {
        setError(`Payment failed: ${resp.error.description || "Try again"}`);
        setRzpLoading(false);
      });
      rzp.open();
    } catch (e) {
      setError(e.message || "Could not start payment");
    } finally {
      setRzpLoading(false);
    }
  };

  // 🔴 NEW: Cashfree flow — same payload shape as handleRazorpayPay
const handleCashfreePay = async () => {
  if (totalPayingPaise <= 0) { setError("Enter a valid paying amount to proceed online"); return; }
  if (totalDiscountPaise > 0) { setError("A discount can be given only with Cash / Cheque / Bank collection, not with an online payment."); return; }
  setError(""); setRzpLoading(true);

  const breakdown = Object.entries(inputs)
    .filter(([cid, vals]) => toPaise(vals.pay) > 0 || toPaise(vals.discount) > 0)
    .map(([cid, vals]) => ({
      category_id: cid,
      pay_amount: toPaise(vals.pay),
      discount_amount: toPaise(vals.discount)
    }));

  try {
    const scriptOk = await loadCashfreeScript();
    if (!scriptOk) throw new Error("Failed to load payment gateway. Check your internet connection.");

    const orderRes = await apiRequest("/payments/cashfree/create-order", "POST", {
      student_id: account.student_id,
      amount_paise: totalPayingPaise,
      breakdown: breakdown,
    });
    const order = orderRes?.data;
    if (!order?.payment_session_id) throw new Error("Could not create payment order");

    // Remember what is being paid: if Cashfree redirects the browser away, /fees/cashfree-return finishes the job with this.
    try {
      localStorage.setItem(CF_PENDING_PREFIX + order.order_id, JSON.stringify({
        student_id: account.student_id, amount_paise: totalPayingPaise, remarks: remarks || null, breakdown, ts: Date.now(),
      }));
    } catch (_) { /* storage unavailable -> return page falls back to a lump-sum record */ }

    const cashfree = window.Cashfree({ mode: CASHFREE_MODE });
    const result = await cashfree.checkout({
      paymentSessionId: order.payment_session_id,
      redirectTarget: "_modal",
    });

    if (result?.error) {
      try { localStorage.removeItem(CF_PENDING_PREFIX + order.order_id); } catch (_) {}
      setError(`Payment failed: ${result.error.message || "Try again"}`);
      setRzpLoading(false);
      return;
    }

    // Cashfree is sending the browser to the return URL (UPI app / 3-D Secure / popup blocked):
    // this page is about to unload and /fees/cashfree-return will verify the payment.
    if (result?.redirect) return;

    setSaving(true);
    try {
      await verifyCashfreeWithRetry({
        cf_order_id: order.order_id,
        student_id: account.student_id,
        amount_paise: totalPayingPaise,
        remarks: remarks || null,
        breakdown: breakdown,
      });
      try { localStorage.removeItem(CF_PENDING_PREFIX + order.order_id); } catch (_) {}
      onSuccess();
    } catch (e) {
      setError("Could not confirm payment: " + e.message + " — if money was deducted, check the Receipts tab in a minute before trying again.");
    } finally {
      setSaving(false);
    }
  } catch (e) {
    setError(e.message || "Could not start payment");
  } finally {
    setRzpLoading(false);
  }
};
  return (
    <Modal open={!!account} onClose={onClose} title="Collect Fee Payment" width={600}>
      {account && (
        <div>
          {/* Header Info */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
            background: `linear-gradient(135deg,${C.surfaceAlt},${C.surface})`,
            borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 16,
          }}>
            {account.photo_url ? (
              <img src={account.photo_url} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${C.primary}22`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>
                {(account.student_name?.[0] || "?").toUpperCase()}
              </div>
            )}
              <div style={{ flex: 1, minWidth: 0 }}>
              <div className="syne" style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.student_name}</div>
              <div style={{ fontSize: 12, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.class_name} {account.section_name} · Adm# {account.admission_no}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 700 }}>Total Due</div>
              <div className="syne" style={{ fontWeight: 800, fontSize: 18, color: C.red }}>{rupees(account.pending_paise)}</div>
            </div>
          </div>

          {/* 🔴 NAYA: Itemized Fee Breakdown Table */}
          <div style={{ marginBottom: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Pending Items Breakdown</div>
            
            {loadingItems ? (
              <div className="pulse" style={{ textAlign: "center", color: C.primary, padding: "20px 0", fontSize: 12 }}>Fetching dues...</div>
            ) : pendingItems.length === 0 ? (
              <div style={{ textAlign: "center", color: C.green, padding: "20px 0", fontSize: 13, fontWeight: 600 }}>All dues cleared! 🎉</div>
            ) : (
              <div className="scroll-x">
              <table className="table" style={{ fontSize: 12, minWidth: 480 }}>
                <thead>
                  <tr>
                    <th>Fee Head</th>
                    <th style={{ textAlign: "right" }}>Due Amount</th>
                    <th style={{ width: 100 }}>Discount (₹)</th>
                    <th style={{ width: 110 }}>Paying Now (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map(item => {
                    // Smart Validation: Cannot exceed pending
                    const pendingRupees = item.pending_paise / 100;
                    const inp = inputs[item.fee_category_id] || { pay: "", discount: "" };
                    const isExceeding = (parseFloat(inp.pay || 0) + parseFloat(inp.discount || 0)) > pendingRupees;
                    
                    return (
                      <tr key={item.fee_category_id}>
                        <td style={{ fontWeight: 600 }}>{item.category_name}</td>
                        <td style={{ textAlign: "right", color: C.red, fontWeight: 600 }}>{rupees(item.pending_paise)}</td>
                        <td>
                          <input className="input" type="number" min={0} 
                            style={{ padding: "4px 8px", fontSize: 12, borderColor: isExceeding ? C.red : C.border }} 
                            placeholder="0" value={inp.discount} onChange={e => updateInput(item.fee_category_id, 'discount', e.target.value)} 
                          />
                        </td>
                        <td>
                          <input className="input" type="number" min={0} 
                            style={{ padding: "4px 8px", fontSize: 12, fontWeight: 700, color: C.green, borderColor: isExceeding ? C.red : C.border }} 
                            placeholder="0" value={inp.pay} onChange={e => updateInput(item.fee_category_id, 'pay', e.target.value)} 
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {/* Grand Total Row */}
                  <tr>
                    <td colSpan={3} style={{ textAlign: "right", fontWeight: 700, fontSize: 13 }}>Total Payable:</td>
                    <td style={{ fontSize: 16, fontWeight: 800, color: C.primary, background: `${C.primary}11`, borderRadius: 8, textAlign: "center" }}>₹{grandTotalAmount}</td>
                  </tr>
                  </tbody>
              </table>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <FormRow label="Payment Method">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PAYMENT_METHODS.map((m) => (
                <button key={m} onClick={() => setMethod(m)} disabled={rzpLoading} style={{
                  padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                  border: `1.5px solid ${method === m ? C.primary : C.border}`,
                  background: method === m ? `${C.primary}22` : C.surfaceAlt,
                  color: method === m ? C.primary : C.textMuted,
                }}>
                  {RAZORPAY_METHODS.includes(m) && "⚡ "}{m}
                </button>
              ))}
            </div>
          </FormRow>

          {isOnlineMethod ? (
  <>
    <FormRow label="Pay Via">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { id: "razorpay", label: "Razorpay" },
          { id: "cashfree", label: "Cashfree" },
        ].map((g) => (
          <button key={g.id} onClick={() => setGateway(g.id)} disabled={rzpLoading} style={{
            padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            border: `1.5px solid ${gateway === g.id ? C.primary : C.border}`,
            background: gateway === g.id ? `${C.primary}22` : C.surfaceAlt,
            color: gateway === g.id ? C.primary : C.textMuted,
          }}>
            {g.label}
          </button>
        ))}
      </div>
    </FormRow>

    <div style={{
      padding: 16, background: `${C.blue}11`, border: `1px solid ${C.blue}33`, borderRadius: 12, marginBottom: 16,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ fontSize: 28 }}>🔒</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
          Secure {gateway === "cashfree" ? "Cashfree" : "Razorpay"} Checkout
        </div>
        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>Payment gateway opens here. Grand total ₹{grandTotalAmount} will be processed.</div>
      </div>
    </div>
  </>
) : (
            <FormGrid cols={2}>
              <FormRow label="Payment Date">
                <input className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
              </FormRow>
              {method !== "Cash" && (
                <FormRow label="Bank Name">
                  <input className="input" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Optional" />
                </FormRow>
              )}
            </FormGrid>
          )}

          {!isOnlineMethod && method !== "Cash" && (
            <FormRow label="Transaction Ref / Cheque No.">
              <input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Optional" />
            </FormRow>
          )}

          <FormRow label="Remarks">
            <input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" disabled={rzpLoading} />
          </FormRow>

          {error && (
            <div style={{ padding: "10px 14px", background: `${C.red}15`, border: `1px solid ${C.red}33`, borderRadius: 8, color: C.red, fontSize: 13, marginBottom: 12 }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: `1px solid ${C.border}33`, paddingTop: 16 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving || rzpLoading}>Cancel</button>
            {isOnlineMethod ? (
              <button className="btn btn-primary" onClick={gateway === "cashfree" ? handleCashfreePay : handleRazorpayPay} disabled={saving || rzpLoading || grandTotalAmount <= 0} style={{ minWidth: 180, opacity: (saving || rzpLoading || grandTotalAmount <= 0) ? 0.7 : 1 }}>
  {rzpLoading || saving ? "Processing…" : `🔒 Pay ₹${grandTotalAmount} Securely`}
</button>
            ) : (
              <button className="btn btn-primary" onClick={handleManualSubmit} disabled={saving || (totalPayingPaise <= 0 && totalDiscountPaise <= 0)} style={{ minWidth: 160, opacity: (saving || (totalPayingPaise <= 0 && totalDiscountPaise <= 0)) ? 0.7 : 1 }}>
                {saving ? "Processing…" : `Confirm Collection`}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
