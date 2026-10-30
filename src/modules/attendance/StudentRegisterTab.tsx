// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import { useDialog } from "../../contexts/DialogContext";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { RegisterGrid } from "./RegisterGrid";
import { useGradesAndSections } from "./useGradesAndSections";
import { todayISO } from "../../utils/date";

// Students: monthly attendance register of one class (reuses GET /attendance/students/analysis?month=)
export const StudentRegisterTab = () => {
  const { grades, sections, loading: secLoading } = useGradesAndSections();
  const maxMonth = todayISO().slice(0, 7);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [month, setMonth] = useState(maxMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const { dialogAlert } = useDialog();
  const [pdfBusy, setPdfBusy] = useState(false);
  const openPdf = async () => {
    setPdfBusy(true);
    try { await openGeneratedPdf(`/attendance/students/analysis?section_id=${sectionId}&month=${month}&format=pdf`, { name: `Attendance Register ${month}.pdf`, title: "Attendance Register" }); }
    catch (e) { await dialogAlert(e.message || "Could not generate the PDF", "PDF failed"); }
    finally { setPdfBusy(false); }
  };
  const filteredSections = sections.filter((s) => s.grade_id === gradeId);

  useEffect(() => { if (grades.length && !gradeId) setGradeId(grades[0].id); }, [grades]); // eslint-disable-line
  useEffect(() => { if (gradeId && filteredSections.length && !filteredSections.some((s) => s.id === sectionId)) setSectionId(filteredSections[0].id); }, [gradeId, sections]); // eslint-disable-line

  useEffect(() => {
    if (!sectionId) { setData(null); return; }
    const my = ++seq.current;
    setLoading(true);
    (async () => {
      try {
        const res = await apiRequest(`/attendance/students/analysis?section_id=${sectionId}&month=${month}`);
        if (my === seq.current) setData(res?.data?.register || null);
      } catch (e) { if (my === seq.current) setData(null); console.error(e); }
      finally { if (my === seq.current) setLoading(false); }
    })();
  }, [sectionId, month]);

  const filters = (
    <>
      <select className="select" style={{ width: 150 }} value={gradeId} onChange={(e) => { setGradeId(e.target.value); setSectionId(""); }}>
        {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <select className="select" style={{ width: 120 }} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
        {filteredSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </>
  );
  return <RegisterGrid who="Student" data={data} loading={loading || secLoading} filters={filters} month={month} setMonth={setMonth} maxMonth={maxMonth} onPdf={openPdf} pdfBusy={pdfBusy} />;
};
