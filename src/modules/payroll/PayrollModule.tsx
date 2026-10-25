// FILE: teacher-app/src/modules/payroll/PayrollModule.tsx
// Source: admin App.tsx -> PayrollModule [16034-16218]
// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { useDialog } from "../../contexts/DialogContext";
import { useSession } from "../../contexts/SessionContext";
import { PayrollGenerateTab } from "./PayrollGenerateTab";
import { PayslipLibraryTab } from "./PayslipLibraryTab";
import { PayslipViewModal } from "./PayslipViewModal";
import { StaffPayrollSetupModal } from "./StaffPayrollSetupModal";
import { addMonths, currentMonthYear, inr, monthLabel, monthRange } from "./helpers";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// MAIN MODULE
// ═══════════════════════════════════════════════════════════════
export const PayrollModule = ({ school }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [tab, setTab] = useState("overview"); // overview | staff | generate | payslips

  const [staffList, setStaffList] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [allPayslips, setAllPayslips] = useState([]);
  const [loading, setLoading] = useState(true);

  const [setupStaff, setSetupStaff] = useState(null);
  const [viewSlipId, setViewSlipId] = useState(null);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const [s, lt, ps] = await Promise.all([
        apiRequest("/payroll/staff"),
        apiRequest("/payroll/leave-types"),
        apiRequest("/payroll/payslips"),
      ]);
      setStaffList(s?.data || []);
      setLeaveTypes(lt?.data || []);
      setAllPayslips(ps?.data || []);
    } catch (e) {
      dialogAlert("Failed to load payroll data: " + e.message, "Sync Error");
    } finally {
      setLoading(false);
    }
  }, [dialogAlert]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Overview KPIs & charts (derived entirely from already-saved payslips) ──
  // [teacher-app] Overview month filter. Payroll is processed for the PREVIOUS month, so the old "current month only" view was always empty.
  // Months come from the academic session selected in the top nav; default = previous month. Data is still the same
  // /payroll/payslips list (filtered here), so no backend change and the same "YYYY-MM" month format as before.
  const { currentYear } = useSession();
  const [ovMonth, setOvMonth] = useState("");
  const thisCalendarMY = currentMonthYear();
  const prevCalendarMY = addMonths(thisCalendarMY, -1);
  const monthsWithData = useMemo(() => new Set(allPayslips.map((p) => p.month_year)), [allPayslips]);
  const monthOptions = useMemo(() => {
    const s = currentYear?.start_date ? String(currentYear.start_date).slice(0, 7) : "";
    const e = currentYear?.end_date ? String(currentYear.end_date).slice(0, 7) : "";
    let list;
    if (s && e) {
      const upTo = e < thisCalendarMY ? e : thisCalendarMY; // no future months
      list = s <= upTo ? monthRange(s, upTo) : [s];
    } else {
      list = Array.from(monthsWithData).sort(); // session dates unknown -> months that have payslips
      if (list.length === 0) list = [prevCalendarMY];
    }
    return list.slice().reverse(); // latest first
  }, [currentYear, monthsWithData, thisCalendarMY, prevCalendarMY]);
  const defaultMY = monthOptions.includes(prevCalendarMY) ? prevCalendarMY : (monthOptions.find((m) => monthsWithData.has(m)) || monthOptions[0]);
  const currentMY = monthOptions.includes(ovMonth) ? ovMonth : defaultMY; // selected overview month
  const thisMonthSlips = allPayslips.filter((p) => p.month_year === currentMY);
  const overview = useMemo(() => {
    const totalPayout = thisMonthSlips.reduce((s, p) => s + Number(p.net_pay), 0);
    const pendingPayout = thisMonthSlips.filter((p) => p.payment_status === "PENDING").reduce((s, p) => s + Number(p.net_pay), 0);
    const paidCount = thisMonthSlips.filter((p) => p.payment_status === "PAID").length;
    const staffSetupPending = staffList.filter((s) => !s.has_salary_structure).length;

    const byDept = {};
    thisMonthSlips.forEach((p) => {
      const dept = p.department || "Unassigned";
      byDept[dept] = (byDept[dept] || 0) + Number(p.net_pay);
    });
    const deptChart = Object.entries(byDept).map(([name, value]) => ({ name, value }));

    const trendMap = {};
    allPayslips.filter((p) => p.month_year <= currentMY).forEach((p) => { // trend = 6 months ending at the selected month
      trendMap[p.month_year] = (trendMap[p.month_year] || 0) + Number(p.net_pay);
    });
    const trend = Object.entries(trendMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
      .map(([my, val]) => ({ month: monthLabel(my).split(" ")[0], amount: Math.round(val) }));

    return { totalPayout, pendingPayout, paidCount, totalStaffThisMonth: thisMonthSlips.length, staffSetupPending, deptChart, trend };
  }, [thisMonthSlips, allPayslips, staffList, currentMY]);

  const PIE_COLORS = [C.primary, C.blue, C.green, C.yellow, C.red, "#8b5cf6"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>Payroll</h1>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Attendance-linked salary engine — computed live, audited, and paid.</p>
        </div>
        <div style={{ display: "flex", gap: 8, background: C.surfaceAlt, padding: 4, borderRadius: 12, border: `1px solid ${C.border}` }}>
          {[{ id: "overview", label: "Overview", icon: "chart" }, { id: "staff", label: "Staff Setup", icon: "users" }, { id: "generate", label: "Generate", icon: "plus" }, { id: "payslips", label: "Payslips", icon: "file" }].map((t) => (
            <button key={t.id} className="btn" onClick={() => setTab(t.id)}
              style={{ padding: "8px 14px", fontSize: 12.5, fontWeight: 700, borderRadius: 9, background: tab === t.id ? C.surface : "transparent", color: tab === t.id ? C.primary : C.textMuted, boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="slide-in">
          {/* [teacher-app] month filter (months of the session selected in the top nav) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: C.textMuted }}>Month</span>
            <select className="select" style={{ maxWidth: 220 }} value={currentMY} onChange={(e) => setOvMonth(e.target.value)}>
              {monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            {currentYear && <span className="badge badge-blue">Session {currentYear.name}</span>}
            {thisMonthSlips.length === 0 && (
              <span style={{ fontSize: 12.5, color: C.textMuted }}>No payslips generated for {monthLabel(currentMY)} yet — use the Generate tab.</span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <KpiCard label={`Payroll Cost — ${monthLabel(currentMY)}`} value={inr(overview.totalPayout)} icon="wallet" color={C.primary} />
            <KpiCard label="Pending Disbursal" value={inr(overview.pendingPayout)} icon="clock" color={C.red} />
            <KpiCard label="Paid Payslips" value={overview.paidCount} sub={`of ${overview.totalStaffThisMonth} slips`} icon="check" color={C.green} />
            <KpiCard label="Setup Pending" value={overview.staffSetupPending} sub="staff without salary structure" icon="alert" color={C.yellow} />
          </div>

          {/* [teacher-app] was grid-2 (stacks only below 768px screen width) -> grid-auto-2 stacks whenever the panel width is too small, incl. tablet / landscape with the sidebar open */}
          <div className="grid-auto-2">
            <div className="card" style={{ padding: 20, minWidth: 0 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Payroll Cost Trend (Last 6 Months)</h4>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={overview.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => inr(v)} />
                  <Line type="monotone" dataKey="amount" stroke={C.primary} strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: 20, minWidth: 0 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Cost by Department — {monthLabel(currentMY)}</h4>
              {overview.deptChart.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>No payroll generated for this month yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={overview.deptChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                      {overview.deptChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => inr(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "staff" && (
        <div className="slide-in">
          {loading ? <div className="card pulse" style={{ padding: 40, textAlign: "center" }}>Loading staff...</div> : (
            <div className="card" style={{ padding: 0, overflowX: "auto", minWidth: 0 }}>
              <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.surfaceAlt, textAlign: "left" }}>
                    {["Staff", "Designation", "Gross Salary", "Bank", "Status", ""].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((s) => {
                    const gross = (s.basic || 0) + (s.hra || 0) + (s.da || 0) + (s.special_allowance || 0) + (s.other_allowance || 0);
                    return (
                      <tr key={s.staff_id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 16px", fontWeight: 700 }}>{s.full_name}</td>
                        <td style={{ padding: "12px 16px", color: C.textMuted }}>{s.designation || "—"}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 700 }}>{s.has_salary_structure ? inr(gross) : "—"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          {s.has_bank_details ? <span style={{ color: C.green, fontWeight: 700, fontSize: 12 }}>✓ Linked</span> : <span style={{ color: C.red, fontWeight: 700, fontSize: 12 }}>Missing</span>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {s.has_salary_structure && s.has_bank_details ? (
                            <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: `${C.green}15`, color: C.green }}>Ready for Payroll</span>
                          ) : (
                            <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: `${C.yellow}15`, color: C.yellow }}>Incomplete</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setSetupStaff(s)}>
                            <Icon name="edit" size={13} /> Setup
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "generate" && (
        <PayrollGenerateTab
          staffList={staffList}
          leaveTypes={leaveTypes}
          onSaved={loadAll}
        />
      )}

      {tab === "payslips" && (
        <PayslipLibraryTab
          payslips={allPayslips}
          onViewSlip={setViewSlipId}
          onRefresh={loadAll}
        />
      )}

      <StaffPayrollSetupModal staff={setupStaff} open={!!setupStaff} onClose={() => setSetupStaff(null)} onSaved={loadAll} />
      <PayslipViewModal slipId={viewSlipId} open={!!viewSlipId} onClose={() => setViewSlipId(null)} school={school} />
    </div>
  );
};
