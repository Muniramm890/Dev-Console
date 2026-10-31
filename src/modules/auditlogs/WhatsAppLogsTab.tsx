// @ts-nocheck
// Audit -> WhatsApp Logs: usage analytics + full message log (filter by month, session, purpose, status, sender, phone).
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { KpiCard } from "../../components/ui/KpiCard";
import { C } from "../../theme/theme";

const PURPOSES = {
  OTP_SIGNUP: "Signup OTP", OTP_FORGOT: "Password reset OTP", OTP_STUDENT: "Student reset OTP",
  ATTENDANCE_ALERT: "Attendance alert", FEE_RECEIPT: "Fee receipt", COMMHUB: "Notification", TEST: "Test", OTHER: "Other",
};
const REASONS = { no_number: "No school number", not_verified: "Number not verified", own_failed: "Own number failed" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m) => { const p = String(m || "").split("-"); return p.length === 2 ? `${MON[Number(p[1]) - 1]} ${p[0]}` : m; };
const pLabel = (p) => PURPOSES[p] || p;

export const WhatsAppLogsTab = () => {
  const [opts, setOpts] = useState({ months: [], academic_years: [] });
  const [month, setMonth] = useState("");
  const [ay, setAy] = useState("");
  const [purpose, setPurpose] = useState("");
  const [status, setStatus] = useState("");
  const [via, setVia] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const qs = (extra = {}) => new URLSearchParams({ month, academic_year_id: ay, purpose, status, via, q, ...extra }).toString();

  useEffect(() => { apiRequest("/whatsapp/usage/options").then((r) => setOpts(r?.data || { months: [], academic_years: [] })).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(() => setQ(qInput.trim()), 450); return () => clearTimeout(t); }, [qInput]);
  useEffect(() => { setPage(1); }, [month, ay, purpose, status, via, q]);

  useEffect(() => {
    apiRequest(`/whatsapp/usage/summary?${qs()}`).then((r) => { setSummary(r?.data || null); setError(""); })
      .catch((e) => setError(e?.message || "Could not load WhatsApp usage."));
  }, [month, ay, purpose, status, via, q]); // eslint-disable-line

  useEffect(() => {
    setLoading(true);
    apiRequest(`/whatsapp/usage/logs?${qs({ page, limit: 30 })}`)
      .then((r) => { setLogs(Array.isArray(r?.data) ? r.data : []); setPagination(r?.pagination || { total: 0, page: 1, pages: 1 }); })
      .catch((e) => setError(e?.message || "Could not load WhatsApp logs."))
      .finally(() => setLoading(false));
  }, [page, month, ay, purpose, status, via, q]); // eslint-disable-line

  const t = summary?.totals || { total: 0, sent: 0, failed: 0, own_number: 0, fallback_number: 0, success_rate: 0 };
  const chart = (summary?.by_period || []).map((p) => ({ name: `${Number(p.period.slice(8, 10))} ${MON[Number(p.period.slice(5, 7)) - 1]}`, Sent: p.sent, Failed: p.failed }));
  const reasons = (summary?.fallback_reasons || []).map((r) => `${REASONS[r.reason] || r.reason}: ${r.total}`).join("  |  ");

  return (
    <>
      {error && <div className="card" style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select className="select" style={{ width: 150 }} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {opts.months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <select className="select" style={{ width: 160 }} value={ay} onChange={(e) => setAy(e.target.value)}>
            <option value="">All sessions</option>
            {opts.academic_years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.is_current ? " (current)" : ""}</option>)}
          </select>
          <select className="select" style={{ width: 180 }} value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="">All message types</option>
            {Object.entries(PURPOSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="select" style={{ width: 130 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <select className="select" style={{ width: 190 }} value={via} onChange={(e) => setVia(e.target.value)}>
            <option value="">Any sender</option>
            <option value="own">Your own number</option>
            <option value="fallback">School Office number</option>
          </select>
          <input className="input" style={{ width: 170 }} placeholder="Search phone number" value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </div>
      </div>

      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard label="Total Messages" value={t.total} icon="chart" color={C.blue} />
        <KpiCard label="Sent" value={t.sent} sub={`${t.success_rate}% success`} icon="check" color={C.green} />
        <KpiCard label="Failed" value={t.failed} icon="warning" color={C.red} />
        <KpiCard label="Own / School Office" value={`${t.own_number} / ${t.fallback_number}`} sub="Sender number split" icon="attendance" color={C.yellow} />
      </div>

      {chart.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{summary.range === "last_30_days" ? "Messages per Day (last 30 days)" : "Messages per Day"}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${C.border}55`} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.textMuted }} />
              <Tooltip />
              <Bar dataKey="Sent" stackId="a" fill={C.green} />
              <Bar dataKey="Failed" stackId="a" fill={C.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(summary?.by_purpose || []).length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>Message type</th><th>Total</th><th>Sent</th><th>Failed</th><th>Own number</th><th>School Office number</th></tr></thead>
              <tbody>
                {summary.by_purpose.map((r) => (
                  <tr key={r.purpose}>
                    <td style={{ fontWeight: 700, fontSize: 12.5 }}>{pLabel(r.purpose)} <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 500 }}>{r.category}</span></td>
                    <td>{r.total}</td><td style={{ color: C.green }}>{r.sent}</td><td style={{ color: r.failed ? C.red : undefined }}>{r.failed}</td>
                    <td>{r.own_number}</td><td>{r.fallback_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(reasons || (summary.top_errors || []).length > 0) && (
            <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}33`, fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
              {reasons && <div>Sent from School Office number because: {reasons}</div>}
              {(summary.top_errors || []).length > 0 && <div>Top errors: {summary.top_errors.map((e) => `${e.error_code || "?"} (${e.total}) ${e.message || ""}`).join("  |  ")}</div>}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="pulse" style={{ padding: 50, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 50, textAlign: "center", color: C.textMuted }}>No WhatsApp messages match these filters.</div>
        ) : (
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>Type</th><th>To</th><th>Template</th><th>Sender</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 12.5, fontWeight: 700 }}>{pLabel(l.purpose)}</td>
                    <td style={{ fontSize: 12, fontFamily: "monospace" }}>{l.to_phone ? `+${l.to_phone}` : "-"}</td>
                    <td style={{ fontSize: 11.5, color: C.textMuted }}>{l.template_name || "-"}</td>
                    <td>
                      {l.via_fallback
                        ? <span className="badge badge-yellow" style={{ fontSize: 10 }} title={REASONS[l.fallback_reason] || ""}>School Office</span>
                        : <span className="badge badge-green" style={{ fontSize: 10 }}>Own number</span>}
                    </td>
                    <td>
                      <span className={`badge ${l.send_status === "sent" ? "badge-green" : "badge-red"}`} style={{ fontSize: 10 }} title={l.error_message || ""}>
                        {l.send_status === "sent" ? "Sent" : "Failed"}
                      </span>
                      {l.send_status === "failed" && l.error_message && (
                        <div style={{ fontSize: 10.5, color: C.red, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.error_message}</div>
                      )}
                    </td>
                    <td style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap" }}>
                      {new Date(l.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: `1px solid ${C.border}33` }}>
            <div style={{ fontSize: 12, color: C.textMuted }}>Page {pagination.page} of {pagination.pages} - {pagination.total} messages</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
