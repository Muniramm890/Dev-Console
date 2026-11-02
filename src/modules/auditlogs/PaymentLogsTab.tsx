// @ts-nocheck
// Audit -> Payment Logs: every Razorpay / Cashfree webhook event for this school (payment recorded, already recorded, problems).
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { KpiCard } from "../../components/ui/KpiCard";
import { Modal } from "../../components/ui/Modal";
import { C } from "../../theme/theme";

const inr = (p) => `\u20B9${(Number(p || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const OUT = {
  settled: ["Payment recorded", "badge-green"], duplicate: ["Already recorded", "badge-blue"], ignored: ["Ignored", "badge-blue"],
  not_settled: ["Not completed", "badge-yellow"], rejected: ["Rejected", "badge-red"], not_configured: ["Not configured", "badge-red"], error: ["Error", "badge-red"],
};
const PROBLEMS = ["error", "not_settled", "rejected", "not_configured"];
const GW = { razorpay: "Razorpay", cashfree: "Cashfree" };
const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");
const iso = (d, plus) => (d ? new Date(new Date(`${d}T00:00:00Z`).getTime() + (plus ? 86400000 : 0)).toISOString() : "");
const qs = (o) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null))).toString();

const Detail = ({ id, onClose }) => {
  const [d, setD] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { apiRequest(`/payment-log/events/${id}`).then((r) => setD(r?.data || null)).catch((e) => setErr(e?.message || "Could not load the event.")); }, [id]);
  const o = d ? (OUT[d.outcome] || [d.outcome, "badge-blue"]) : null;
  return (
    <Modal open onClose={onClose} title="Payment event" width={520}>
      {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
      {!d && !err && <div className="pulse" style={{ padding: 24, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading...</div>}
      {d && (
        <div style={{ fontSize: 13 }}>
          {[["Gateway", GW[d.gateway] || d.gateway], ["Event", d.event_type || "-"], ["Order ID", d.order_id || "-"], ["Payment ID", d.gateway_payment_id || "-"], ["Amount", d.amount_paise != null ? inr(d.amount_paise) : "-"], ["Received", when(d.received_at)], ["Signature verified", d.signature_ok ? "Yes" : "No"]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}33` }}><span style={{ color: C.textMuted, fontWeight: 600 }}>{l}</span><span style={{ fontWeight: 700, textAlign: "right", wordBreak: "break-all" }}>{v}</span></div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}><span style={{ color: C.textMuted, fontWeight: 600 }}>Result</span><span className={`badge ${o[1]}`}>{o[0]}</span></div>
          {d.message && <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6 }}>{d.message}</div>}
        </div>
      )}
    </Modal>
  );
};

export const PaymentLogsTab = () => {
  const [days, setDays] = useState(30);
  const [sum, setSum] = useState(null);
  const [f, setF] = useState({ gateway: "", outcome: "", q: "", from: "", to: "" });
  const [rows, setRows] = useState([]); const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true); const [more, setMore] = useState(false); const [error, setError] = useState(""); const [sel, setSel] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const query = (before) => `/payment-log/events?${qs({ gateway: f.gateway, outcome: f.outcome, q: f.q.trim(), from: iso(f.from), to: iso(f.to, true), before_id: before || "", limit: 30 })}`;

  useEffect(() => { apiRequest(`/payment-log/summary?days=${days}`).then((r) => setSum(r?.data || null)).catch((e) => setError(e?.message || "Could not load the payment summary.")); }, [days]);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      apiRequest(query()).then((r) => { setRows(r?.data?.items || []); setNext(r?.data?.next_before_id || null); setError(""); })
        .catch((e) => setError(e?.message || "Could not load payment logs.")).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [f.gateway, f.outcome, f.q, f.from, f.to]); // eslint-disable-line
  const loadMore = async () => {
    setMore(true);
    try { const r = await apiRequest(query(next)); setRows((x) => [...x, ...(r?.data?.items || [])]); setNext(r?.data?.next_before_id || null); } catch (e) { setError(e?.message || "Could not load more."); } finally { setMore(false); }
  };

  const by = sum?.by_outcome || [];
  const tot = (fn, key) => by.filter(fn).reduce((a, r) => a + (key === "amount" ? r.amount_paise : r.count), 0);
  const settled = tot((r) => r.outcome === "settled"); const settledAmt = tot((r) => r.outcome === "settled", "amount");
  const dup = tot((r) => r.outcome === "duplicate"); const prob = tot((r) => PROBLEMS.includes(r.outcome)); const all = tot(() => true);
  const gws = [...new Set(by.map((r) => r.gateway))];

  return (
    <>
      {error && <div className="card" style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[7, 30, 90].map((n) => <button key={n} className={`btn ${days === n ? "btn-primary" : "btn-ghost"}`} style={{ fontSize: 12 }} onClick={() => setDays(n)}>Last {n} days</button>)}
      </div>
      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard label="Payments recorded" value={settled} sub={inr(settledAmt)} icon="check" color={C.green} />
        <KpiCard label="Already recorded" value={dup} sub="Repeat notifications" icon="chart" color={C.blue} />
        <KpiCard label="Needs attention" value={prob} sub="Failed or not completed" icon="warning" color={C.red} />
        <KpiCard label="All gateway events" value={all} icon="attendance" color={C.yellow} />
      </div>

      {gws.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
          <div className="scroll-x"><table className="table">
            <thead><tr><th>Gateway</th><th>Payments recorded</th><th>Amount</th><th>Already recorded</th><th>Needs attention</th></tr></thead>
            <tbody>{gws.map((g) => {
              const rs = by.filter((r) => r.gateway === g); const s = rs.filter((r) => r.outcome === "settled"); const p = rs.filter((r) => PROBLEMS.includes(r.outcome));
              return <tr key={g}><td style={{ fontWeight: 700 }}>{GW[g] || g}</td><td>{s.reduce((a, r) => a + r.count, 0)}</td><td>{inr(s.reduce((a, r) => a + r.amount_paise, 0))}</td><td>{rs.filter((r) => r.outcome === "duplicate").reduce((a, r) => a + r.count, 0)}</td><td style={{ color: p.length ? C.red : undefined }}>{p.reduce((a, r) => a + r.count, 0)}</td></tr>;
            })}</tbody>
          </table></div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select className="select" style={{ width: 140 }} value={f.gateway} onChange={set("gateway")}><option value="">All gateways</option><option value="razorpay">Razorpay</option><option value="cashfree">Cashfree</option></select>
          <select className="select" style={{ width: 190 }} value={f.outcome} onChange={set("outcome")}><option value="">Any result</option>{Object.entries(OUT).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
          <input className="input" style={{ width: 200 }} placeholder="Order or payment ID" value={f.q} onChange={set("q")} />
          <input className="input" type="date" style={{ width: 150 }} value={f.from} onChange={set("from")} title="From" />
          <input className="input" type="date" style={{ width: 150 }} value={f.to} onChange={set("to")} title="To" />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="pulse" style={{ padding: 50, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading payment logs...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 50, textAlign: "center", color: C.textMuted }}>No gateway events match these filters.</div>
        ) : (
          <div className="scroll-x"><table className="table">
            <thead><tr><th>When</th><th>Gateway</th><th>Event</th><th>Order ID</th><th>Amount</th><th>Result</th></tr></thead>
            <tbody>{rows.map((r) => {
              const o = OUT[r.outcome] || [r.outcome, "badge-blue"];
              return (
                <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => setSel(r.id)}>
                  <td style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap" }}>{when(r.received_at)}</td>
                  <td style={{ fontWeight: 700, fontSize: 12.5 }}>{GW[r.gateway] || r.gateway}</td>
                  <td style={{ fontSize: 11.5, color: C.textMuted }}>{r.event_type || "-"}</td>
                  <td style={{ fontSize: 11.5, fontFamily: "monospace" }}>{r.order_id || "-"}</td>
                  <td>{r.amount_paise != null ? inr(r.amount_paise) : "-"}</td>
                  <td><span className={`badge ${o[1]}`} style={{ fontSize: 10 }}>{o[0]}</span></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
        {next && !loading && (
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}33`, textAlign: "center" }}>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} disabled={more} onClick={loadMore}>{more ? "Loading..." : "Load more"}</button>
          </div>
        )}
      </div>
      {sel && <Detail id={sel} onClose={() => setSel(null)} />}
    </>
  );
};
