// FILE: teacher-app/src/modules/timetable/TimetableModule.tsx
// Source: admin App.tsx -> TimetableModule [10599-10669]
// @ts-nocheck
import { useEffect, useState } from "react";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useSession } from "../../contexts/SessionContext";
import { BuildTimetableTab } from "./BuildTimetableTab";
import { TeacherWeeklyViewTab } from "./TeacherWeeklyViewTab";
import { C } from "../../theme/theme";

export const TimetableModule = () => {
  const [tab, setTab] = useState("build"); // 'build' | 'teacherview'
  const { currentYear } = useSession(); // 🔴 topbar ka global session hi use hota hai
  const academicYearId = currentYear?.id || "";

  return (
    <div className="slide-in">
      <SectionHeader
        title="Timetable Management"
        sub="Build weekly schedules, assign teachers, and prevent double-booking automatically"
        action={currentYear && <span className="badge">{currentYear.name}</span>}
      />

      <div
        style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
      >
      {[
          { id: "build", label: "Class-wise Timetable" },
          { id: "teacherview", label: "Teacher-wise View" },
        ].map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!academicYearId ? (
        <div
          className="card"
          style={{ padding: 40, textAlign: "center", color: C.textMuted }}
        >
          No academic year found. Please create one in Setup first.
        </div>
      ) : (
        <>

        {tab === "build" && (
            <BuildTimetableTab academicYearId={academicYearId} />
          )}
          {tab === "teacherview" && (
            <TeacherWeeklyViewTab academicYearId={academicYearId} />
          )}
        </>
      )}
    </div>
  );
};
