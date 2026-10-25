// FILE: teacher-app/src/contexts/SessionContext.tsx
// Source: admin App.tsx -> SessionContext [23736-23736], useSession [23739-23739], SessionProvider [25610-25653]
// @ts-nocheck
import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "./AuthContext";

  export const SessionContext = createContext();

  export const useSession = () => useContext(SessionContext);

// 🔴 SESSION PROVIDER: Ek hi jagah academic-years fetch, poori app me current session share
export const SessionProvider = ({ children }) => {
  const { user } = useAuth();
  const [academicYears, setAcademicYears] = useState([]);
  const SESSION_KEY = "erp_academic_year_id";
  const [academicYearId, setAcademicYearIdState] = useState(() => {
    try { return localStorage.getItem(SESSION_KEY) || ""; } catch { return ""; }
  });
  // selection ko localStorage me save karo taaki refresh par wapas current year na aaye
  const setAcademicYearId = (val) => {
    setAcademicYearIdState(val);
    try { if (val) localStorage.setItem(SESSION_KEY, val); else localStorage.removeItem(SESSION_KEY); } catch {}
  };
  const [sessionLoading, setSessionLoading] = useState(true);

  const loadAcademicYears = async () => {
    try {
      const res = await apiRequest("/setup/academic-years");
      const years = res?.data || [];
      setAcademicYears(years);
      setAcademicYearIdState((prev) => {
        if (prev && years.some((y) => y.id === prev)) return prev; // user ka manual selection preserve karo
        const current = years.find((y) => y.is_current) || years[0];
        const next = current?.id || "";
        try { if (next) localStorage.setItem(SESSION_KEY, next); } catch {}
        return next;
      });
    } catch (e) {
      console.error("Failed to load academic years:", e.message);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadAcademicYears();
  }, [user]);

  const currentYear = academicYears.find((y) => y.id === academicYearId) || null;

  return (
    <SessionContext.Provider
      value={{
        academicYears,
        academicYearId,
        setAcademicYearId,
        currentYear,
        sessionLoading,
        reloadAcademicYears: loadAcademicYears,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};
