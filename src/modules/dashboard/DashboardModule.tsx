// FILE: teacher-app/src/modules/dashboard/DashboardModule.tsx
// Source: admin App.tsx -> DashboardModule [1944-2584]
// @ts-nocheck
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { Avatar } from "../../components/ui/Avatar";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { useData } from "../../contexts/DataContext";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import { ACTIVITY_META } from "./helpers";
import { C } from "../../theme/theme";
import { timeAgo } from "../../utils/date";

  // ═══════════════════════════════════════════════════════════════
  // MODULE: DASHBOARD
  // ═══════════════════════════════════════════════════════════════
export const DashboardModule = ({ school }) => {
  const { students: STUDENTS, teachers: TEACHERS, error: dataError } = useData(); // 🔴 Override mock data with real data
  const [grades, setGrades] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [staffAttendance, setStaffAttendance] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const activityScrollRef = useAutoScroll(recentActivity);
  const [feeOverview, setFeeOverview] = useState(null);
  const [feeLoading, setFeeLoading] = useState(true);

  // 🔴 Real class-wise student counts (backend already computes student_count per grade)
  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest("/setup/grades");
        setGrades(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error("Failed to load grades for dashboard", e);
      }
    })();
  }, []);

  useEffect(() => {
         (async () => {
           setActivityLoading(true);
           try {
             const res = await apiRequest("/audit/recent-activity");
             setRecentActivity(Array.isArray(res?.data) ? res.data : []);
           } catch (e) {
             console.error("Failed to load recent activity", e);
             setRecentActivity([]);
           } finally {
             setActivityLoading(false);
           }
         })();
       }, []);

     useEffect(() => {
        (async () => {
          setStaffLoading(true);
          try {
            const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
            const res = await apiRequest(`/attendance/staff/roster?date=${today}`);
            // Backend teachers ki list aur unka status (P, A, L, OD) return karta hai
            setStaffAttendance(res?.data?.teachers || []);
          } catch (e) {
            console.error("Failed to load staff attendance", e);
            setStaffAttendance([]);
          } finally {
            setStaffLoading(false);
          }
        })();
      }, []);


      
    
      useEffect(() => {
        (async () => {
          setFeeLoading(true);
          try {
            const res = await apiRequest("/fees/overview", "GET");
            setFeeOverview(res?.data || null);
          } catch (e) {
            console.error("Failed to load fee overview for dashboard", e);
            setFeeOverview(null);
          } finally {
            setFeeLoading(false);
          }
        })();
      }, []);

      // 🔴 Real KPI trends (vs last month) — replaces hardcoded 3.2 / 0 / 5.8 / -2.1
      const [kpiTrends, setKpiTrends] = useState(null);
      useEffect(() => {
        (async () => {
          try {
            const res = await apiRequest("/dashboard/kpi-trends");
            setKpiTrends(res?.data || null);
          } catch (e) {
            console.error("Failed to load KPI trends", e);
            setKpiTrends(null);
          }
        })();
      }, []);

      // [teacher-app] Real Quick Stats (/dashboard/quick-stats) — was hardcoded "87.3%" + mock CLASSES/SECTIONS/CLASS_SUBJECTS
      const [quickStats, setQuickStats] = useState(null);
      useEffect(() => {
        (async () => {
          try {
            const res = await apiRequest("/dashboard/quick-stats");
            setQuickStats(res?.data || null);
          } catch (e) {
            console.error("Failed to load quick stats", e);
            setQuickStats(null);
          }
        })();
      }, []);

      // 🔴 Real 7-day attendance trend (replaces Math.random())
      const [realAttendanceTrend, setRealAttendanceTrend] = useState([]);
      useEffect(() => {
        (async () => {
          try {
            const res = await apiRequest("/dashboard/summary");
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const mapped = (res?.data?.attendanceTrend || []).map((d) => ({
              day: days[new Date(d.date).getDay()],
              rate: d.rate,
            }));
            setRealAttendanceTrend(mapped);
          } catch (e) {
            console.error("Failed to load attendance trend", e);
            setRealAttendanceTrend([]);
          }
        })();
      }, []);


  const totalStudents = STUDENTS.length;
  const totalTeachers = staffAttendance.length || TEACHERS.length;
  const presentToday = staffAttendance.filter((t) => t.status === "P" || t.status === "OD").length;
  const totalFeeCollected = (feeOverview?.summary?.total_paid_paise || 0) / 100;
  const totalFeePending = (feeOverview?.summary?.total_pending_paise || 0) / 100;

  // 🔴 Real class-wise enrollment — replaces mock CLASSES + STUDENTS.filter loop
  const classStrength = grades.length
    ? grades.map((g) => ({
        name: g.name.replace("Class ", "C"),
        students: g.student_count || 0,
      }))
    : []; // [teacher-app] was: CLASSES.map(...) mock fallback — ab khali (grades load nahi hue / setup nahi hua)
      
      // fallback empty shape while grades are loading / not set up yet
      const feeByClass = (feeOverview?.byClass || []).slice(0, 8).map((c) => ({
        name: (c.class_name || "").replace("Class ", "C"),
        paid: (c.paid_paise || 0) / 100000,
        pending: (c.pending_paise || 0) / 100000,
      }));


      const attendanceTrend = realAttendanceTrend;

    const feeStatusDist = [
    { name: "Paid", value: feeOverview?.summary?.paid_count || 0 },
    { name: "Partial", value: feeOverview?.summary?.partial_count || 0 },
    { name: "Pending", value: feeOverview?.summary?.pending_count || 0 },
  ];

  return (
    <div className="slide-in">
      {/* [teacher-app] data load fail hone par dummy data ki jagah error dikhao */}
      {dataError && (
        <div
          style={{
            background: `${C.red}18`,
            border: `1px solid ${C.red}55`,
            color: C.red,
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          ⚠️ Could not load student/teacher data ({dataError}). Dashboard counts may be incomplete — please refresh the page.
        </div>
      )}
      <div
        style={{
          background: `linear-gradient(135deg,${C.surface},${C.surfaceAlt})`,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 24,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>
            Welcome back, Principal 👋
          </div>
          <h1
            className="syne"
            style={{ fontSize: 24, fontWeight: 800, color: C.text }}
          >
            {school.name}
          </h1>
          <div style={{ color: C.primary, fontSize: 13, marginTop: 4 }}>
            {school.address}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div
              className="syne"
              style={{ fontSize: 20, fontWeight: 800, color: C.primary }}
            >
              {new Date().toLocaleDateString("en-IN", { weekday: "long" })}
            </div>
            <div style={{ color: C.textMuted, fontSize: 12 }}>
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        className="grid-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KpiCard
          label="Total Students"
          value={totalStudents}
          sub={`Across ${quickStats?.total_classes ?? grades.length} classes`}
          icon="students"
          color={C.blue}
          trend={kpiTrends?.students}
        />
        <KpiCard
          label="Teaching Staff"
          value={totalTeachers}
          sub={`${presentToday} present today`}
          icon="teachers"
          color={C.green}
          trend={kpiTrends?.staff}
        />
        <KpiCard
          label="Fee Collected"
          value={`₹${(totalFeeCollected / 100000).toFixed(1)}L`}
          sub="This academic year"
          icon="fee"
          color={C.primary}
          trend={kpiTrends?.feeCollected}
        />
        <KpiCard
          label="Fee Pending"
          value={`₹${(totalFeePending / 100000).toFixed(1)}L`}
          sub={`${feeOverview?.summary?.pending_count || 0} students`}
          icon="warning"
          color={C.red}
          trend={kpiTrends?.feePending}
        />
      </div>

      <div
        className="grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div className="card">
          <h3
            className="syne"
            style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}
          >
            Class-wise Enrollment
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={classStrength} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis
                dataKey="name"
                tick={{ fill: C.textMuted, fontSize: 11 }}
              />
              <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.text,
                }}
              />
              <Bar dataKey="students" fill={C.primary} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3
            className="syne"
            style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}
          >
            Fee Status
          </h3>
          {feeLoading ? (
            <div
              className="pulse"
              style={{
                height: 180,
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
          ) : feeStatusDist.every((d) => d.value === 0) ? (
            <div
              style={{
                height: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.textMuted,
                fontSize: 12,
              }}
            >
              No fee data yet
            </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={feeStatusDist}
                            cx="50%"
                            cy="45%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {feeStatusDist.map((_, i) => (
                              <Cell key={i} fill={[C.green, C.yellow, C.red][i]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: C.surface,
                              border: `1px solid ${C.border}`,
                              borderRadius: 8,
                              color: C.text,
                            }}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: 8 }}
                            formatter={(v) => (
                              <span style={{ color: C.textMuted, fontSize: 12 }}>{v}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
          
        </div>
      </div>

      <div
        className="grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div className="card">
          <h3
            className="syne"
            style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}
          >
            Attendance Trend (This Week)
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={attendanceTrend}>
              <defs>
                <linearGradient id="atGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 11 }} />
              <YAxis
               domain={['dataMin - 5', 'dataMax + 5']}
                tick={{ fill: C.textMuted, fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.text,
                }}
                formatter={(v) => `${v}%`}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke={C.primary}
                fill="url(#atGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3
            className="syne"
            style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}
          >
            Fee Collection by Class (₹K)
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={feeByClass} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis
                dataKey="name"
                tick={{ fill: C.textMuted, fontSize: 10 }}
              />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} tickFormatter={(v) => `₹${v}K`} />
              <Tooltip
                contentStyle={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.text,
                }}
                formatter={(v) => `₹${v}K`}
              />
              <Bar
                dataKey="paid"
                fill={C.green}
                radius={[4, 4, 0, 0]}
                name="Paid"
              />
              <Bar
                dataKey="pending"
                fill={C.red}
                radius={[4, 4, 0, 0]}
                name="Pending"
              />
              <Legend
                formatter={(v) => (
                  <span style={{ color: C.textMuted, fontSize: 11 }}>{v}</span>
                )}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        className="grid-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,minmax(0,1fr))",
          gap: 20,
        }}
      >
        <div className="card" style={{ minWidth: 0 }}>
          <h3
            className="syne"
            style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, flexShrink: 0 }}
          >
            Absent Teachers Today
          </h3>
          <div style={{ maxHeight: 280, overflowY: "auto", overflowX: "auto", paddingRight: 4 }}>
            {staffLoading ? (
               <div className="pulse" style={{ color: C.primary, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                 Syncing attendance...
               </div>
            ) : (
               <>
                 {staffAttendance.filter((t) => t.status === "A" || t.status === "L").map((t) => (
                    <div
                      key={t.user_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: `1px solid ${C.border}22`,
                      }}
                    >
                      <div style={{ fontSize: 22 }}>
                        <Avatar teacher={t} size={32} /> 
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.full_name}</div>
                        <div style={{ fontSize: 11, color: C.red, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.department || "Teacher"}</div>
                      </div>
                      <span className={`badge ${t.status === 'L' ? 'badge-yellow' : 'badge-red'}`}>
                        {t.status === 'L' ? 'On Leave' : 'Absent'}
                      </span>
                    </div>
                  ))}
                  
                  {staffAttendance.filter((t) => t.status === "A" || t.status === "L").length === 0 && (
                    <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                      All teachers present ✓
                    </div>
                  )}
               </>
            )}
          </div>
        </div>
        <div className="card" style={{ minWidth: 0 }}>
          <h3
            className="syne"
            style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}
          >
            Quick Stats
          </h3>
          {[
            {
              label: "Avg Attendance",
              value:
                quickStats?.avg_attendance_last_month != null
                  ? `${quickStats.avg_attendance_last_month}%`
                  : "—",
              color: C.green,
            },
            {
              label: "Pending Fees",
              value: `₹${(totalFeePending / 100000).toFixed(1)}L`,
              color: C.red,
            },
            { label: "Classes Running", value: quickStats?.total_classes ?? "—", color: C.blue },
            {
              label: "Total Sections",
              value: quickStats?.total_sections ?? "—",
              color: C.purple,
            },
            {
              label: "Subjects Taught",
              value: quickStats?.total_subjects ?? "—",
              color: C.cyan,
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: `1px solid ${C.border}22`,
              }}
            >
              <span style={{ fontSize: 13, color: C.textMuted }}>
                {s.label}
              </span>
              <span
                className="syne"
                style={{ fontSize: 15, fontWeight: 700, color: s.color }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
        <div className="card" style={{ minWidth: 0 }}>
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          <h3
            className="syne"
            style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, flexShrink: 0 }}
          >
            Recent Activities
          </h3>
          <div ref={activityScrollRef} style={{ maxHeight: 280, overflowY: "auto", overflowX: "auto", paddingRight: 4, scrollbarWidth: "none", msOverflowStyle: "none" }} className="hide-scrollbar">
            <div style={{ minWidth: "max-content" }}> {/* Inner wrapper for seamless cloning */}
              {activityLoading ? (
                  <div className="pulse" style={{ color: C.primary, fontSize: 12, padding: "10px 0" }}>
                    Loading activity…
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div style={{ color: C.textMuted, fontSize: 12, padding: "10px 0" }}>
                    No recent activity yet.
                  </div>
                ) : (
                  recentActivity.slice(0, 10).map((a, i) => {
                    const meta = ACTIVITY_META[a.action_type] || { 
                      icon: "chart", 
                      color: C.textMuted, 
                      title: a.action_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 
                      desc: () => "System action" 
                    };
                    
                    let details = {};
                    try { details = a.details ? (typeof a.details === 'string' ? JSON.parse(a.details) : a.details) : {}; } catch (e) {}
                    
                    const userName = a.user_name || "System";
                    const titleStr = typeof meta.title === 'function' ? meta.title(details) : meta.title;
                    const descStr = meta.desc(details, userName);

                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "9px 0",
                          borderBottom: `1px solid ${C.border}22`,
                        }}
                      >
                        <div
                          style={{
                            background: `${meta.color}22`,
                            borderRadius: 8,
                            padding: 7,
                            color: meta.color,
                            flexShrink: 0,
                          }}
                        >
                          <Icon name={meta.icon} size={14} />
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <div
                              className="syne"
                              style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: C.text,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={titleStr}
                            >
                              {titleStr}
                            </div>
                            <div style={{ fontSize: 10.5, color: C.textMuted, whiteSpace: "nowrap", marginLeft: 8, fontWeight: 600 }}>
                              {timeAgo(a.created_at)}
                            </div>
                          </div>
                          <div 
                            style={{ 
                              fontSize: 11,
                              color: C.textMuted,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap", 
                            }}
                            title={descStr}
                          >
                            {descStr}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
