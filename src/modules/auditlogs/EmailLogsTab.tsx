// @ts-nocheck
// Audit -> Email Logs: usage analytics + billing view + full email log (filter by month, session, type, status, sender, recipient/subject).
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { KpiCard } from "../../components/ui/KpiCard";
import { C } from "../../theme/theme";

const PURPOSES = {
  OTP_SIGNUP: "Signup OTP", OTP_FORGOT: "Password reset OTP", OTP_STUDENT: "Student reset OTP",
  ATTENDANCE_ALERT: "Attendance alert", FEE_RECEIPT: "Fee receipt", COMMHUB: "Message / notice", NOTIFICATION: "Notification", TEST: "Test", OTHER: "Other",
};
const CATS = { otp: "OTP", receipt: "Fee receipts", notice: "Notices", other: "Other" };
const REASONS = { no_sender: "No school email added", not_verified: "Email not verified", own_failed: "Own email failed" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m) => { const p = String(m || "").split("-"); return p.length === 2 ? `${MON[Number(p[1]) - 1]} ${p[0]}` : m; };
const pLabel = (p) => PURPOSES[p] || p;
const monthTitle = (m) => (m ? monthLabel(m) : "selected period");

export const EmailLogsTab = () => {
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

  useEffect(() => { apiRequest("/whatsapp/email/usage/options").then((r) => setOpts(r?.data || { months: [], academic_years: [] })).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(() => setQ(qInput.trim()), 450); return () => clearTimeout(t); }, [qInput]);
  useEffect(() => { setPage(1); }, [month, ay, purpose, status, via, q]);

  useEffect(() => {
    apiRequest(`/whatsapp/email/usage/summary?${qs()}`).then((r) => { setSummary(r?.data || null); setError(""); })
      .catch((e) => setError(e?.message || "Could not load email usage."));
  }, [month, ay, purpose, status, via, q]); // eslint-disable-line

  useEffect(() => {
    setLoading(true);
    apiRequest(`/whatsapp/email/usage/logs?${qs({ page, limit: 30 })}`)
      .then((r) => { setLogs(Array.isArray(r?.data) ? r.data : []); setPagination(r?.pagination || { total: 0, page: 1, pages: 1 }); })
      .catch((e) => setError(e?.message || "Could not load email logs."))
      .finally(() => setLoading(false));
  }, [page, month, ay, purpose, status, via, q]); // eslint-disable-line

  const t = summary?.totals || { total: 0, sent: 0, failed: 0, own_email: 0, system_email: 0, billable: 0, attachments: 0, success_rate: 0 };
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
            <option value="">All email types</option>
            {Object.entries(PURPOSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="select" style={{ width: 130 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <select className="select" style={{ width: 190 }} value={via} onChange={(e) => setVia(e.target.value)}>
            <option value="">Any sender</option>
            <option value="own">Your own email</option>
            <option value="fallback">School Office email</option>
          </select>
          <input className="input" style={{ width: 210 }} placeholder="Search recipient / subject" value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </div>
      </div>

      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard label="Total Emails" value={t.total} icon="chart" color={C.blue} />
        <KpiCard label="Sent" value={t.sent} sub={`${t.success_rate}% success`} icon="check" color={C.green} />
        <KpiCard label="Failed" value={t.failed} icon="warning" color={C.red} />
        <KpiCard label="Own / School Office" value={`${t.own_email} / ${t.system_email}`} sub="Sender address split" icon="mail" color={C.yellow} />
      </div>

      {chart.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{summary.range === "last_30_days" ? "Emails per Day (last 30 days)" : "Emails per Day"}</h3>
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

      {(summary?.by_category || []).length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline", marginBottom: 12 }}>
            <h3 className="syne" style={{ fontSize: 14, fontWeight: 700 }}>Billing summary ({monthTitle(month)})</h3>
            <span style={{ fontSize: 12, color: C.textMuted }}>Billable = delivered from the School Office address. Your own email is not billed.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            {summary.by_category.map((c) => (
              <div key={c.category} style={{ background: C.surfaceAlt, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>{CATS[c.category] || c.category}</div>
                <div className="syne" style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{c.billable}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted }}>billable of {c.total}</div>
              </div>
            ))}
            <div style={{ background: `${C.primary}18`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Total billable</div>
              <div className="syne" style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{t.billable}</div>
              <div style={{ fontSize: 11.5, color: C.textMuted }}>{t.attachments} attachment(s) sent</div>
            </div>
          </div>
        </div>
      )}

      {(summary?.by_purpose || []).length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>Email type</th><th>Total</th><th>Sent</th><th>Failed</th><th>Own email</th><th>School Office email</th><th>Billable</th></tr></thead>
              <tbody>
                {summary.by_purpose.map((r) => (
                  <tr key={r.purpose}>
                    <td style={{ fontWeight: 700, fontSize: 12.5 }}>{pLabel(r.purpose)} <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 500 }}>{r.category}</span></td>
                    <td>{r.total}</td><td style={{ color: C.green }}>{r.sent}</td><td style={{ color: r.failed ? C.red : undefined }}>{r.failed}</td>
                    <td>{r.own_email}</td><td>{r.system_email}</td><td style={{ fontWeight: 700 }}>{r.billable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(reasons || (summary.top_errors || []).length > 0) && (
            <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}33`, fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
              {reasons && <div>Sent from School Office address because: {reasons}</div>}
              {(summary.top_errors || []).length > 0 && <div>Top errors: {summary.top_errors.map((e) => `(${e.total}) ${e.message || ""}`).join("  |  ")}</div>}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="pulse" style={{ padding: 50, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 50, textAlign: "center", color: C.textMuted }}>No emails match these filters.</div>
        ) : (
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>Type</th><th>To</th><th>Subject</th><th>Sender</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 12.5, fontWeight: 700 }}>{pLabel(l.purpose)}</td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.to_email || ""}>{l.to_email || "-"}</td>
                    <td style={{ fontSize: 11.5, color: C.textMuted, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.subject || ""}>{l.subject || "-"}{l.attachment_count > 0 ? ` (+${l.attachment_count} file)` : ""}</td>
                    <td>
                      {l.via_fallback
                        ? <span className="badge badge-yellow" style={{ fontSize: 10 }} title={REASONS[l.fallback_reason] || ""}>School Office</span>
                        : <span className="badge badge-green" style={{ fontSize: 10 }} title={l.sender_email || ""}>Own email</span>}
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
            <div style={{ fontSize: 12, color: C.textMuted }}>Page {pagination.page} of {pagination.pages} - {pagination.total} emails</div>
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
