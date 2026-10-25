// FILE: teacher-app/src/modules/attendance/useGradesAndSections.ts
// Source: admin App.tsx -> useGradesAndSections [12308-12331]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useSession } from "../../contexts/SessionContext";

// ═══════════════════════════════════════════════════════════════
// SHARED: Grade/Section selector (students side)
// ═══════════════════════════════════════════════════════════════
export const useGradesAndSections = () => {
  const { currentYear } = useSession();
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false; // purane session ka late response ignore karo
    setLoading(true);
    (async () => {
      try {
        const [gRes, sRes] = await Promise.all([
          apiRequest("/setup/grades"),
          apiRequest(`/setup/sections${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ""}`),
        ]);
        if (cancelled) return;
        setGrades(Array.isArray(gRes?.data) ? gRes.data : []);
        setSections(Array.isArray(sRes?.data) ? sRes.data : []);
      } catch (e) {
        console.error("Failed to load grades/sections", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentYear?.id]); // eslint-disable-line

  return { grades, sections, loading };
};
