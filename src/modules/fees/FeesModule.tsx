// FILE: teacher-app/src/modules/fees/FeesModule.tsx
// Source: admin App.tsx -> FeesModule [15193-15666]
// @ts-nocheck
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { PdfViewerModal } from "../../components/ui/PdfViewerModal";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { CollectPaymentModal } from "./CollectPaymentModal";
import { FeeCollectionPage } from "./FeeCollectionPage";
import { FeeReceiptsTab } from "./FeeReceiptsTab";
import { FeeRegistersTab } from "./FeeRegistersTab";
import { FeeStructuresTab } from "./FeeStructuresTab";
import { StudentPassbookModal } from "./StudentPassbookModal";
import { CF_PENDING_PREFIX, rupees, verifyCashfreeWithRetry } from "./helpers";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// MODULE: FEE MANAGEMENT
// ═══════════════════════════════════════════════════════════════
// Module-level (not a ref): the module can be mounted more than once while the app boots, but each Cashfree return must be verified only once.
const handledCashfreeReturns = new Set();

export const FeesModule = ({ school }) => {
  const { search: locQs } = useLocation();
  const qp = new URLSearchParams(locQs);
  const [tab, setTab] = useState(() => (["overview", "ledger", "receipts", "structures", "collection", "registers"].includes(qp.get("tab")) ? qp.get("tab") : "overview"));
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState(() => (["paid", "pending", "partial"].includes(qp.get("status")) ? qp.get("status") : ""));
  const [passbookStudentId, setPassbookStudentId] = useState(null);
  const [collectAccount, setCollectAccount] = useState(null);

  const [feeAccounts, setFeeAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [grades, setGrades] = useState([]);

  const loadFeeOverview = async () => {
    setOverviewLoading(true);
    try {
      const res = await apiRequest("/fees/overview", "GET");
      if (res?.data) setOverviewData(res.data);
    } catch (err) {
      console.error("Failed to load fee overview", err);
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadFeeAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const params = new URLSearchParams();
      if (filterClass) params.set("grade_id", filterClass);
      if (filterStatus) params.set("status", filterStatus);
      const res = await apiRequest(`/fees/accounts?limit=200&${params.toString()}`, "GET");
      if (res?.data) setFeeAccounts(res.data);
    } catch (err) { console.error("Failed to load fee accounts", err); }
    finally { setLoadingAccounts(false); }
  };

  useEffect(() => {
    apiRequest("/setup/grades").then((r) => setGrades(r?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "overview") loadFeeOverview();
    if (tab === "ledger") loadFeeAccounts();
  }, [tab, filterClass, filterStatus]); // eslint-disable-line

  const refreshAll = () => { loadFeeOverview(); loadFeeAccounts(); };

  // ── Cashfree return page: /fees/cashfree-return?order_id=... ─────────────────────────────────────────
  // Cashfree sends the browser here after redirect-style payments (UPI app, 3-D Secure, popup blocked).
  // The in-page verify never ran in that case, so verify here (the backend is idempotent: no double recording).
  const location = useLocation();
  const navigate = useNavigate();
  const { dialogAlert } = useDialog();
  const returnOrderId = location.pathname.endsWith("/cashfree-return")
    ? new URLSearchParams(location.search).get("order_id") : null;
  useEffect(() => {
    if (!returnOrderId || handledCashfreeReturns.has(returnOrderId)) return;
    handledCashfreeReturns.add(returnOrderId);
    (async () => {
      let ctx = {};
      try { ctx = JSON.parse(localStorage.getItem(CF_PENDING_PREFIX + returnOrderId) || "{}"); } catch (_) {}
      try {
        await verifyCashfreeWithRetry({
          cf_order_id: returnOrderId,
          student_id: ctx.student_id, // optional: the backend takes it from the Cashfree order if missing
          amount_paise: ctx.amount_paise,
          remarks: ctx.remarks || null,
          breakdown: ctx.breakdown,
        });
        try { localStorage.removeItem(CF_PENDING_PREFIX + returnOrderId); } catch (_) {}
        await dialogAlert("Payment verified and recorded.", "Payment successful");
      } catch (e) {
        await dialogAlert(
          "We could not confirm this payment: " + (e.message || "unknown error").replace(/\.+$/, "") +
          ". If money was deducted, check the Receipts tab in a minute before collecting again.",
          "Payment not confirmed"
        );
      }
      navigate("/fees", { replace: true });
      refreshAll();
    })();
  }, [returnOrderId]); // eslint-disable-line

  const monthlyData = (overviewData?.weekly || []).map((w) => ({
    month: `Wk ${new Date(w.week_start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
    collected: w.collected_paise / 100,
  }));

  return (
    <div className="slide-in">
      <SectionHeader
        title="Fee Management"
        sub="Track collections, pending dues and payment history"
      />
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 16 }}>
        {[
          { id: "overview", label: "Overview", icon: "chart" },
          { id: "ledger", label: "Fee Ledger & Collect", icon: "students" },
          { id: "receipts", label: "Transactions & Receipts", icon: "result" },
          { id: "registers", label: "Registers", icon: "file" },
          { id: "structures", label: "Fee Structures", icon: "setup" },
        ].map((t) => (
          <button
            key={t.id}
            className="btn"
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? C.primary : C.surfaceAlt,
              color: tab === t.id ? "#fff" : C.text,
              border: "none", display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: 12.5,
            }}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          {overviewData?.recentPayers?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                💰 Recent Fee Payers
              </div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
                {overviewData.recentPayers.map((p) => {
                  const isToday = new Date(p.payment_date).toDateString() === new Date().toDateString();
                  return (
                    <div key={p.student_id + p.payment_date} style={{
                      minWidth: 190, background: `linear-gradient(135deg,${C.surfaceAlt},${C.surface})`,
                      border: `1px solid ${isToday ? C.green + "55" : C.border}`, borderRadius: 14,
                      padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
                      position: "relative", overflow: "hidden",
                    }}>
                      {isToday && (
                        <span style={{
                          position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%",
                          background: C.green, boxShadow: `0 0 0 3px ${C.green}22`,
                        }} className="pulse" />
                      )}
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.green}55` }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${C.green}22`, color: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>
                          {(p.student_name?.[0] || "?").toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.student_name}</div>
                        <div style={{ fontSize: 10.5, color: C.textMuted }}>{p.class_name} {p.section_name}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                          <span className="syne" style={{ fontWeight: 800, fontSize: 13, color: C.green }}>{rupees(p.amount_paise)}</span>
                          <span style={{ fontSize: 9.5, color: isToday ? C.green : C.textMuted, fontWeight: 700 }}>
                            {isToday ? "Today" : new Date(p.payment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}
            className="grid-4"
          >
            <KpiCard
              label="Total Collected"
              value={`₹${((overviewData?.summary?.total_paid_paise || 0) / 10000000).toFixed(2)}L`}
              icon="fee"
              color={C.green}
            />
            <KpiCard
              label="Total Pending"
              value={`₹${((overviewData?.summary?.total_pending_paise || 0) / 10000000).toFixed(2)}L`}
              icon="warning"
              color={C.red}
            />
            <KpiCard
              label="Collection Rate"
              value={`${overviewData?.summary?.total_fee_paise > 0
                ? Math.round((overviewData.summary.total_paid_paise / overviewData.summary.total_fee_paise) * 100)
                : 0}%`}
              icon="chart"
              color={C.primary}
            />
            <KpiCard
              label="Defaulters"
              value={overviewData?.summary?.pending_count || 0}
              icon="students"
              color={C.yellow}
            />
          </div>

          {/* ROW 2: Collection Trend + Fee Status Donut */}
          <div
            className="grid-2"
            style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20, marginBottom: 20 }}
          >
            <div className="card">
              <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                Collection Trend (Last 10 Weeks)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="feeCollectGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.green} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="month" tick={{ fill: C.textMuted, fontSize: 11 }} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}
                    formatter={(v) => [`₹${v.toLocaleString()}`, "Collected"]}
                  />
                  <Area type="monotone" dataKey="collected" stroke={C.green} strokeWidth={2.5} fill="url(#feeCollectGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                Fee Status Distribution
              </h3>
              {overviewLoading ? (
                <div
                  className="pulse"
                  style={{
                    height: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.primary,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Loading fee status…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Paid", value: overviewData?.summary?.paid_count || 0 },
                        { name: "Partial", value: overviewData?.summary?.partial_count || 0 },
                        { name: "Pending", value: overviewData?.summary?.pending_count || 0 },
                      ]}
                      cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
                    >
                      {[C.green, C.yellow, C.red].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                    <Legend
                      wrapperStyle={{ paddingTop: 8 }}
                      formatter={(v) => <span style={{ color: C.textMuted, fontSize: 12 }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
                   {/* ROW 3: Collection vs Pending (60%) + Expected Yearly Revenue (40%) — both bar charts, grow together */}
                   <div
            className="grid-2"
            style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}
          >
            <div className="card">
              <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                Class-wise Collection vs Pending
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={(overviewData?.byClass || []).map((c) => ({
                    name: c.class_name,
                    paid: (c.paid_paise || 0) / 100000,
                    pending: (c.pending_paise || 0) / 100000,
                  }))}
                  barSize={14}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" tick={{ fill: C.textMuted, fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} tickFormatter={(v) => `₹${v}K`} />
                  <Tooltip
                    contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}
                    formatter={(v) => `₹${v}K`}
                  />
                  <Legend formatter={(v) => <span style={{ color: C.textMuted, fontSize: 11 }}>{v}</span>} />
                  <Bar dataKey="paid" fill={C.green} radius={[4, 4, 0, 0]} name="Collected" />
                  <Bar dataKey="pending" fill={C.red} radius={[4, 4, 0, 0]} name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: C.primary }}>
                Expected Yearly Revenue
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={(overviewData?.expectedByClass || []).map((c) => ({
                    name: c.class_name,
                    expected: (c.expected_yearly_paise || 0) / 100000,
                  }))}
                  barSize={14}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" tick={{ fill: C.textMuted, fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} tickFormatter={(v) => `₹${v}K`} />
                  <Tooltip
                    contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}
                    formatter={(v) => `₹${v}K`}
                  />
                  <Bar dataKey="expected" fill={C.primary} radius={[4, 4, 0, 0]} name="Expected" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ROW 4: Top Pending Classes — full-width responsive grid, independent height */}
          <div className="card" style={{ marginTop: 20 }}>
            <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: C.red }}>
              ⚠ Top Pending Classes
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {(overviewData?.byClass || [])
                .filter((c) => c.pending_paise > 0)
                .sort((a, b) => b.pending_paise - a.pending_paise)
                .map((c) => {
                  const total = Number(c.paid_paise || 0) + Number(c.pending_paise || 0);
                  const recoveryPct = total > 0 ? Math.round((c.paid_paise / total) * 100) : 0;
                  return (
                    <div key={c.class_name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{c.class_name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.red }}>{rupees(c.pending_paise)}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${recoveryPct}%`, background: recoveryPct > 70 ? C.green : recoveryPct > 40 ? C.yellow : C.red }} />
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{recoveryPct}% recovered</div>
                    </div>
                  );
                })}
            </div>
            {(overviewData?.byClass || []).filter((c) => c.pending_paise > 0).length === 0 && (
              <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", padding: "20px 0" }}>All classes fully paid ✓</div>
            )}
          </div>

          {/* ROW 5: Revenue Realization — headline insight banner */}
          {(() => {
            const totalExpected = (overviewData?.expectedByClass || []).reduce((sum, c) => sum + Number(c.expected_yearly_paise || 0), 0);
            const totalPaidAllTime = Number(overviewData?.summary?.total_paid_paise || 0);
            const realizationPct = totalExpected > 0 ? Math.round((totalPaidAllTime / totalExpected) * 100) : 0;
            const barColor = realizationPct > 70 ? C.green : realizationPct > 40 ? C.yellow : C.red;
            return (
              <div className="card" style={{ marginTop: 20, background: `linear-gradient(135deg, ${C.primary}11, ${C.primary}05)` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                      📊 Revenue Realization (This Year)
                    </h3>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      {rupees(totalPaidAllTime)} collected out of {rupees(totalExpected)} expected
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="syne" style={{ fontSize: 32, fontWeight: 800, color: barColor }}>
                      {realizationPct}%
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>of yearly target</div>
                  </div>
                </div>
                <div className="progress-bar" style={{ marginTop: 14, height: 8 }}>
                  <div className="progress-fill" style={{ width: `${realizationPct}%`, background: barColor }} />
                </div>
              </div>
            );
          })()}
        </div>
          
      )}

      {tab === "ledger" && (
        <div>
          <div className="card" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <select className="select" style={{ width: 160 }} value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select className="select" style={{ width: 130 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
            </select>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 12, color: C.textMuted }}>Showing {feeAccounts.length} accounts</div>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {loadingAccounts ? (
              <div className="pulse" style={{ padding: 60, textAlign: "center", color: C.primary }}>Loading fee ledger…</div>
            ) : (
              <div className="scroll-x">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student Info</th>
                      <th>Class & Roll</th>
                      <th style={{ textAlign: "right" }}>Total Fee</th>
                      <th style={{ textAlign: "right" }}>Paid</th>
                      <th style={{ textAlign: "right" }}>Due Balance</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                      <th style={{ textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeAccounts.length > 0 ? (
                      feeAccounts.map((acc) => (
                        <tr key={acc.student_id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              {acc.photo_url ? (
                                <img src={acc.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.border}` }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${C.primary}22`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                                  {(acc.student_name?.[0] || "?").toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{acc.student_name}</div>
                                <div style={{ fontSize: 11, color: C.textMuted }}>Adm: {acc.admission_no}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 13 }}>
                            <div style={{ fontWeight: 600 }}>{acc.class_name} {acc.section_name && `(${acc.section_name})`}</div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>Roll: {acc.roll_no || "—"}</div>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600, fontSize: 13 }}>{rupees(acc.total_fee_paise)}</td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: C.green, fontSize: 13 }}>{rupees(acc.paid_paise)}</td>
                          <td style={{ textAlign: "right" }}>
                            <span style={{ fontWeight: 800, color: acc.pending_paise > 0 ? C.red : C.text, fontSize: 14 }}>{rupees(acc.pending_paise)}</span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`badge ${acc.status === "paid" ? "badge-green" : acc.status === "partial" ? "badge-yellow" : "badge-red"}`}>
                              {(acc.status || "pending").toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                              <button className="btn btn-primary" onClick={() => setCollectAccount(acc)} style={{ padding: "6px 14px", fontSize: 11 }} disabled={acc.pending_paise <= 0}>
                                Collect
                              </button>
                              <button className="btn btn-ghost" onClick={() => setPassbookStudentId(acc.student_id)} style={{ padding: "6px 8px" }} title="View Passbook">
                                <Icon name="eye" size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: 40, textAlign: "center" }}>
                          <div style={{ color: C.textMuted, fontWeight: 600 }}>No fee accounts found</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔴 FIX 1: Passed the prop here */}
      {tab === "collection" && <FeeCollectionPage onBack={() => setTab("overview")} onOpenReceipts={() => setTab("receipts")} />}
      {tab === "receipts" && <FeeReceiptsTab />}
      {tab === "registers" && <FeeRegistersTab initialView={qp.get("view")} />}
      {tab === "structures" && <FeeStructuresTab />}

      <CollectPaymentModal
        account={collectAccount ? { ...collectAccount, school_name: school?.name } : null}
        onClose={() => setCollectAccount(null)}
        onSuccess={() => { setCollectAccount(null); refreshAll(); }}
      />
      <StudentPassbookModal
        studentId={passbookStudentId}
        onClose={() => setPassbookStudentId(null)}
        onVoided={refreshAll}
      />

    </div>
  );
};
