// @ts-nocheck
// Console -> Gateway payments: every Razorpay / Cashfree webhook hit, all schools (overview, events, raw payload, purge).
// Uses /platform/payments/webhooks*. PaymentEvents is also used by a school's own "Payments" tab.
import { useEffect, useState } from "react";
import { papi, ago, explain, toast } from "../api";
import { Modal, useLoad } from "../ui";
import { SchoolList } from "./Whatsapp";
import { C } from "../../theme/theme";

const inr = (p) => `\u20B9${(Number(p || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const OUT = { settled: ["Payment recorded", C.green], duplicate: ["Already recorded", C.blue], ignored: ["Ignored", C.textMuted], not_settled: ["Not completed", C.yellow], rejected: ["Rejected", C.red], not_configured: ["Not configured", C.red], error: ["Error", C.red] };
const PROBLEMS = ["error", "not_settled", "rejected", "not_configured"];
const GW = { razorpay: "Razorpay", cashfree: "Cashfree" };
const qs = (o) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null))).toString();
const iso = (d, plus) => (d ? new Date(new Date(`${d}T00:00:00Z`).getTime() + (plus ? 86400000 : 0)).toISOString() : "");
const Out = ({ o }) => { const [l, c] = OUT[o] || [o, C.textMuted]; return <span className="dc-chip" style={{ background: `${c}22`, color: c }}>{l}</span>; };

const EventModal = ({ id, onClose }) => {
  const r = useLoad(() => papi(`/payments/webhooks/${id}`), [id]);
  const d = r.data;
  let payload = null; try { payload = d && d.payload ? JSON.stringify(JSON.parse(d.payload), null, 2) : null; } catch (e) { payload = d ? d.payload : null; }
  return (
    <Modal title={`Webhook event #${id}`} onClose={onClose}>
      {r.loading && !d && <p style={{ color: C.textMuted }}>Loading...</p>}
      {r.err && <p style={{ color: C.red }}>{r.err}</p>}
      {d && (
        <>
          <div className="dc-row" style={{ justifyContent: "space-between", marginBottom: 8 }}><b>{GW[d.gateway] || d.gateway} | {d.event_type || "-"}</b><Out o={d.outcome} /></div>
          {[["School", d.school_name || "Unmatched (no school)"], ["Order ID", d.order_id], ["Payment ID", d.gateway_payment_id], ["Amount", d.amount_paise != null ? inr(d.amount_paise) : null], ["Signature verified", d.signature_ok ? "Yes" : "No"], ["HTTP status sent back", d.http_status], ["Received", d.received_at ? `${String(d.received_at).slice(0, 19).replace("T", " ")} UTC (${ago(d.received_at)})` : null], ["From IP", d.ip], ["Message", d.message]].filter(([, v]) => v != null && v !== "").map(([l, v]) => (
            <div key={l}><span className="dc-label">{l}</span><div style={{ fontSize: 13, wordBreak: "break-all" }}>{String(v)}</div></div>
          ))}
          {payload && <><span className="dc-label">Payload</span><pre style={{ maxHeight: "40vh", overflow: "auto", fontSize: 11.5, background: C.surfaceAlt, padding: 10, borderRadius: 8 }}>{payload}</pre></>}
        </>
      )}
    </Modal>
  );
};

export const PaymentEvents = ({ schoolId, initialSchool }) => {
  const E0 = { gateway: "", outcome: "", q: "", from: "", to: "", unmatched: false };
  const [f, setF] = useState(E0); const [school, setSchool] = useState(initialSchool || null); const [pick, setPick] = useState(false);
  const [rows, setRows] = useState([]); const [next, setNext] = useState(null); const [loading, setLoading] = useState(true); const [more, setMore] = useState(false); const [err, setErr] = useState(""); const [sel, setSel] = useState(null);
  const sid = schoolId || (school && school.id) || "";
  const key = `${f.gateway}|${f.outcome}|${f.q}|${f.from}|${f.to}|${f.unmatched}|${sid}`;
  const url = (before) => `/payments/webhooks?${qs({ gateway: f.gateway, outcome: f.outcome, q: f.q.trim(), from: iso(f.from), to: iso(f.to, true), unmatched: f.unmatched ? "1" : "", school_id: sid, before_id: before || "", limit: 40 })}`;
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      papi(url()).then((r) => { setRows(r.items || []); setNext(r.next_before_id || null); setErr(""); }).catch((e) => setErr(e.message)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line
  const loadMore = async () => { setMore(true); try { const r = await papi(url(next)); setRows((x) => [...x, ...(r.items || [])]); setNext(r.next_before_id || null); } catch (e) { toast(explain(e), "err"); } finally { setMore(false); } };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="dc-row">
          {!schoolId && (school ? <button className="btn btn-primary" onClick={() => setSchool(null)}>{school.name} x</button> : <button className="btn btn-ghost" onClick={() => setPick(true)}>All schools (filter)</button>)}
          <select className="select" style={{ width: 130 }} value={f.gateway} onChange={set("gateway")}><option value="">All gateways</option><option value="razorpay">Razorpay</option><option value="cashfree">Cashfree</option></select>
          <select className="select" style={{ width: 170 }} value={f.outcome} onChange={set("outcome")}><option value="">Any result</option>{Object.entries(OUT).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
          <input className="input" style={{ width: 180 }} placeholder="Order / payment ID" value={f.q} onChange={set("q")} />
          <input className="input" type="date" style={{ width: 140 }} value={f.from} onChange={set("from")} title="From" />
          <input className="input" type="date" style={{ width: 140 }} value={f.to} onChange={set("to")} title="To" />
          {!schoolId && <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={f.unmatched} onChange={(e) => setF({ ...f, unmatched: e.target.checked })} /> Unmatched only</label>}
          {(f.gateway || f.outcome || f.q || f.from || f.to || f.unmatched) && <button className="btn btn-ghost" onClick={() => setF(E0)}>Reset</button>}
        </div>
        {pick && <Modal title="Filter by school" onClose={() => setPick(false)}><SchoolList onPick={(s) => { setSchool(s); setPick(false); }} /></Modal>}
      </div>
      {err && <div className="card" style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <p style={{ padding: 20, color: C.textMuted }}>Loading...</p> : !rows.length ? <p style={{ padding: 20, color: C.textMuted }}>No webhook events match these filters.</p> : (
          <div className="scroll-x"><table className="table">
            <thead><tr><th>Received</th><th>Gateway</th><th>Event</th>{!schoolId && <th>School</th>}<th>Order ID</th><th>Amount</th><th>Result</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => setSel(r.id)}>
                <td style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap" }}>{ago(r.received_at)}</td>
                <td style={{ fontWeight: 700, fontSize: 12.5 }}>{GW[r.gateway] || r.gateway}</td>
                <td style={{ fontSize: 11.5, color: C.textMuted }}>{r.event_type || "-"}</td>
                {!schoolId && <td style={{ fontSize: 12.5, fontWeight: 700, color: r.school_name ? undefined : C.yellow }}>{r.school_name || "Unmatched"}</td>}
                <td className="dc-mono">{r.order_id || "-"}</td>
                <td>{r.amount_paise != null ? inr(r.amount_paise) : "-"}</td>
                <td><Out o={r.outcome} />{!r.signature_ok && <span className="dc-chip" style={{ background: `${C.red}22`, color: C.red, marginLeft: 4 }}>bad signature</span>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
        {next && !loading && <div style={{ padding: "10px 14px", textAlign: "center", borderTop: `1px solid ${C.border}` }}><button className="btn btn-ghost" disabled={more} onClick={loadMore}>{more ? "Loading..." : "Load more"}</button></div>}
      </div>
      {sel && <EventModal id={sel} onClose={() => setSel(null)} />}
    </>
  );
};

const Overview = ({ onSchool }) => {
  const [days, setDays] = useState(7); const [ask, setAsk] = useState(false); const [busy, setBusy] = useState(false);
  const s = useLoad(() => papi(`/payments/webhooks/summary?days=${days}`), [days]);
  const d = s.data;
  const purge = async () => { setBusy(true); try { const r = await papi("/payments/webhooks/purge", "POST", { days: 180 }); toast(`Deleted ${r.deleted} old events`); setAsk(false); s.reload(); } catch (e) { toast(explain(e), "err"); } finally { setBusy(false); } };
  if (s.err) return <div className="card" style={{ color: C.red }}>{s.err}</div>;
  if (!d) return <p style={{ color: C.textMuted }}>Loading...</p>;
  const by = d.by_outcome || [];
  const sum = (fn, k) => by.filter(fn).reduce((a, r) => a + (k === "amt" ? r.amount_paise : r.count), 0);
  const cards = [["Payments recorded", sum((r) => r.outcome === "settled"), C.green, inr(sum((r) => r.outcome === "settled", "amt"))], ["Already recorded", sum((r) => r.outcome === "duplicate"), C.blue], ["Needs attention", sum((r) => PROBLEMS.includes(r.outcome)), C.red], ["All events", sum(() => true), C.primary]];
  const gws = [...new Set(by.map((r) => r.gateway))];
  return (
    <>
      <div className="dc-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div className="dc-row">{[1, 7, 30, 90].map((n) => <button key={n} className={`btn ${days === n ? "btn-primary" : "btn-ghost"}`} onClick={() => setDays(n)}>{n === 1 ? "24 hours" : `${n} days`}</button>)}</div>
        <button className="btn btn-ghost" style={{ color: C.red }} onClick={() => setAsk(true)}>Purge old events</button>
      </div>
      <div className="dc-grid">{cards.map(([l, v, c, sub]) => <div key={l} className="card dc-kpi" style={{ "--k": c }}><b>{v}</b><span>{l}{sub ? ` (${sub})` : ""}</span></div>)}</div>
      <div className="dc-split" style={{ marginBottom: 14 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px" }}><b className="syne" style={{ fontSize: 14 }}>By gateway</b></div>
          <div className="scroll-x"><table className="table"><thead><tr><th>Gateway</th><th>Result</th><th>Events</th><th>Amount</th></tr></thead>
            <tbody>{by.map((r, i) => <tr key={i}><td style={{ fontWeight: 700 }}>{GW[r.gateway] || r.gateway}</td><td><Out o={r.outcome} /></td><td>{r.count}</td><td>{r.amount_paise ? inr(r.amount_paise) : "-"}</td></tr>)}</tbody></table></div>
          {!gws.length && <p style={{ padding: "0 14px 14px", color: C.textMuted }}>No webhook events in this period.</p>}
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px" }}><b className="syne" style={{ fontSize: 14 }}>By school</b></div>
          <div className="scroll-x"><table className="table"><thead><tr><th>School</th><th>Events</th><th>Settled</th><th>Problems</th><th>Amount</th></tr></thead>
            <tbody>{(d.by_school || []).map((r, i) => (
              <tr key={r.school_id || i} style={{ cursor: r.school_id ? "pointer" : "default" }} onClick={() => r.school_id && onSchool({ id: r.school_id, name: r.school_name })}>
                <td style={{ fontWeight: 700, fontSize: 12.5, color: r.school_id ? undefined : C.yellow }}>{r.school_name || "Unmatched (no school)"}</td><td>{r.count}</td><td>{r.settled}</td><td style={{ color: r.problems ? C.red : undefined }}>{r.problems}</td><td>{inr(r.amount_paise)}</td>
              </tr>))}</tbody></table></div>
        </div>
      </div>
      {ask && (
        <Modal title="Purge old webhook events" onClose={() => setAsk(false)}>
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>Deletes webhook events older than 180 days (the raw payloads are the heavy part). Payments themselves are not affected.</p>
          <button className="btn btn-danger" disabled={busy} onClick={purge}>{busy ? "Deleting..." : "Purge"}</button>
        </Modal>
      )}
    </>
  );
};

export const PaymentsPage = ({ tab: tabProp, onTab }) => {
  const [tabLocal, setTabLocal] = useState("overview");
  const [school, setSchool] = useState(null);
  const tab = tabProp || tabLocal;
  const setTab = (k) => { setTabLocal(k); if (onTab) onTab(k); };
  return (
    <div>
      <div className="dc-tabs">{[["overview", "Overview"], ["events", "Events"]].map(([k, l]) => <button key={k} className={`btn ${tab === k ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === "overview" && <Overview onSchool={(s) => { setSchool(s); setTab("events"); }} />}
      {tab === "events" && <PaymentEvents key={school ? school.id : "all"} initialSchool={school} />}
    </div>
  );
};
