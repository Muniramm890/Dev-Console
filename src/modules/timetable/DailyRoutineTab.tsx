// @ts-nocheck
// Timetable -> Daily Routine: bell schedule (periods, assembly, breaks). It drives the Class-wise Timetable grid.
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { DailyRoutineBuilder } from "./DailyRoutineBuilder";
import { C } from "../../theme/theme";

export const DailyRoutineTab = () => {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest("/timetable/periods", "GET");
      setPeriods(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 24, color: C.textMuted, fontSize: 13 }}>Loading...</div>;
  return (
    <div style={{ maxWidth: 760 }}>
      <DailyRoutineBuilder periods={periods} onSaved={load} />
    </div>
  );
};
