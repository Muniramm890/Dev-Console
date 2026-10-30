// FILE: teacher-app/src/layout/SchoolERP.tsx
// Source: admin App.tsx -> SchoolERP [23356-23689]
// @ts-nocheck
import { Suspense, lazy, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { Sidebar } from "../components/layout/Sidebar";
import { NAV_ITEMS } from "../components/layout/navItems";
import { canAccess } from "../utils/access";
import { NoModulesAssigned } from "../components/ui/NoModulesAssigned";
import { NotificationModal } from "../components/modals/NotificationModal";
import { ProfileModal } from "../components/modals/ProfileModal";
import { Icon } from "../components/ui/Icon";
import { useAuth } from "../contexts/AuthContext";
import { useSession } from "../contexts/SessionContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useIsMobile } from "../hooks/useIsMobile";
import { setNativeTheme, registerPush } from "../native";
const ArrangementModule = lazy(() => import("../modules/arrangement/ArrangementModule").then((m) => ({ default: m.ArrangementModule })));
const AttendanceModule = lazy(() => import("../modules/attendance/AttendanceModule").then((m) => ({ default: m.AttendanceModule })));
const CalendarModule = lazy(() => import("../modules/calendar/CalendarModule").then((m) => ({ default: m.CalendarModule })));
const AuditLogModule = lazy(() => import("../modules/auditlogs/AuditLogModule").then((m) => ({ default: m.AuditLogModule })));
const CommHubModule = lazy(() => import("../modules/commhub/CommHubModule").then((m) => ({ default: m.CommHubModule })));
import { DashboardModule } from "../modules/dashboard/DashboardModule";
const ExamManagementModule = lazy(() => import("../modules/exams/ExamManagementModule").then((m) => ({ default: m.ExamManagementModule })));
const FeesModule = lazy(() => import("../modules/fees/FeesModule").then((m) => ({ default: m.FeesModule })));
const HomeworkModule = lazy(() => import("../modules/homework/HomeworkModule").then((m) => ({ default: m.HomeworkModule })));
const PayrollModule = lazy(() => import("../modules/payroll/PayrollModule").then((m) => ({ default: m.PayrollModule })));
const PromotionModule = lazy(() => import("../modules/promotion/PromotionModule").then((m) => ({ default: m.PromotionModule })));
const ResultsModule = lazy(() => import("../modules/results/ResultsModule").then((m) => ({ default: m.ResultsModule })));
const SetupModule = lazy(() => import("../modules/setup/SetupModule").then((m) => ({ default: m.SetupModule })));
const StudentsModule = lazy(() => import("../modules/students/StudentsModule").then((m) => ({ default: m.StudentsModule })));
const TeachersModule = lazy(() => import("../modules/teachers/TeachersModule").then((m) => ({ default: m.TeachersModule })));
const TestsModule = lazy(() => import("../modules/tests/TestsModule").then((m) => ({ default: m.TestsModule })));
const TimetableModule = lazy(() => import("../modules/timetable/TimetableModule").then((m) => ({ default: m.TimetableModule })));
const TransportModule = lazy(() => import("../modules/transport/TransportModule").then((m) => ({ default: m.TransportModule })));
const UserManagementModule = lazy(() => import("../modules/usermanagement/UserManagementModule").then((m) => ({ default: m.UserManagementModule })));
import { C, SCHOOL_CONFIG, applyTheme, getSavedTheme, injectStyles } from "../theme/theme";

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════





export const SchoolERP = () => {
  const { user, logout } = useAuth();
  const { academicYears, academicYearId, setAcademicYearId, sessionLoading } = useSession();
  // [teacher-app] was: const [activeModule, setActiveModule] = useState("dashboard");
  // Ab active module URL se aata hai (/students, /fees ...), taaki browser link/back/refresh kaam kare.
  const navigate = useNavigate();
  const location = useLocation();
  const PATH_BY_ID = { TransportModule: "transport" };
  const ID_BY_PATH = { transport: "TransportModule" };
  const pathSeg = location.pathname.replace(/^\//, "").split("/")[0];
  const activeModule = ID_BY_PATH[pathSeg] || pathSeg || "dashboard";
  const setActiveModule = (id) => navigate("/" + (PATH_BY_ID[id] || id));
  // [teacher-app] module-wise access: sirf assigned modules (school_admin ko sab). Backend moduleGate asli enforcement karta hai.
  const isAllowed = (id) => canAccess(user, id);
  const allowedIds = NAV_ITEMS.flatMap((g) => g.items).map((i) => i.id).filter(isAllowed);
  const firstAllowed = allowedIds[0];
  const moduleAllowed = isAllowed(activeModule);
  useEffect(() => {
    // Allowed nahi hai (URL se direct khola / pehla page assign nahi) -> pehle allowed module par redirect
    if (!moduleAllowed && firstAllowed) navigate("/" + (PATH_BY_ID[firstAllowed] || firstAllowed), { replace: true });
  }, [moduleAllowed, firstAllowed, pathSeg]); // eslint-disable-line
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const [school, setSchool] = useState(SCHOOL_CONFIG);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [openRequest, setOpenRequest] = useState(null);

  // push: token register (app me hi) + notification tap -> us chat ko kholo
  useEffect(() => { registerPush(apiRequest); }, []); // eslint-disable-line
  useEffect(() => {
    const h = (e) => {
      const d = e.detail || {};
      if (!d.messageId) return;
      setOpenRequest(d.side === "sender" && d.recipientId
        ? { type: "thread", messageId: d.messageId, recipientId: d.recipientId }
        : { type: "announcement", messageId: d.messageId });
      setShowNotifModal(true);
    };
    window.addEventListener("open-chat", h);
    return () => window.removeEventListener("open-chat", h);
  }, []);
  const [unreadCount, setUnreadCount] = useState(0);
  const [themeMode, setThemeMode] = useState(getSavedTheme());

  const toggleTheme = () => {
    const next = themeMode === "dark" ? "light" : "dark";
    applyTheme(next);     // C object mutate hota hai
    setNativeTheme(next); // app me status bar icons (web par no-op)
    setThemeMode(next);   // ye re-render trigger karta hai → saare children naye C values utha lete hain
  };

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await apiRequest("/inbox/unread-count");
        setUnreadCount(res?.data?.count || 0);
      } catch (e) { /* silent */ }
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 30000); // 30s poll
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest("/setup/school");
        const d = res?.data;
        if (d) {
          setSchool((prev) => ({
            ...prev,
            name: d.name || prev.name,
            tagline: d.tagline || prev.tagline,
            address:
              [d.address_line1, d.city, d.state].filter(Boolean).join(", ") ||
              prev.address,
            phone: d.phone || prev.phone,
            email: d.email || prev.email,
            logo_url: d.logo_url || prev.logo_url,
            watermark_url: d.watermark_url || prev.watermark_url,
            address_line1: d.address_line1 || prev.address_line1,
            city: d.city || prev.city,
            state: d.state || prev.state,
            pincode: d.pincode || prev.pincode,
            website: d.website || prev.website,
          }));
        }
      } catch (e) {
        console.error("Failed to load school info", e);
      }
    })();
  }, []);

  const renderModule = () => {
    if (!moduleAllowed) return firstAllowed ? null : <NoModulesAssigned />;
    switch (activeModule) {
      case "dashboard":
        return <DashboardModule school={school} />;
      case "setup":
        return (
          <SetupModule
            school={school}
            onUpdateSchool={(s) => {
              setSchool(s);
            }}
          />
        );
      case "students":
        return <StudentsModule />;
      case "teachers":
        return <TeachersModule />;
      case "promotion":
        return <PromotionModule />;
      case "TransportModule":
        return <TransportModule/>;
      case "commhub":
          return <CommHubModule />;
      case "attendance":
        return <AttendanceModule />;
      case "calendar":
        return <CalendarModule />;
      case "arrangement":
          return <ArrangementModule school={school} />;
      case "exams":
        return <ExamManagementModule />;
        case "fees":
          return <FeesModule school={school} />;
        case "payroll":
            return <PayrollModule school={school} />;
        case "results":
          return <ResultsModule school={school} />;
      case "timetable":
        return <TimetableModule />;
      case "tests":
          return <TestsModule school={school} />;
      case "homework":
          return <HomeworkModule school={school} />;
      case "usermanagement":
            return <UserManagementModule />;
          case "auditlogs":
            return <AuditLogModule />;
      default:
        return <DashboardModule school={school} />;
    }
  };

  const handleNav = (id) => {
    setActiveModule(id);
    setMobileSidebarOpen(false);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'DM Sans',sans-serif",
        background: C.bg,
      }}
    >
      {/* Desktop Sidebar */}
      <div className="sidebar-desktop" style={{ flexShrink: 0 }}>
        <Sidebar
          active={activeModule}
          onNav={handleNav}
          collapsed={sidebarCollapsed}
          school={school}
          userRole={user?.role}
          isAllowed={isAllowed}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}
        >
          <div
            data-native-back
            style={{ background: "#00000077", flex: 1 }}
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div
            style={{
              width: 240,
              background: C.surface,
              height: "100%",
              overflowY: "auto",
            }}
          >
            <Sidebar
              active={activeModule}
              onNav={handleNav}
              collapsed={false}
              school={school}
              userRole={user?.role}
          isAllowed={isAllowed}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Topbar */}
        <div className="topbar">
          <button
            className="mobile-menu-btn btn btn-ghost"
            style={{ padding: "7px 9px" }}
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Icon name="menu" size={18} />
          </button>
          <button
            className="hide-mobile btn btn-ghost"
            style={{ padding: "7px 9px" }}
            onClick={() => setSidebarCollapsed((p) => !p)}
          >
            <Icon name="menu" size={18} />
          </button>
          <div className="topbar-title">
            <div
              className="syne"
              style={{ fontSize: 14, fontWeight: 700, color: C.text }}
            >
              {NAV_ITEMS.flatMap((g) => g.items).find(
                (i) => i.id === activeModule
              )?.label || "Dashboard"}
            </div>
          </div>
          <div className="topbar-right">
            {!sessionLoading && academicYears.length > 0 && (
              <select
                className="select topbar-session"
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                title="Academic Session"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                    {y.is_current ? (isMobile ? " ✓" : " (Current)") : ""}
                  </option>
                ))}
              </select>
            )}
            <div style={{ position: "relative" }}>
              <button
                className="btn btn-ghost"
                style={{ padding: "7px 9px", position: "relative" }}
                onClick={() => setShowNotifModal(true)}
              >
                <Icon name="bell" size={17} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 5,
                      right: 5,
                      width: 7,
                      height: 7,
                      background: C.red,
                      borderRadius: "50%",
                    }}
                  />
                )}
              </button>
            </div>
            <div
              onClick={() => setShowProfileModal(true)}
              title="View / Edit Profile"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                background: C.surfaceAlt,
                borderRadius: "50%",
                padding: 3,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.border)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.surfaceAlt)}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: C.primary,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {(user?.name || "U").trim().charAt(0).toUpperCase()}
                </div>
              )}
              {/* [teacher-app] name + role text hataya: sirf profile circle; click par ProfileModal me full detail */}
            </div>
            <button
              className="btn btn-ghost topbar-desktop-only"
              onClick={toggleTheme}
              title="Toggle theme"
              style={{ padding: "7px 9px", fontSize: 15 }}
            >
              {themeMode === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              className="btn btn-danger topbar-desktop-only"
              onClick={logout}
              title="Logout"
              style={{ padding: "7px 9px", marginLeft: 4 }}
            >
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>

         {/* Module Area */}
         <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <ErrorBoundary label={activeModule} resetKeys={[activeModule, academicYearId]}>
            <Suspense fallback={<div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontSize: 13, fontWeight: 600 }}>Loading…</div>}>
              {renderModule()}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onLogout={logout}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />
      <NotificationModal open={showNotifModal} onClose={() => { setShowNotifModal(false); setOpenRequest(null); }} onUnreadChange={setUnreadCount} openRequest={openRequest} />
    </div>
  );
};
