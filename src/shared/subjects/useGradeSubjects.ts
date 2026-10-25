// FILE: teacher-app/src/shared/subjects/useGradeSubjects.ts
// Source: admin App.tsx -> useGradeSubjects [1389-1415]
// @ts-nocheck
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

export const useGradeSubjects = (gradeId) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = React.useCallback(async () => {
    if (!gradeId) {
      setSubjects([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest(`/setup/grade-subjects?grade_id=${gradeId}`);
      setSubjects(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to load grade subjects", e);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [gradeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { subjects, loading, reload };
};
