// FILE: teacher-app/src/contexts/DataContext.tsx
// Source: admin App.tsx -> DataContext [23735-23735], useData [23738-23738], DataProvider [25657-25699]
// @ts-nocheck
import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "./AuthContext";

  export const DataContext = createContext(); // 🔴 SMART GLOBAL DATA CONTEXT

  export const useData = () => useContext(DataContext);

// Gatekeeper Component: Check karta hai user logged in hai ya nahi
// 🔴 DATA PROVIDER: Fetch once from Azure, use everywhere
export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  // [teacher-app] was: students: STUDENTS, teachers: TEACHERS (mock fallback). Ab kabhi dummy data nahi:
  // API fail/empty ho to khali list + error message aayega, UI empty/error state dikhayega.
  const [appData, setAppData] = useState({
    students: [],
    teachers: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) return;

    const fetchAllData = async () => {
      try {
        
        const [studentsRes, teachersRes] = await Promise.all([
          apiRequest("/students?limit=2000"),
          apiRequest("/teachers"),
        ]);

        const realStudents = studentsRes?.data || [];
        const realTeachers = teachersRes?.data || [];

        setAppData({
          students: realStudents,
          teachers: realTeachers,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("Failed to load students/teachers:", err.message);
        setAppData({
          students: [],
          teachers: [],
          loading: false,
          error: err.message || "Failed to load data",
        });
      }
    };

    fetchAllData();
  }, [user]);

  return (
    <DataContext.Provider value={appData}>{children}</DataContext.Provider>
  );
};
