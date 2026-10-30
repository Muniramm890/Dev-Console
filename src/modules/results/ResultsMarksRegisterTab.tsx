// @ts-nocheck
import { useEffect, useState } from "react";
import { TableRegister, useRegisterData, useRegisterPdf } from "../../components/ui/TableRegister";
import { useGradesAndSections } from "../attendance/useGradesAndSections";

// Marks Register: every student's subject-wise marks for the selected exam + class statistics (GET /results/section-results?view=register)
export const ResultsMarksRegisterTab = ({ examGroupId }) => {
  const { grades, sections, loading: secLoading } = useGradesAndSections();
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const filteredSections = sections.filter((s) => s.grade_id === gradeId);
  useEffect(() => { if (grades.length && !gradeId) setGradeId(grades[0].id); }, [grades]); // eslint-disable-line
  useEffect(() => { if (gradeId && filteredSections.length && !filteredSections.some((s) => s.id === sectionId)) setSectionId(filteredSections[0].id); }, [gradeId, sections]); // eslint-disable-line

  const base = examGroupId && sectionId ? `/results/section-results?exam_group_id=${examGroupId}&section_id=${sectionId}` : "";
  const { table, loading, error } = useRegisterData(base ? `${base}&view=register` : "");
  const pdf = useRegisterPdf();

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
  return (
    <TableRegister
      table={table} loading={loading || secLoading} error={error} filters={filters}
      onPdf={() => pdf.open(`${base}&view=register&format=pdf`, "Marks Register.pdf", "Marks Register")} pdfBusy={pdf.busy}
      emptyTitle="No results for this class yet" emptySub="Compute results for this class from Exam Management, then they appear here."
    />
  );
};
