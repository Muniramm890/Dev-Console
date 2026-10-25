// FILE: teacher-app/src/modules/attendance/AttendanceModule.tsx
// Source: admin App.tsx -> AttendanceModule [11594-11723]
// @ts-nocheck
import { useEffect, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StaffAnalysisTab } from "./StaffAnalysisTab";
import { StaffIndividualTab } from "./StaffIndividualTab";
import { StaffMarkTab } from "./StaffMarkTab";
import { StudentClassAnalysisTab } from "./StudentClassAnalysisTab";
import { StudentIndividualTab } from "./StudentIndividualTab";
import { StudentMarkTab } from "./StudentMarkTab";
import { StudentSchoolOverviewTab } from "./StudentSchoolOverviewTab";
import { C } from "../../theme/theme";

export const AttendanceModule = () => {
  // ── Top-level switch ──
  const [mode, setMode] = useState("students"); // 'students' | 'teachers'
  const [tab, setTab] = useState("overview"); // 'overview' is default; 'mark' stays hidden until opened

  useEffect(() => {
    setTab("overview");
  }, [mode]);

  const TABS = {
    students: [
      { id: "overview", label: "Student Overview" },
      { id: "class", label: "Class Analysis" },
      { id: "individual", label: "Individual Student" },
    ],
    teachers: [
      { id: "overview", label: "Staff Overview" },
      { id: "individual", label: "Individual Teacher" },
    ],
  };

  return (
    <div className="slide-in">
      <SectionHeader
        title="Attendance Management"
        sub="Mark, track and analyze attendance — students and staff"
        action={
          <div
            style={{
              display: "flex",
              background: C.surfaceAlt,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              overflow: "hidden",
            }}
          >
            {[
              { id: "students", label: "Students", icon: "students" },
              { id: "teachers", label: "Teachers", icon: "teachers" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 16px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  background: mode === m.id ? C.primary : "transparent",
                  color: mode === m.id ? "white" : C.textMuted,
                  transition: "all 0.2s",
                }}
              >
                <Icon name={m.icon} size={14} /> {m.label}
              </button>
            ))}
          </div>
        }
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, background: C.surfaceAlt, padding: 4, borderRadius: 12, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          {TABS[mode].map((t) => (
            <button
              key={t.id}
              className="btn"
              onClick={() => setTab(t.id)}
              style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderRadius: 9, background: tab === t.id ? C.surface : "transparent", color: tab === t.id ? C.primary : C.textMuted, boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <button
            className="btn btn-primary"
            onClick={() => setTab("mark")}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="attendance" size={14} /> Mark Attendance
          </button>
        )}
        {tab === "mark" && (
          <button
            className="btn btn-ghost"
            onClick={() => setTab("overview")}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Icon
              name="arrow_right"
              size={14}
              style={{ transform: "rotate(180deg)" }}
            />
            Back to Overview
          </button>
        )}
      </div>

      {mode === "students" ? (
        <>
          {tab === "overview" && <StudentSchoolOverviewTab />}
          {tab === "class" && <StudentClassAnalysisTab />}
          {tab === "individual" && <StudentIndividualTab />}
          {tab === "mark" && <StudentMarkTab />}
        </>
      ) : (
        <>
          {tab === "overview" && <StaffAnalysisTab />}
          {tab === "individual" && <StaffIndividualTab />}
          {tab === "mark" && <StaffMarkTab />}
        </>
      )}
    </div>
  );
};
