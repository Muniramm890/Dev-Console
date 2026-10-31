// FILE: teacher-app/src/modules/auditlogs/AuditLogModule.tsx
// Source: admin App.tsx -> AuditLogModule [23112-23346]
// @ts-nocheck
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { Modal } from "../../components/ui/Modal";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useDialog } from "../../contexts/DialogContext";
import { AUDIT_ACTION_META, getAuditMeta } from "./helpers";
import { WhatsAppLogsTab } from "./WhatsAppLogsTab";
import { C } from "../../theme/theme";

export const AuditLogModule = () => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [tab, setTab] = useState("system"); // 'system' | 'whatsapp' | 'razorpay'

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("");
  const [userRole, setUserRole] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeApiCalls, setIncludeApiCalls] = useState(false);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [cleanupModal, setCleanupModal] = useState(false);
  const [cleanupMonths, setCleanupMonths] = useState(6);
  const [cleaning, setCleaning] = useState(false);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await apiRequest("/audit/stats");
      setStats(res?.data || null);
    } catch (e) { console.error(e); } finally { setLoadingStats(false); }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: 30,
        search: search || "", actionType: actionType || "", userRole: userRole || "",
        from: from || "", to: to || "",
        includeApiCalls: includeApiCalls ? "1" : "0",
      });
      const res = await apiRequest(`/audit?${params.toString()}`);
      setLogs(Array.isArray(res?.data) ? res.data : []);
      setPagination(res?.pagination || { total: 0, page: 1, pages: 1 });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { setPage(1); }, [search, actionType, userRole, from, to, includeApiCalls]);
  useEffect(() => { loadLogs(); }, [page, search, actionType, userRole, from, to, includeApiCalls]); // eslint-disable-line

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const res = await apiRequest("/audit/cleanup", "DELETE", { months: cleanupMonths });
      await dialogAlert(`${res?.data?.deleted || 0} old log(s) deleted successfully.`, "Cleanup Complete");
      setCleanupModal(false);
      await loadStats();
      await loadLogs();
    } catch (e) { dialogAlert("Cleanup failed: " + e.message, "Error"); } finally { setCleaning(false); }
  };

  return (
    <div className="slide-in">
      <SectionHeader
        title="Audit Logs"
        sub="Super Admin only — full visibility into every important action taken across the school"
        action={
          <button className="btn btn-danger" onClick={() => setCleanupModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="trash" size={14} /> Clean Up Old Logs
          </button>
        }
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { id: "system", label: "System Activity" },
          { id: "whatsapp", label: "WhatsApp Logs" },
          { id: "razorpay", label: "Razorpay Logs", soon: true },
        ].map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {t.label}
            {t.soon && <span style={{ fontSize: 9, fontWeight: 800, background: `${C.yellow}22`, color: C.yellow, padding: "1px 6px", borderRadius: 8 }}>SOON</span>}
          </button>
        ))}
      </div>

      {tab === "whatsapp" ? (
        <WhatsAppLogsTab />
      ) : tab !== "system" ? (
        <div className="card" style={{ padding: 50, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>{tab === "whatsapp" ? "💬" : "💳"}</div>
          <div className="syne" style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
            {tab === "whatsapp" ? "WhatsApp Delivery Logs" : "Razorpay Payment Gateway Logs"}
          </div>
          <div style={{ color: C.textMuted, fontSize: 13, maxWidth: 420, margin: "0 auto" }}>
            Coming soon — this tab will show a dedicated audit trail for every {tab === "whatsapp" ? "WhatsApp OTP/notification sent" : "Razorpay order and payment event"},
            alongside Email logs once that channel is integrated.
          </div>
        </div>
      ) : (
        <>
          <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
            <KpiCard label="Total Logs" value={loadingStats ? "—" : stats?.totalLogs || 0} icon="chart" color={C.blue} />
            <KpiCard label="Today" value={loadingStats ? "—" : stats?.todayCount || 0} icon="check" color={C.green} />
            <KpiCard label="Failed Logins (7d)" value={loadingStats ? "—" : stats?.failedLogins7d || 0} icon="warning" color={C.red} />
            <KpiCard
              label="Older than 6 Months"
              value={loadingStats ? "—" : stats?.oldLogsCount || 0}
              sub={stats?.oldestLog ? `Oldest: ${new Date(stats.oldestLog).toLocaleDateString("en-IN")}` : undefined}
              icon="attendance" color={C.yellow}
            />
          </div>

          {!loadingStats && stats?.breakdown?.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Activity Breakdown (Last 30 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.breakdown.map((b) => ({ name: getAuditMeta(b.action_type).label, count: b.cnt }))} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" tick={{ fill: C.textMuted, fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                  <Bar dataKey="count" fill={C.primary} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card" style={{ marginBottom: 14, padding: "12px 16px" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                <Icon name="search" size={14} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input className="input" placeholder="Search by user or endpoint…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
              </div>
              <select className="select" style={{ width: 180 }} value={actionType} onChange={(e) => setActionType(e.target.value)}>
                <option value="">All Action Types</option>
                {Object.keys(AUDIT_ACTION_META).filter((k) => k !== "API_CALL").map((k) => (
                  <option key={k} value={k}>{AUDIT_ACTION_META[k].label}</option>
                ))}
              </select>
              <select className="select" style={{ width: 140 }} value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                <option value="">All Roles</option>
                <option value="school_admin">Super Admin</option>
                <option value="teacher">Teacher</option>
                <option value="accountant">Accountant</option>
                <option value="staff">Staff</option>
              </select>
              <input className="input" type="date" style={{ width: 150 }} value={from} onChange={(e) => setFrom(e.target.value)} />
              <input className="input" type="date" style={{ width: 150 }} value={to} onChange={(e) => setTo(e.target.value)} />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMuted, cursor: "pointer" }}>
                <input type="checkbox" checked={includeApiCalls} onChange={(e) => setIncludeApiCalls(e.target.checked)} style={{ accentColor: C.primary }} />
                Show raw API calls
              </label>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {loading ? (
              <div className="pulse" style={{ padding: 50, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading logs…</div>
            ) : logs.length === 0 ? (
              <div style={{ padding: 50, textAlign: "center", color: C.textMuted }}>No logs match these filters.</div>
            ) : (
              <div className="scroll-x">
                <table className="table">
                  <thead>
                    <tr><th>Action</th><th>User</th><th>Role</th><th>Details</th><th>Endpoint</th><th>When</th></tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const meta = getAuditMeta(log.action_type);
                      return (
                        <tr key={log.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ background: `${meta.color}22`, color: meta.color, borderRadius: 7, padding: 6, display: "flex" }}>
                                <Icon name={meta.icon} size={13} />
                              </div>
                              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{meta.label}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 12.5, fontWeight: 600 }}>{log.user_name || "System"}</td>
                          <td>
                            {log.user_role && <span className="badge badge-blue" style={{ fontSize: 10 }}>{log.user_role}</span>}
                          </td>
                          <td style={{ fontSize: 11.5, color: C.textMuted, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.details ? JSON.stringify(log.details) : ""}>
                            {log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ") : "—"}
                          </td>
                          <td style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>
                            {log.method ? `${log.method} ` : ""}{log.endpoint || "—"}
                            {log.status_code && <span style={{ marginLeft: 6, color: log.status_code >= 400 ? C.red : C.green }}>[{log.status_code}]</span>}
                          </td>
                          <td style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap" }}>{new Date(log.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {pagination.pages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: `1px solid ${C.border}33` }}>
                <div style={{ fontSize: 12, color: C.textMuted }}>Page {pagination.page} of {pagination.pages} · {pagination.total} total logs</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                  <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={cleanupModal} onClose={() => setCleanupModal(false)} title="Clean Up Old Logs" width={440}>
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 18, lineHeight: 1.6 }}>
            This permanently deletes audit log entries older than the selected period, freeing up database space.
            This cannot be undone.
          </div>
          <FormRow label="Delete logs older than">
            <select className="select" value={cleanupMonths} onChange={(e) => setCleanupMonths(Number(e.target.value))}>
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
            </select>
          </FormRow>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 10 }}>
            <button className="btn btn-ghost" onClick={() => setCleanupModal(false)} disabled={cleaning}>Cancel</button>
            <button className="btn btn-danger" onClick={handleCleanup} disabled={cleaning} style={{ minWidth: 140 }}>{cleaning ? "Deleting…" : "Delete Old Logs"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
